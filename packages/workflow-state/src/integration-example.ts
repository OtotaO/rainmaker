import { task } from '@trigger.dev/sdk/v3';
import type { ExecutionPlan, PlannedAction } from '@rainmaker/schema';

/**
 * This shows how modules integrate using direct function calls
 *
 * Key principle: Modules are interface boundaries, not server boundaries
 * We use direct imports and function calls, not events or abstractions
 */

// ============================================
// Module 3: Plan Orchestrator
// ============================================
import { executePlan, validateExecutionPlan } from '@rainmaker/workflow-state';

export async function orchestratePlan(plan: ExecutionPlan) {
  // Direct function call for validation
  const validPlan = validateExecutionPlan(plan);

  // Trigger background execution
  const handle = await executePlan.trigger({ plan: validPlan });
  return { executionId: handle.id };
}

// ============================================
// Module 4: Workflow State (our module)
// ============================================
export const executePlanWorkflow = task({
  id: 'execute-plan-workflow',
  queue: { name: 'workflows', concurrencyLimit: 10 },
  run: async ({ plan }: { plan: ExecutionPlan }, { ctx }) => {
    const executionId = ctx.run.id;

    // Process actions in dependency order
    // TODO: Implement groupActionsByDependencyLevel
    const actionLevels: PlannedAction[][] = [plan.actions]; // Simplified for example

    for (const level of actionLevels) {
      // Execute actions in parallel within each level
      await Promise.all(
        level.map((action: PlannedAction) =>
          // Trigger Module 2's action executor
          httpActionExecutor.triggerAndWait({
            executionId,
            action,
            planId: plan.id,
          }),
        ),
      );

      // Handle results...
    }

    return { executionId, status: 'completed' };
  },
});

// ============================================
// Module 2: Action Executor
// ============================================
export const httpActionExecutor = task({
  id: 'http-action-executor',
  queue: { name: 'actions', concurrencyLimit: 50 },
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 30000,
  },
  run: async ({
    executionId,
    action,
  }: {
    executionId: string;
    action: PlannedAction;
    planId: string;
  }) => {
    // Load action definition from catalog
    // TODO: Implement loadActionDefinition - for now, mock it
    const actionDef = {
      endpoint: {
        url: 'https://example.com/api',
        method: 'POST' as const,
        headers: { 'Content-Type': 'application/json' },
      },
    }; // await loadActionDefinition(action.actionDefinitionId);

    // Make HTTP request
    const response = await fetch(actionDef.endpoint.url, {
      method: actionDef.endpoint.method,
      headers: actionDef.endpoint.headers,
      body: JSON.stringify(action.inputs),
    });

    // Store results
    const result = await response.json();
    // TODO: Implement storageProvider
    const storageLocation = {
      provider: 'local' as const,
      path: `/tmp/${executionId}/${action.id}`,
      size: 0,
      checksum: 'mock',
      contentType: 'application/json',
      metadata: {},
    }; // await storageProvider.save(...)

    return {
      actionId: action.id,
      status: 'completed' as const,
      output: result,
      storageLocation,
    };
  },
});

// ============================================
// Clean Integration Points
// ============================================

// 1. Module 3 triggers execution - that's it
// TODO: Example usage - uncomment when ready
// const execution = await planOrchestrator.executePlan(myPlan);

// 2. Module 4 orchestrates via trigger.dev tasks
// 3. Module 2 executes actions via trigger.dev tasks
// 4. State is managed by trigger.dev automatically

// No StateManager interface needed!
// No manual state updates!
// No fake abstractions!

// If you need to query state:
// TODO: Example usage - uncomment when ready
// const run = await runs.get(execution.runId);
// const state = run.output; // The execution state

// Simple, clean, trigger.dev native.
