import type { PlannedAction, ActionExecutionState } from '@rainmaker/schema';

/**
 * Common patterns for workflow state management
 * These helpers make it easier to work with execution state and dependencies
 */

/**
 * Pattern: Parallel execution with fan-out/fan-in
 *
 * Use when you have multiple independent actions that can run in parallel,
 * followed by an action that depends on all of them.
 *
 * Example:
 * - Fetch data from 3 different APIs in parallel
 * - Combine all results into a single report
 */
export function createFanOutFanInPattern(
  parallelActionIds: string[],
  combinerActionId: string,
  actions: PlannedAction[],
): PlannedAction[] {
  // Ensure combiner depends on all parallel actions
  const combinerAction = actions.find((a) => a.id === combinerActionId);
  if (combinerAction) {
    combinerAction.dependencies = [
      ...new Set([...combinerAction.dependencies, ...parallelActionIds]),
    ];
  }

  return actions;
}

/**
 * Pattern: Sequential pipeline
 *
 * Use when actions must execute in a specific order,
 * with each action depending on the previous one.
 *
 * Example:
 * - Validate input → Transform data → Save to database → Send notification
 */
export function createSequentialPipeline(
  actionIds: string[],
  actions: PlannedAction[],
): PlannedAction[] {
  for (let i = 1; i < actionIds.length; i++) {
    const action = actions.find((a) => a.id === actionIds[i]);
    if (action) {
      // Each action depends on the previous one
      const previousId = actionIds[i - 1];
      if (previousId) {
        action.dependencies = [previousId];
      }
    }
  }

  return actions;
}

/**
 * Pattern: Conditional branching
 *
 * Use when you need to execute different actions based on conditions.
 * Sets up proper dependencies and conditions.
 *
 * Example:
 * - Check user type → Execute premium flow OR basic flow
 */
export function createConditionalBranch(
  conditionActionId: string,
  conditionField: string,
  branches: {
    value: string | number | boolean;
    actionIds: string[];
  }[],
  actions: PlannedAction[],
): PlannedAction[] {
  for (const branch of branches) {
    for (const actionId of branch.actionIds) {
      const action = actions.find((a) => a.id === actionId);
      if (action) {
        // Add dependency on condition action
        if (!action.dependencies.includes(conditionActionId)) {
          action.dependencies.push(conditionActionId);
        }

        // Set condition
        action.condition = {
          if: `\${${conditionActionId}.output.${conditionField}}`,
          then: 'execute',
          else: 'skip',
        };
      }
    }
  }

  return actions;
}

/**
 * Pattern: Retry with fallback
 *
 * Use when you want to retry failed actions with different strategies
 * or fall back to alternative actions.
 *
 * Example:
 * - Try primary API → On failure, try backup API → On failure, use cached data
 */
export function createRetryWithFallback(
  primaryActionId: string,
  fallbackActionIds: string[],
  actions: PlannedAction[],
): PlannedAction[] {
  // Set up fallback chain
  for (let i = 0; i < fallbackActionIds.length; i++) {
    const fallbackAction = actions.find((a) => a.id === fallbackActionIds[i]);
    if (fallbackAction) {
      // Depend on previous action (primary or previous fallback)
      const previousId = i === 0 ? primaryActionId : fallbackActionIds[i - 1];
      if (previousId) {
        fallbackAction.dependencies = [previousId];

        // Only execute if previous failed
        // Note: Schema requires then='execute', so we invert the logic
        fallbackAction.condition = {
          if: `\${${previousId}.status} !== 'completed'`,
          then: 'execute' as const, // Execute if previous didn't complete (failed)
          else: 'skip' as const, // Skip if previous completed successfully
        };
      }
    }
  }

  return actions;
}

/**
 * Pattern: Batch processing
 *
 * Use when you need to process items in batches with size limits.
 * Creates batch actions with proper dependencies.
 *
 * Example:
 * - Process 1000 items in batches of 100
 */
export function createBatchProcessing<T>(
  items: T[],
  batchSize: number,
  actionTemplate: Omit<PlannedAction, 'id' | 'inputs'>,
  getBatchInputs: (batch: T[], index: number) => PlannedAction['inputs'],
): PlannedAction[] {
  const actions: PlannedAction[] = [];
  const batches = [];

  // Create batches
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }

  // Create action for each batch
  for (let index = 0; index < batches.length; index++) {
    const batch = batches[index];
    if (!batch) continue;
    const action: PlannedAction = {
      ...actionTemplate,
      id: `${actionTemplate.actionDefinitionId}-batch-${index}`,
      inputs: getBatchInputs(batch, index),
      dependencies: index > 0 ? [`${actionTemplate.actionDefinitionId}-batch-${index - 1}`] : [],
    };
    actions.push(action);
  }

  return actions;
}

/**
 * Helper: Check if all dependencies are satisfied
 */
export function areDependenciesSatisfied(
  action: PlannedAction,
  completedActions: Set<string>,
  failedActions: Set<string>,
): boolean {
  return action.dependencies.every((dep) => {
    if (completedActions.has(dep)) {
      return true;
    }

    if (failedActions.has(dep) && action.errorHandling.continueOnFailure) {
      return true;
    }

    return false;
  });
}

/**
 * Helper: Extract successful action results
 */
export function extractSuccessfulResults(
  states: Record<string, ActionExecutionState>,
): Record<string, Record<string, string | number | boolean>> {
  const results: Record<string, Record<string, string | number | boolean>> = {};

  for (const [actionId, state] of Object.entries(states)) {
    if (state.status === 'completed' && state.result?.status === 'success' && state.result.output) {
      results[actionId] = state.result.output;
    }
  }

  return results;
}

/**
 * Helper: Calculate execution metrics
 */
export function calculateExecutionMetrics(states: Record<string, ActionExecutionState>): {
  totalDuration: number;
  averageDuration: number;
  successRate: number;
  actionsByStatus: Record<ActionExecutionState['status'], number>;
} {
  const actionsList = Object.values(states);
  const completed = actionsList.filter((a) => a.status === 'completed');

  const totalDuration = actionsList.reduce((sum, action) => {
    return sum + (action.duration || 0);
  }, 0);

  const completedDuration = completed.reduce((sum, action) => {
    return sum + (action.duration || 0);
  }, 0);

  const averageDuration = completed.length > 0 ? completedDuration / completed.length : 0;

  const successCount = actionsList.filter(
    (a) => a.status === 'completed' && a.result?.status === 'success',
  ).length;

  const successRate = actionsList.length > 0 ? successCount / actionsList.length : 0;

  const actionsByStatus = actionsList.reduce(
    (acc, action) => {
      acc[action.status] = (acc[action.status] || 0) + 1;
      return acc;
    },
    {} as Record<ActionExecutionState['status'], number>,
  );

  return {
    totalDuration,
    averageDuration,
    successRate,
    actionsByStatus,
  };
}

/**
 * Helper: Find circular dependencies
 */
export function findCircularDependencies(actions: PlannedAction[]): string[][] {
  const cycles: string[][] = [];
  const graph = new Map<string, string[]>();

  // Build adjacency list
  for (const action of actions) {
    graph.set(action.id, action.dependencies);
  }

  // DFS to find cycles
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const path: string[] = [];

  function dfs(nodeId: string): boolean {
    visited.add(nodeId);
    recursionStack.add(nodeId);
    path.push(nodeId);

    const dependencies = graph.get(nodeId) || [];
    for (const dep of dependencies) {
      if (!visited.has(dep)) {
        if (dfs(dep)) {
          return true;
        }
      } else if (recursionStack.has(dep)) {
        // Found cycle
        const cycleStart = path.indexOf(dep);
        cycles.push(path.slice(cycleStart));
        return true;
      }
    }

    path.pop();
    recursionStack.delete(nodeId);
    return false;
  }

  // Check each unvisited node
  for (const action of actions) {
    if (!visited.has(action.id)) {
      dfs(action.id);
    }
  }

  return cycles;
}
