/**
 * Integration point for Module 4 (Workflow State)
 *
 * This provides the direct function call interface that Module 4 expects
 * to execute HTTP actions.
 */

import type {
  ActionDefinition,
  ErrorDetail,
  PlannedAction,
} from '@rainmaker/schema/types/execution';
import type { ActionExecutor, HttpTraceEntry } from '@rainmaker/workflow-state/executor-interface';
import { createBunExecutor } from './bun-executor';

// Singleton executor instance - can be configured for testing
let executor: ActionExecutor;

// Initialize the executor (called automatically or can be called manually for testing)
export function initializeExecutor(customExecutor?: ActionExecutor): void {
  executor =
    customExecutor ||
    createBunExecutor({
      storagePath: process.env['EXECUTOR_STORAGE_PATH'] || '/tmp/action-storage',
      maxFileSize: 50 * 1024 * 1024, // 50MB
      defaultTimeout: 30000, // 30s
    });
}

// Auto-initialize with defaults if not already done
// This ensures the executor is ready to use immediately without requiring explicit initialization
// Module 4 can call executeHttpAction directly without setup
initializeExecutor();

// Cache for action definitions
// In real implementation, this would load from a database or API
const actionDefinitionCache = new Map<string, ActionDefinition>();

/**
 * Load an action definition by ID
 * In real implementation, this would query the action catalog
 */
export async function loadActionDefinition(actionDefinitionId: string): Promise<ActionDefinition> {
  // Check cache first
  const cached = actionDefinitionCache.get(actionDefinitionId);
  if (cached) return cached;

  // In real implementation:
  // const definition = await db.actionDefinitions.findUnique({
  //   where: { id: actionDefinitionId }
  // });

  // For now, throw error for unknown actions
  throw new Error(`Action definition not found: ${actionDefinitionId}`);
}

/**
 * Register an action definition (for testing)
 */
export function registerActionDefinition(definition: ActionDefinition): void {
  actionDefinitionCache.set(definition.id, definition);
}

/**
 * Main integration function that Module 4 will call
 *
 * @param params - Execution parameters
 * @param params.executor - Optional executor instance (defaults to singleton)
 * @returns Action execution result in Module 4's expected format
 */
export async function executeHttpAction({
  actionDefinitionId,
  inputs,
  context,
  executor: customExecutor,
}: {
  actionDefinitionId: string;
  inputs: Record<string, unknown>;
  context: {
    executionId: string;
    planId: string;
    actionId: string;
  };
  executor?: ActionExecutor;
}) {
  // Load action definition
  const definition = await loadActionDefinition(actionDefinitionId);

  // Create a planned action structure for the executor
  // Convert unknown inputs to the expected type
  const typedInputs: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(inputs)) {
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      typedInputs[key] = value;
    } else {
      typedInputs[key] = String(value);
    }
  }

  const plannedAction: PlannedAction = {
    id: context.actionId,
    actionDefinitionId,
    inputs: typedInputs,
    dependencies: [],
    errorHandling: {
      continueOnFailure: false,
    },
  };

  // Execute using provided executor or singleton
  const executorInstance = customExecutor || executor;
  const result = await executorInstance.execute(plannedAction, definition, inputs, {
    executionId: context.executionId,
    planId: context.planId,
    actionId: context.actionId,
  });

  // Transform result to Module 4's expected format
  if (result.status === 'success') {
    return {
      status: 'completed' as const,
      data: result.output,
      storageLocation: result.storageLocation,
    };
  }
  // For failures, Module 4 expects an error to be thrown
  // so it can handle retries via trigger.dev
  // Preserve the structured error details for Module 4's error handling
  const error = new Error(result.error?.message || 'Action execution failed');
  // Attach the full error detail for Module 4 to access
  interface ExtendedError extends Error {
    detail?: ErrorDetail;
    retryable?: boolean;
    httpTrace?: HttpTraceEntry[];
  }
  const extendedError = error as ExtendedError;
  if (result.error) {
    extendedError.detail = result.error;
  }
  if (result.retryable !== undefined) {
    extendedError.retryable = result.retryable;
  }
  if (result.httpTrace) {
    extendedError.httpTrace = result.httpTrace;
  }
  throw extendedError;
}

/**
 * Get the executor instance (for advanced use cases)
 */
export function getExecutor() {
  return executor;
}
