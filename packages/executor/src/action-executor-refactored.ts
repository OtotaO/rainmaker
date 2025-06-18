/**
 * Refactored action executor using phase-based architecture.
 * 
 * This addresses CAR-011 by breaking down the 400+ line executeActionRun
 * into a clean orchestration of focused phases. Each phase:
 * - Has a single responsibility
 * - Can be tested independently
 * - Handles errors consistently
 * - Is easier to understand and modify
 * 
 * The refactored design makes the execution flow explicit and allows
 * for better error handling, logging, and maintainability.
 */

import type { ExecuteActionPayload } from './action-executor-jobs';
import type { ActionExecutionState, ErrorDetail } from './schemas';
import type { StorageProvider, ApiCatalog } from './interfaces';
import { 
  checkDuplication, 
  markExecutionStarted, 
  markExecutionCompleted, 
  markExecutionFailed,
  waitForPendingExecution 
} from './deduplication';
import {
  ExecutionContext,
  PhaseLogger,
  validateActionDefinition,
  resolveActionInputs,
  validateActionInputs,
  prepareHttpRequest,
  executeHttpRequest,
  processHttpResponse,
  validateActionOutput,
  storeActionOutput,
} from './action-executor-phases';
import { ActionOutputSchema } from './schemas';

/**
 * Job IO interface for logging and events.
 */
interface JobIO {
  logger: {
    info: (message: string, metadata?: Record<string, unknown>) => Promise<void>;
    error: (message: string, metadata?: Record<string, unknown>) => Promise<void>;
  };
  sendEvent: (
    name: string, 
    event: { name: string; payload: Record<string, unknown> }
  ) => Promise<void>;
}

/**
 * Refactored action executor with phase-based architecture.
 * 
 * This function orchestrates the execution phases and handles:
 * - Request deduplication
 * - Phase execution with error handling
 * - State management and updates
 * - Event emission for observability
 * 
 * Each phase is responsible for its own validation and error handling,
 * making the main function focused on orchestration rather than logic.
 */
export async function executeActionRunRefactored(
  payload: ExecuteActionPayload,
  io: JobIO,
  storageProvider: StorageProvider,
  apiCatalog: ApiCatalog,
  actionDefinitions: Map<string, import('./schemas').ActionDefinition>
): Promise<ActionExecutionState> {
  const { executionId, action, context } = payload;
  const startTime = Date.now();
  
  // Step 0: Check for duplicate requests
  const dedupeResult = await handleDeduplication(action, io);
  if (dedupeResult.cached) {
    return dedupeResult.state;
  }
  
  // Initialize execution context
  const executionContext: ExecutionContext = {
    executionId,
    action,
    actionDef: null as any, // Will be set in phase 1
    credentials: context.credentials,
    previousResults: context.previousResults,
    startTime,
    state: {
      actionId: action.id,
      status: 'running',
      startedAt: new Date().toISOString(),
      attempts: 0,
      httpTrace: [],
    },
  };
  
  // Create phase logger
  const phaseLogger: PhaseLogger = {
    info: io.logger.info,
    error: io.logger.error,
  };
  
  try {
    // Phase 1: Validate action definition
    const phase1 = validateActionDefinition(executionContext, actionDefinitions);
    if (!phase1.success) {
      return failExecution(executionContext, phase1.error, io, dedupeResult.key);
    }
    executionContext.actionDef = phase1.data.actionDef;
    
    await io.logger.info('Starting action execution', {
      actionId: action.id,
      actionType: executionContext.actionDef.id,
      dependencies: action.dependencies,
    });
    
    // Phase 2: Resolve input references
    const phase2 = await resolveActionInputs(phase1.data);
    if (!phase2.success) {
      return failExecution(executionContext, phase2.error, io, dedupeResult.key);
    }
    executionContext.resolvedInputs = phase2.data.resolvedInputs;
    
    // Phase 3: Validate inputs
    const phase3 = await validateActionInputs(phase2.data);
    if (!phase3.success) {
      return failExecution(executionContext, phase3.error, io, dedupeResult.key);
    }
    
    // Phase 4: Prepare HTTP request
    const phase4 = await prepareHttpRequest(phase2.data, apiCatalog);
    if (!phase4.success) {
      return failExecution(executionContext, phase4.error, io, dedupeResult.key);
    }
    Object.assign(executionContext, phase4.data);
    
    // Phase 5: Execute HTTP request
    const phase5 = await executeHttpRequest(phase4.data, phaseLogger);
    if (!phase5.success) {
      // Check for partial output in HTTP error
      const partialOutput = extractPartialOutput(phase5.error, phase4.data);
      return failExecution(
        executionContext, 
        phase5.error, 
        io, 
        dedupeResult.key,
        partialOutput
      );
    }
    
    // Phase 6: Process response
    const phase6 = await processHttpResponse(phase4.data, phase5.data, phaseLogger);
    if (!phase6.success) {
      return failExecution(executionContext, phase6.error, io, dedupeResult.key);
    }
    
    // Check for quirky success with error body
    if (executionContext.apiCatalogEntry?.quirks.successWithErrorBody) {
      const quirkyError = checkQuirkySuccess(phase5.data, phase6.data, executionContext);
      if (quirkyError) {
        return failExecution(executionContext, quirkyError, io, dedupeResult.key);
      }
    }
    
    // Phase 7: Validate output
    const phase7 = await validateActionOutput(phase4.data, phase6.data);
    if (!phase7.success) {
      return failExecution(executionContext, phase7.error, io, dedupeResult.key);
    }
    
    // Phase 8: Store output
    const phase8 = await storeActionOutput(phase4.data, phase6.data, storageProvider);
    if (!phase8.success) {
      return failExecution(executionContext, phase8.error, io, dedupeResult.key);
    }
    
    // Success! Update execution state
    const successState = completeExecution(executionContext, phase6.data, phase8.data);
    
    // Mark as completed in deduplication cache
    markExecutionCompleted(dedupeResult.key, successState);
    
    // Emit success event
    await io.sendEvent('action-completed', {
      name: 'action.execute.completed',
      payload: {
        executionId,
        actionId: action.id,
        state: successState,
      },
    });
    
    await io.logger.info('Action execution completed', {
      actionId: action.id,
      outputSize: phase8.data.size,
      duration: Date.now() - startTime,
    });
    
    return successState;
    
  } catch (error) {
    // Handle unexpected errors
    const errorDetail: ErrorDetail = {
      category: 'state_inconsistent',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      retryable: false,
      context: {
        actionId: action.id,
        executionId,
      },
      suggestion: 'Check action configuration and inputs',
    };
    
    return failExecution(executionContext, errorDetail, io, dedupeResult.key);
  }
}

/**
 * Handle request deduplication.
 */
async function handleDeduplication(
  action: import('./schemas').PlannedAction,
  io: JobIO
): Promise<{ cached: boolean; state: ActionExecutionState; key: string } | { cached: false; key: string }> {
  const dedupeResult = checkDuplication(action);
  
  if (dedupeResult.type === 'duplicate_completed') {
    await io.logger.info('Returning cached result for duplicate action', {
      actionId: action.id,
      deduplicationKey: dedupeResult.key,
    });
    return { cached: true, state: dedupeResult.result, key: dedupeResult.key };
  }
  
  if (dedupeResult.type === 'duplicate_pending') {
    await io.logger.info('Duplicate action detected, waiting for pending execution', {
      actionId: action.id,
      deduplicationKey: dedupeResult.key,
      startedAt: dedupeResult.startedAt,
    });
    
    const pendingResult = await waitForPendingExecution(dedupeResult.key);
    if (pendingResult) {
      return { cached: true, state: pendingResult, key: dedupeResult.key };
    }
    
    await io.logger.warn('Could not retrieve pending execution result, proceeding with new execution', {
      actionId: action.id,
      deduplicationKey: dedupeResult.key,
    });
  }
  
  // Mark this execution as started
  markExecutionStarted(dedupeResult.key);
  return { cached: false, key: dedupeResult.key };
}

/**
 * Complete execution with success state.
 */
function completeExecution(
  context: ExecutionContext,
  outputData: import('./schemas').JsonValue,
  storageLocation: import('./schemas').StorageLocation
): ActionExecutionState {
  const outputParsed = ActionOutputSchema.safeParse(outputData);
  if (!outputParsed.success) {
    throw new Error(`Invalid output format: ${outputParsed.error.message}`);
  }
  
  context.state.status = 'completed';
  context.state.completedAt = new Date().toISOString();
  context.state.duration = Date.now() - context.startTime;
  context.state.result = {
    status: 'success',
    output: outputParsed.data,
    outputLocation: storageLocation,
  };
  
  return context.state;
}

/**
 * Fail execution with error state.
 */
async function failExecution(
  context: ExecutionContext,
  error: ErrorDetail,
  io: JobIO,
  dedupeKey: string,
  partialOutput?: any
): Promise<ActionExecutionState> {
  context.state.status = 'failed';
  context.state.completedAt = new Date().toISOString();
  context.state.duration = Date.now() - context.startTime;
  context.state.result = {
    status: 'failure',
    error,
    partialOutput,
  };
  
  // Mark as failed in deduplication cache
  markExecutionFailed(dedupeKey);
  
  // Log error
  await io.logger.error('Action execution failed', {
    actionId: context.action.id,
    error,
    attempts: context.state.attempts,
  });
  
  // Emit failure event
  await io.sendEvent('action-failed', {
    name: 'action.execute.failed',
    payload: {
      executionId: context.executionId,
      actionId: context.action.id,
      state: context.state,
      error,
    },
  });
  
  return context.state;
}

/**
 * Extract partial output from HTTP errors if available.
 */
function extractPartialOutput(
  error: ErrorDetail,
  context: ExecutionContext
): any | undefined {
  // Check if error context has response data
  if (error.context?.responseData) {
    return error.context.responseData;
  }
  
  // Check HTTP trace for partial responses
  const lastTrace = context.state.httpTrace[context.state.httpTrace.length - 1];
  if (lastTrace?.response?.body) {
    try {
      return JSON.parse(lastTrace.response.body);
    } catch {
      return { raw: lastTrace.response.body };
    }
  }
  
  return undefined;
}

/**
 * Check for quirky success responses that are actually errors.
 */
function checkQuirkySuccess(
  response: import('axios').AxiosResponse,
  outputData: import('./schemas').JsonValue,
  context: ExecutionContext
): ErrorDetail | null {
  if (!context.apiCatalogEntry?.quirks.successWithErrorBody || response.status !== 200) {
    return null;
  }
  
  const bodyStr = typeof outputData === 'string' ? outputData : JSON.stringify(outputData);
  
  for (const errorMapping of context.apiCatalogEntry.errorMappings) {
    if (errorMapping.pattern && new RegExp(errorMapping.pattern).test(bodyStr)) {
      return {
        category: errorMapping.category,
        message: 'API returned success status with error content',
        statusCode: 200,
        retryable: errorMapping.retryable,
        context: { 
          responseBodyLength: bodyStr.length,
          matchedPattern: errorMapping.pattern || 'unknown',
        },
        suggestion: 'Check API response body for error details',
      };
    }
  }
  
  return null;
}