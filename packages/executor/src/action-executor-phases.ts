/**
 * Phases of action execution broken down into focused functions.
 * 
 * This module addresses the "Function Too Large" issue by decomposing
 * the 400+ line executeActionRun into distinct phases that can be
 * tested, understood, and maintained independently.
 * 
 * Design principles:
 * 1. Each phase has a single responsibility
 * 2. Phases return explicit results/errors
 * 3. State is passed explicitly between phases
 * 4. Error handling is consistent across phases
 * 
 * The phases mirror the original steps but are now:
 * - Independently testable
 * - Easier to modify without side effects
 * - Self-documenting through function names
 * - Reusable in other contexts
 */

import type {
  PlannedAction,
  ActionDefinition,
  ActionExecutionState,
  ErrorDetail,
  ResolvedInputs,
  ApiCatalogEntry,
  JsonValue,
  ActionOutput,
  StorageLocation,
} from './schemas';
import { ResolvedInputsSchema, JsonValueSchema, ActionOutputSchema } from './schemas';
import { resolveReferences } from './references';
import { validateAgainstSchema } from './validation';
import { HttpClient } from './http';
import { applyAuthentication } from './auth';
import { categorizeApiError } from './catalog-integration';
import { convertToBinary, createBinaryOutput } from './binary-handler';
import type { ApiCatalog, StorageProvider } from './interfaces';
import type { AxiosResponse } from 'axios';

/**
 * Context passed between execution phases.
 * This accumulates data and state as we progress through phases.
 */
export interface ExecutionContext {
  executionId: string;
  action: PlannedAction;
  actionDef: ActionDefinition;
  credentials: Record<string, string>;
  previousResults: Record<string, string>;
  startTime: number;
  state: ActionExecutionState;
  resolvedInputs?: ResolvedInputs;
  apiCatalogEntry?: ApiCatalogEntry;
  httpClient?: HttpClient;
}

/**
 * Phase result type for consistent error handling.
 */
export type PhaseResult<T> = 
  | { success: true; data: T }
  | { success: false; error: ErrorDetail };

/**
 * Logger interface for phases.
 */
export interface PhaseLogger {
  info(message: string, metadata?: Record<string, unknown>): Promise<void>;
  error(message: string, metadata?: Record<string, unknown>): Promise<void>;
}

/**
 * Phase 1: Validate action definition exists.
 * 
 * @param context Execution context
 * @param actionDefinitions Map of available definitions
 * @returns Updated context with action definition
 */
export function validateActionDefinition(
  context: ExecutionContext,
  actionDefinitions: Map<string, ActionDefinition>
): PhaseResult<ExecutionContext> {
  const actionDef = actionDefinitions.get(context.action.actionDefinitionId);
  
  if (!actionDef) {
    return {
      success: false,
      error: {
        category: 'validation_failed',
        message: `Action definition not found: ${context.action.actionDefinitionId}`,
        retryable: false,
        context: {
          actionId: context.action.id,
          actionDefinitionId: context.action.actionDefinitionId,
        },
        suggestion: 'Verify the action definition ID is correct and registered',
      },
    };
  }
  
  return {
    success: true,
    data: { ...context, actionDef },
  };
}

/**
 * Phase 2: Resolve input references from previous action results.
 * 
 * @param context Execution context
 * @returns Updated context with resolved inputs
 */
export async function resolveActionInputs(
  context: ExecutionContext
): Promise<PhaseResult<ExecutionContext>> {
  try {
    const resolved = await resolveReferences(
      context.action.inputs,
      context.previousResults,
      context.action.dependencies,
    );
    
    // Validate resolved inputs match schema
    const parsed = ResolvedInputsSchema.safeParse(resolved);
    if (!parsed.success) {
      return {
        success: false,
        error: {
          category: 'validation_failed',
          message: `Invalid resolved inputs: ${parsed.error.message}`,
          retryable: false,
          context: {
            actionId: context.action.id,
            zodError: parsed.error.format(),
          },
          suggestion: 'Check that referenced action outputs match expected types',
        },
      };
    }
    
    return {
      success: true,
      data: { ...context, resolvedInputs: parsed.data },
    };
  } catch (error) {
    return {
      success: false,
      error: {
        category: 'state_inconsistent',
        message: `Failed to resolve input references: ${error instanceof Error ? error.message : 'Unknown error'}`,
        retryable: false,
        context: {
          actionId: context.action.id,
          dependencies: context.action.dependencies,
        },
        suggestion: 'Verify all referenced actions have completed successfully',
      },
    };
  }
}

/**
 * Phase 3: Validate resolved inputs against action schema.
 * 
 * @param context Execution context  
 * @returns Validation result
 */
export async function validateActionInputs(
  context: ExecutionContext
): Promise<PhaseResult<void>> {
  if (!context.actionDef.inputSchema || !context.resolvedInputs) {
    return { success: true, data: undefined };
  }
  
  const validation = await validateAgainstSchema(
    context.resolvedInputs,
    context.actionDef.inputSchema
  );
  
  if (!validation.valid) {
    return {
      success: false,
      error: {
        category: 'validation_failed',
        message: `Input validation failed: ${validation.errors.join(', ')}`,
        retryable: false,
        context: {
          actionId: context.action.id,
          validationErrors: validation.errors,
        },
        suggestion: 'Review input data against the action\'s schema requirements',
      },
    };
  }
  
  return { success: true, data: undefined };
}

/**
 * Phase 4: Prepare HTTP request configuration.
 * 
 * @param context Execution context
 * @param apiCatalog API catalog for quirks
 * @returns Updated context with HTTP client
 */
export async function prepareHttpRequest(
  context: ExecutionContext,
  apiCatalog: ApiCatalog
): Promise<PhaseResult<ExecutionContext>> {
  if (!context.resolvedInputs) {
    return {
      success: false,
      error: {
        category: 'state_inconsistent',
        message: 'Resolved inputs missing',
        retryable: false,
        context: { actionId: context.action.id },
        suggestion: 'Internal error - inputs should be resolved before HTTP preparation',
      },
    };
  }
  
  // Get API catalog entry
  const apiCatalogEntry = await apiCatalog.getApiEntry(
    new URL(context.actionDef.endpoint.url).hostname
  );
  
  // Build URL with parameter substitution
  const url = buildUrl(context.actionDef.endpoint.url, context.resolvedInputs);
  const headers = { ...context.actionDef.endpoint.headers };
  
  // Apply authentication
  if (context.actionDef.authentication) {
    try {
      await applyAuthentication(headers, context.actionDef.authentication, context.credentials);
    } catch (error) {
      return {
        success: false,
        error: {
          category: 'auth_invalid',
          message: error instanceof Error ? error.message : 'Authentication failed',
          retryable: false,
          context: {
            actionId: context.action.id,
            authType: context.actionDef.authentication.type,
          },
          suggestion: 'Verify authentication credentials are correct and not expired',
        },
      };
    }
  }
  
  // Apply API catalog quirks
  if (apiCatalogEntry?.quirks.requiresUserAgent) {
    headers['User-Agent'] = apiCatalogEntry.quirks.requiresUserAgent;
  }
  
  // Create HTTP client
  const httpClient = new HttpClient(
    {
      timeout: context.actionDef.endpoint.timeout,
      maxResponseSize: apiCatalogEntry?.quirks.maxResponseSize,
      userAgent: headers['User-Agent'],
    },
    apiCatalogEntry || undefined,
  );
  
  return {
    success: true,
    data: {
      ...context,
      apiCatalogEntry,
      httpClient,
    },
  };
}

/**
 * Phase 5: Execute HTTP request with retries.
 * 
 * @param context Execution context
 * @param logger Phase logger
 * @returns HTTP response or error
 */
export async function executeHttpRequest(
  context: ExecutionContext,
  logger: PhaseLogger
): Promise<PhaseResult<AxiosResponse>> {
  if (!context.httpClient || !context.resolvedInputs) {
    return {
      success: false,
      error: {
        category: 'state_inconsistent',
        message: 'HTTP client not initialized',
        retryable: false,
        context: { actionId: context.action.id },
        suggestion: 'Internal error - HTTP client should be prepared before execution',
      },
    };
  }
  
  // Build request configuration
  const url = buildUrl(context.actionDef.endpoint.url, context.resolvedInputs);
  const headers = { ...context.actionDef.endpoint.headers };
  
  // Apply authentication if needed
  if (context.actionDef.authentication) {
    await applyAuthentication(headers, context.actionDef.authentication, context.credentials);
  }
  
  // Prepare request body for POST/PUT/PATCH
  let requestBody: any;
  if (['POST', 'PUT', 'PATCH'].includes(context.actionDef.endpoint.method)) {
    requestBody = context.resolvedInputs;
  }
  
  // Execute with retry
  const result = await context.httpClient.executeWithRetry(
    {
      method: context.actionDef.endpoint.method,
      url,
      headers,
      data: requestBody,
    },
    context.actionDef.retryPolicy,
  );
  
  // Update execution state with trace
  context.state.httpTrace = result.trace;
  context.state.attempts = result.trace.length;
  
  if (result.error) {
    // Apply API catalog error mappings if available
    const mappedError = context.apiCatalogEntry
      ? await categorizeApiError(result.error, context.apiCatalogEntry)
      : result.error;
    
    await logger.error('Action execution failed', {
      actionId: context.action.id,
      error: mappedError,
      attempts: context.state.attempts,
    });
    
    return {
      success: false,
      error: mappedError,
    };
  }
  
  if (!result.response) {
    return {
      success: false,
      error: {
        category: 'api_unexpected_status',
        message: 'No response received',
        retryable: true,
        context: { actionId: context.action.id },
        suggestion: 'Network issue or timeout - verify API endpoint is accessible',
      },
    };
  }
  
  return {
    success: true,
    data: result.response,
  };
}

/**
 * Phase 6: Process HTTP response into structured output.
 * 
 * @param context Execution context
 * @param response HTTP response
 * @param logger Phase logger
 * @returns Processed output data
 */
export async function processHttpResponse(
  context: ExecutionContext,
  response: AxiosResponse,
  logger: PhaseLogger
): Promise<PhaseResult<JsonValue>> {
  const contentType = response.headers['content-type']?.toLowerCase() || '';
  let outputData: JsonValue;
  
  try {
    if (
      contentType.includes('application/json') ||
      (context.apiCatalogEntry?.quirks.nonStandardJsonContentType &&
        contentType.includes(context.apiCatalogEntry.quirks.nonStandardJsonContentType))
    ) {
      // JSON response
      let jsonData: unknown;
      try {
        jsonData = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
      } catch (parseError) {
        // JSON parse error - return specific error category
        return {
          success: false,
          error: {
            category: 'api_response_malformed',
            message: `Invalid JSON in response: ${parseError instanceof Error ? parseError.message : 'Parse error'}`,
            retryable: false,
            context: {
              actionId: context.action.id,
              contentType,
              responseSnippet: typeof response.data === 'string' ? response.data.slice(0, 100) : undefined,
            },
            suggestion: 'API returned malformed JSON - check API response format',
          },
        };
      }
      
      const parsed = JsonValueSchema.safeParse(jsonData);
      if (!parsed.success) {
        return {
          success: false,
          error: {
            category: 'validation_failed',
            message: `Invalid JSON response: ${parsed.error.message}`,
            retryable: false,
            context: {
              actionId: context.action.id,
              contentType,
            },
            suggestion: 'API returned malformed JSON - check API documentation',
          },
        };
      }
      outputData = parsed.data;
    } else if (contentType.includes('text/')) {
      // Text response
      outputData = { text: String(response.data) };
    } else {
      // Binary response
      try {
        const binaryResult = convertToBinary(response.data);
        
        if (binaryResult.error) {
          await logger.error('Binary response conversion warning', {
            actionId: context.action.id,
            contentType,
            error: binaryResult.error,
          });
        }
        
        outputData = createBinaryOutput(binaryResult.buffer, contentType);
      } catch (error) {
        return {
          success: false,
          error: {
            category: 'state_inconsistent',
            message: error instanceof Error ? error.message : 'Binary conversion failed',
            retryable: false,
            context: {
              actionId: context.action.id,
              contentType,
            },
            suggestion: 'Response data could not be processed - check content type',
          },
        };
      }
    }
    
    return {
      success: true,
      data: outputData,
    };
  } catch (error) {
    return {
      success: false,
      error: {
        category: 'state_inconsistent',
        message: `Response processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        retryable: false,
        context: {
          actionId: context.action.id,
          contentType,
        },
        suggestion: 'Unexpected response format - verify API documentation',
      },
    };
  }
}

/**
 * Phase 7: Validate output against schema.
 * 
 * @param context Execution context
 * @param outputData Output data to validate
 * @returns Validation result
 */
export async function validateActionOutput(
  context: ExecutionContext,
  outputData: JsonValue
): Promise<PhaseResult<void>> {
  if (!context.actionDef.outputSchema) {
    return { success: true, data: undefined };
  }
  
  const validation = await validateAgainstSchema(outputData, context.actionDef.outputSchema);
  
  if (!validation.valid) {
    return {
      success: false,
      error: {
        category: 'validation_failed',
        message: `Output validation failed: ${validation.errors.join(', ')}`,
        retryable: false,
        context: {
          actionId: context.action.id,
          validationErrors: validation.errors,
        },
        suggestion: 'API response does not match expected schema - check for API changes',
      },
    };
  }
  
  return { success: true, data: undefined };
}

/**
 * Phase 8: Store output data.
 * 
 * @param context Execution context
 * @param outputData Output data to store
 * @param storageProvider Storage provider
 * @returns Storage location
 */
export async function storeActionOutput(
  context: ExecutionContext,
  outputData: JsonValue,
  storageProvider: StorageProvider
): Promise<PhaseResult<StorageLocation>> {
  const outputBuffer = Buffer.from(JSON.stringify(outputData));
  const outputId = `${context.executionId}-${context.action.id}-output`;
  
  try {
    const storageResult = await storageProvider.save(
      'action-outputs',
      outputId,
      outputBuffer,
    );
    
    const location: StorageLocation = {
      provider: 'local',
      path: storageResult.path,
      size: storageResult.size,
      checksum: storageResult.checksum,
      contentType: 'application/json',
      metadata: {
        actionId: context.action.id,
        executionId: context.executionId,
        timestamp: new Date().toISOString(),
      },
    };
    
    return {
      success: true,
      data: location,
    };
  } catch (error) {
    /**
     * Enhanced storage error handling based on error characteristics.
     * This addresses CAR-012 by categorizing storage failures appropriately.
     */
    const isNetworkError = 
      error.code === 'ECONNREFUSED' ||
      error.code === 'ETIMEDOUT' ||
      error.code === 'ENOTFOUND' ||
      error.code === 'ECONNRESET';
    
    const isRateLimited = 
      error.statusCode === 429 ||
      error.message?.toLowerCase().includes('rate limit') ||
      error.message?.toLowerCase().includes('too many requests');
    
    const isQuotaExceeded = 
      error.message?.toLowerCase().includes('quota') ||
      error.message?.toLowerCase().includes('space') ||
      error.code === 'ENOSPC';
    
    const isPermissionDenied = 
      error.statusCode === 403 ||
      error.code === 'EACCES' ||
      error.code === 'EPERM' ||
      error.message?.toLowerCase().includes('permission') ||
      error.message?.toLowerCase().includes('forbidden');
    
    const isServiceUnavailable = 
      error.statusCode === 503 ||
      error.statusCode === 504 ||
      error.message?.toLowerCase().includes('unavailable') ||
      error.message?.toLowerCase().includes('temporarily');
    
    // Determine error category and retry strategy
    let category: ErrorCategory = 'state_inconsistent';
    let retryable = true;
    let suggestion = 'Storage system error - verify storage is available';
    
    if (isNetworkError) {
      category = 'network_error';
      suggestion = 'Network connectivity issue - check storage service connection';
    } else if (isRateLimited) {
      category = 'rate_limited';
      suggestion = 'Storage service rate limit - implement backoff and retry';
    } else if (isQuotaExceeded) {
      category = 'state_inconsistent';
      retryable = false; // Quota won't be fixed by retry
      suggestion = 'Storage quota exceeded - free up space or increase quota';
    } else if (isPermissionDenied) {
      category = 'unauthorized';
      retryable = false; // Permission won't be fixed by retry
      suggestion = 'Storage permission denied - check credentials and access rights';
    } else if (isServiceUnavailable) {
      category = 'api_unavailable';
      suggestion = 'Storage service temporarily unavailable - retry later';
    }
    
    return {
      success: false,
      error: {
        category,
        message: `Failed to store output: ${error instanceof Error ? error.message : 'Unknown error'}`,
        retryable,
        context: {
          actionId: context.action.id,
          outputSize: outputBuffer.length,
          storageError: {
            code: error.code,
            statusCode: error.statusCode,
            type: error.constructor?.name,
          },
        },
        suggestion,
      },
    };
  }
}

/**
 * Helper to build URL with parameter substitution.
 */
function buildUrl(urlTemplate: string, params: ResolvedInputs): string {
  let url = urlTemplate;
  
  // Replace {param} placeholders
  for (const [key, value] of Object.entries(params)) {
    url = url.replace(`{${key}}`, encodeURIComponent(String(value)));
  }
  
  return url;
}