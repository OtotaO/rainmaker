import { task, wait } from '@trigger.dev/sdk/v3';
import type {
  ExecutionPlan,
  PlannedAction,
  ExecutionState,
  ActionExecutionState,
} from '@rainmaker/schema';
import { parseReference, resolveReference } from './reference-parser';
import { WorkflowLogger } from './logger';
import { validateExecutionPlan, validatePlanLogic } from './validation';

/**
 * Main workflow task that orchestrates plan execution
 * This task is triggered when a new plan needs to be executed
 */
export const executePlan = task({
  id: 'execute-plan',
  queue: {
    name: 'plan-execution',
    concurrencyLimit: 10,
  },
  retry: {
    maxAttempts: 1, // Don't retry the entire plan
  },
  run: async ({ plan }: { plan: ExecutionPlan }, { ctx }) => {
    // Validate the plan first
    const validatedPlan = validateExecutionPlan(plan);
    validatePlanLogic(validatedPlan);

    // Use trigger.dev's run ID as our execution ID
    const executionId = ctx.run.id;

    // Create logger for this execution
    // Create logger for this execution
    const logger = new WorkflowLogger({
      executionId,
      planId: plan.id,
      planName: plan.name,
    });

    logger.info('Starting plan execution', {
      actionCount: plan.actions.length,
      estimatedDuration: plan.metadata.estimatedDuration,
    });

    // Track execution start
    const startTime = Date.now();
    const startedAt = new Date().toISOString();

    // Group actions by dependency level for parallel execution
    const actionLevels = groupActionsByDependencyLevel(plan.actions);
    const results = new Map<string, ActionExecutionState>();

    // Execute each dependency level
    for (const [levelIndex, level] of actionLevels.entries()) {
      console.log(`Executing dependency level ${levelIndex} with ${level.length} actions`);

      // Execute all actions at this level in parallel
      const levelPromises = level.map(async (action) => {
        try {
          // Check if action should be skipped due to failed dependencies
          if (shouldSkipAction(action, results)) {
            const skippedState: ActionExecutionState = {
              actionId: action.id,
              status: 'skipped',
              startedAt: new Date().toISOString(),
              completedAt: new Date().toISOString(),
              duration: 0,
              attempts: 0,
              httpTrace: [],
              result: {
                status: 'skipped',
                reason: 'Dependency failed',
              },
            };
            return skippedState;
          }

          // Execute the action
          const actionResult = await executeAction.triggerAndWait({
            action,
            previousResults: Object.fromEntries(results),
            planId: plan.id,
            executionId,
          });

          if (actionResult.ok) {
            return actionResult.output;
          } else {
            // Handle failure based on error policy
            if (action.errorHandling.continueOnFailure) {
              const failedState: ActionExecutionState = {
                actionId: action.id,
                status: 'failed',
                startedAt: new Date().toISOString(),
                completedAt: new Date().toISOString(),
                duration: 0,
                attempts: 1,
                httpTrace: [],
                result: {
                  status: 'failure',
                  error: {
                    category: 'state_inconsistent',
                    message:
                      typeof actionResult.error === 'string'
                        ? actionResult.error
                        : actionResult.error instanceof Error
                          ? actionResult.error.message
                          : 'Unknown error',
                    retryable: false,
                    context: {
                      raw: String(actionResult.error),
                      actionId: action.id,
                    },
                  },
                },
              };
              return failedState;
            }
            throw new Error(`Action ${action.id} failed: ${actionResult.error}`);
          }
        } catch (error) {
          if (action.errorHandling.continueOnFailure) {
            const failedState: ActionExecutionState = {
              actionId: action.id,
              status: 'failed',
              startedAt: new Date().toISOString(),
              completedAt: new Date().toISOString(),
              duration: 0,
              attempts: 1,
              httpTrace: [],
              result: {
                status: 'failure',
                error: {
                  category: 'state_inconsistent',
                  message: error instanceof Error ? error.message : 'Unknown error',
                  retryable: false,
                  context: {
                    stack: error instanceof Error && error.stack ? error.stack : '',
                    raw: String(error),
                    actionId: action.id,
                  },
                },
              },
            };
            return failedState;
          }
          throw error;
        }
      });

      // Wait for all actions at this level to complete
      const levelResults = await Promise.all(levelPromises);

      // Store results
      for (let index = 0; index < levelResults.length; index++) {
        const result = levelResults[index];
        const action = level[index];
        if (action && result) {
          results.set(action.id, result);
        }
      }

      // Small delay between levels for observability
      if (levelIndex < actionLevels.length - 1) {
        await wait.for({ seconds: 1 });
      }
    }

    // Calculate final metrics
    const metrics = {
      totalActions: plan.actions.length,
      completedActions: 0,
      failedActions: 0,
      skippedActions: 0,
      totalDuration: Date.now() - startTime,
    };

    for (const result of results.values()) {
      if (result.status === 'completed') metrics.completedActions++;
      else if (result.status === 'failed') metrics.failedActions++;
      else if (result.status === 'skipped') metrics.skippedActions++;
    }

    // Determine overall status
    const status = determineOverallStatus(results);

    // Return complete execution state
    const finalState: ExecutionState = {
      id: executionId,
      planId: plan.id,
      status,
      startedAt,
      completedAt: new Date().toISOString(),
      actionStates: Object.fromEntries(results),
      confirmations: [],
      metrics,
      version: 1, // Trigger.dev handles versioning
    };

    return finalState;
  },
});

/**
 * Individual action executor task
 * Handles the execution of a single action within a plan
 */
export const executeAction = task({
  id: 'execute-action',
  queue: {
    name: 'action-execution',
    concurrencyLimit: 50,
  },
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 30000,
  },
  run: async ({
    action,
    previousResults,
    planId,
    executionId,
  }: {
    action: PlannedAction;
    previousResults: Record<string, ActionExecutionState>;
    planId: string;
    executionId: string;
  }): Promise<ActionExecutionState> => {
    const startTime = Date.now();

    // Evaluate condition if present
    if (action.condition) {
      const conditionMet = evaluateCondition(action.condition, previousResults);
      if (!conditionMet) {
        return {
          actionId: action.id,
          status: 'skipped',
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          duration: 0,
          attempts: 0,
          httpTrace: [],
          result: {
            status: 'skipped',
            reason: 'Condition not met',
          },
        };
      }
    }

    // Handle user confirmation if required
    if (action.userConfirmation?.required) {
      // In a real implementation, this would trigger a user confirmation flow
      // For now, simulate with a wait
      console.log(`User confirmation required for action ${action.id}`);
      await wait.for({ seconds: 5 });
    }

    // Resolve input references from previous results
    const resolvedInputs = resolveActionInputs(action.inputs, previousResults);

    // Create logger for this action
    const logger = new WorkflowLogger({
      executionId,
      planId,
      actionId: action.id,
    });

    // Direct function call to Module 2
    // When Module 2 exists:
    // import { executeHttpAction } from '@rainmaker/action-executor';
    // const result = await executeHttpAction({
    //   actionDefinitionId: action.actionDefinitionId,
    //   inputs: resolvedInputs,
    //   context: { executionId, planId, actionId: action.id }
    // });

    logger.info('Executing action', {
      actionId: action.id,
      actionDefinitionId: action.actionDefinitionId,
      inputKeys: Object.keys(resolvedInputs),
    });

    // For now, simulate execution
    await wait.for({ seconds: 2 });

    const mockResult = {
      status: 'completed' as const,
      data: { success: true, actionId: action.id },
      storageLocation: {
        provider: 'local' as const,
        path: `/storage/${planId}/${action.id}`,
        size: 1024,
        checksum: 'mock-checksum',
        contentType: 'application/json',
        metadata: {},
      },
    };

    return {
      actionId: action.id,
      status: 'completed',
      startedAt: new Date(startTime).toISOString(),
      completedAt: new Date().toISOString(),
      duration: Date.now() - startTime,
      attempts: 1,
      httpTrace: [],
      result: {
        status: 'success',
        output: mockResult.data,
        outputLocation: mockResult.storageLocation,
      },
    };
  },
});

/**
 * Helper function to group actions by dependency level
 * Actions with no dependencies are level 0, actions that depend only on level 0 are level 1, etc.
 */
function groupActionsByDependencyLevel(actions: PlannedAction[]): PlannedAction[][] {
  const levels: PlannedAction[][] = [];
  const processed = new Set<string>();

  while (processed.size < actions.length) {
    const currentLevel = actions.filter((action) => {
      if (processed.has(action.id)) return false;

      // Check if all dependencies have been processed
      return action.dependencies.every((dep) => processed.has(dep));
    });

    if (currentLevel.length === 0) {
      // Circular dependency detected
      const remaining = actions.filter((a) => !processed.has(a.id));
      throw new Error(
        `Circular dependency detected among actions: ${remaining.map((a) => a.id).join(', ')}`,
      );
    }

    levels.push(currentLevel);
    currentLevel.forEach((action) => processed.add(action.id));
  }

  return levels;
}

/**
 * Determine if an action should be skipped due to failed dependencies
 */
function shouldSkipAction(
  action: PlannedAction,
  results: Map<string, ActionExecutionState>,
): boolean {
  if (action.errorHandling.continueOnFailure) {
    return false; // Never skip if we continue on failure
  }

  return action.dependencies.some((depId) => {
    const depResult = results.get(depId);
    return depResult?.status === 'failed';
  });
}

/**
 * Evaluate an action's condition based on previous results
 */
function evaluateCondition(
  condition: PlannedAction['condition'],
  previousResults: Record<string, ActionExecutionState>,
): boolean {
  if (!condition) return true;

  // Parse the reference (e.g., ${actionId.output.field})
  const match = condition.if.match(/\$\{([^.]+)\.output\.(.+)\}/);
  if (!match) {
    console.warn(`Invalid condition reference: ${condition.if}`);
    return false;
  }

  const [, actionId, fieldPath] = match;
  if (!actionId || !fieldPath) {
    return false;
  }
  const actionState = previousResults[actionId];

  if (!actionState || actionState.status !== 'completed') {
    return false;
  }

  if (actionState.result?.status === 'success' && actionState.result.output) {
    const value = getNestedValue(actionState.result.output, fieldPath);
    return Boolean(value);
  }

  return false;
}

/**
 * Resolve action input references to actual values
 */
function resolveActionInputs(
  inputs: PlannedAction['inputs'],
  previousResults: Record<string, ActionExecutionState>,
): PlannedAction['inputs'] {
  const resolved: PlannedAction['inputs'] = {};

  for (const [key, value] of Object.entries(inputs)) {
    const ref = parseReference(value as string);

    if (ref) {
      // Resolve the reference
      const actionState = previousResults[ref.actionId];

      if (actionState?.status === 'completed' && actionState.result?.status === 'success') {
        // Convert ActionExecutionState to the format expected by resolveReference
        const resultsForResolve = {
          [ref.actionId]: {
            result: actionState.result,
          },
        };
        const resolvedValue = resolveReference(ref, resultsForResolve);
        if (
          typeof resolvedValue === 'string' ||
          typeof resolvedValue === 'number' ||
          typeof resolvedValue === 'boolean'
        ) {
          resolved[key] = resolvedValue;
        } else {
          resolved[key] = String(resolvedValue); // Fallback to string representation
        }
      } else {
        // Reference not available, use empty string
        resolved[key] = '';
      }
    } else {
      // Literal value
      resolved[key] = value;
    }
  }

  return resolved;
}

/**
 * Get nested value from object using dot notation path
 * Returns the value at the path or undefined if not found
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((curr, key) => {
    if (curr === null || curr === undefined) return undefined;

    // Handle array notation like items[0]
    const arrayMatch = key.match(/^(.+)\[(\d+)\]$/);
    if (arrayMatch && arrayMatch[1] && arrayMatch[2]) {
      const [, prop, index] = arrayMatch;
      const arr = (curr as Record<string, unknown>)?.[prop];
      return Array.isArray(arr) ? arr[parseInt(index, 10)] : undefined;
    }

    return (curr as Record<string, unknown>)?.[key];
  }, obj);
}

/**
 * Determine the overall execution status based on action results
 */
function determineOverallStatus(
  results: Map<string, ActionExecutionState>,
): ExecutionState['status'] {
  const statuses = Array.from(results.values()).map((r) => r.status);

  if (statuses.some((s) => s === 'running')) {
    return 'running';
  }

  if (statuses.some((s) => s === 'failed')) {
    return 'failed';
  }

  if (statuses.every((s) => s === 'completed' || s === 'skipped')) {
    return 'completed';
  }

  return 'running'; // Default to running if unclear
}
