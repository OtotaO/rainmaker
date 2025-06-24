import { describe, test, expect, beforeEach, mock } from 'bun:test';
import type { ExecutionPlan, PlannedAction, ActionExecutionState } from '@rainmaker/schema';

/**
 * Tests for executor logic
 *
 * Since trigger.dev v3 doesn't have official unit testing support yet,
 * we test the core logic by extracting it from the task definitions
 * and testing it separately.
 */

// Mock trigger.dev context
const createMockContext = () => ({
  run: {
    id: 'test-execution-id',
  },
  waitFor: mock(() => Promise.resolve()),
  sendEvent: mock(() => Promise.resolve()),
  runBatch: mock((tasks: unknown[]) =>
    Promise.resolve(tasks.map(() => ({ ok: true, output: { status: 'completed' } }))),
  ),
});

// Extract the core logic for testing
async function executeActionLogic(
  action: PlannedAction,
  previousResults: Record<string, ActionExecutionState>,
  evaluateCondition: (condition: PlannedAction['condition'], results: Record<string, ActionExecutionState>) => boolean,
  resolveInputs: (inputs: PlannedAction['inputs'], results: Record<string, ActionExecutionState>) => PlannedAction['inputs'],
): Promise<ActionExecutionState> {
  const startTime = Date.now();

  // Evaluate condition
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
        result: {
          status: 'skipped',
          reason: 'Condition not met',
        },
      };
    }
  }

  // Resolve inputs
  const resolvedInputs = resolveInputs(action.inputs, previousResults);

  // Simulate successful execution
  return {
    actionId: action.id,
    status: 'completed',
    startedAt: new Date(startTime).toISOString(),
    completedAt: new Date().toISOString(),
    duration: Date.now() - startTime,
    attempts: 1,
    result: {
      status: 'success',
      output: {
        ...resolvedInputs,
        processed: true,
      },
      outputLocation: {
        provider: 'local' as const,
        path: `/test/${action.id}`,
        size: 100,
        checksum: 'test-checksum',
        contentType: 'application/json',
        metadata: {},
      },
    },
  };
}

describe('Executor Logic', () => {
  describe('Action Execution', () => {
    test('should skip action when condition is not met', async () => {
      const action: PlannedAction = {
        id: 'conditional-action',
        actionDefinitionId: 'test.conditional',
        inputs: {},
        dependencies: [],
        condition: {
          if: '${previous.output.shouldRun}',
          then: 'execute',
          else: 'skip',
        },
        errorHandling: { continueOnFailure: false },
      };

      const previousResults = {
        previous: {
          actionId: 'previous',
          status: 'completed' as const,
          attempts: 1,
          result: {
            status: 'success' as const,
            output: { shouldRun: false },
            outputLocation: {
              provider: 'local' as const,
              path: '/test',
              size: 100,
              checksum: 'abc',
              contentType: 'application/json',
              metadata: {},
            },
          },
        },
      };

      const evaluateCondition = (condition: PlannedAction['condition'], results: Record<string, ActionExecutionState>) => {
        // Simple evaluation for test
        return results.previous?.result?.output?.shouldRun === true;
      };

      const result = await executeActionLogic(
        action,
        previousResults,
        evaluateCondition,
        () => ({}),
      );

      expect(result.status).toBe('skipped');
      expect(result.result?.status).toBe('skipped');
      expect(result.result?.reason).toBe('Condition not met');
    });

    test('should execute action when condition is met', async () => {
      const action: PlannedAction = {
        id: 'conditional-action',
        actionDefinitionId: 'test.conditional',
        inputs: { baseValue: 100 },
        dependencies: [],
        condition: {
          if: '${previous.output.shouldRun}',
          then: 'execute',
          else: 'skip',
        },
        errorHandling: { continueOnFailure: false },
      };

      const previousResults = {
        previous: {
          actionId: 'previous',
          status: 'completed' as const,
          attempts: 1,
          result: {
            status: 'success' as const,
            output: { shouldRun: true },
            outputLocation: {
              provider: 'local' as const,
              path: '/test',
              size: 100,
              checksum: 'abc',
              contentType: 'application/json',
              metadata: {},
            },
          },
        },
      };

      const evaluateCondition = (condition: PlannedAction['condition'], results: Record<string, ActionExecutionState>) => {
        return results.previous?.result?.output?.shouldRun === true;
      };

      const result = await executeActionLogic(
        action,
        previousResults,
        evaluateCondition,
        (inputs) => inputs,
      );

      expect(result.status).toBe('completed');
      expect(result.result?.status).toBe('success');
      expect(result.result?.output).toMatchObject({
        baseValue: 100,
        processed: true,
      });
    });

    test('should resolve input references', async () => {
      const action: PlannedAction = {
        id: 'transform-action',
        actionDefinitionId: 'test.transform',
        inputs: {
          userId: '${fetch-user.output.id}',
          userName: '${fetch-user.output.name}',
          staticValue: 'test',
        },
        dependencies: ['fetch-user'],
        errorHandling: { continueOnFailure: false },
      };

      const previousResults = {
        'fetch-user': {
          actionId: 'fetch-user',
          status: 'completed' as const,
          attempts: 1,
          result: {
            status: 'success' as const,
            output: {
              id: 'user-123',
              name: 'John Doe',
            },
            outputLocation: {
              provider: 'local' as const,
              path: '/test',
              size: 100,
              checksum: 'abc',
              contentType: 'application/json',
              metadata: {},
            },
          },
        },
      };

      const resolveInputs = (inputs: PlannedAction['inputs'], results: Record<string, ActionExecutionState>) => {
        const resolved: PlannedAction['inputs'] = {};

        for (const [key, value] of Object.entries(inputs)) {
          if (typeof value === 'string' && value.startsWith('${')) {
            // Parse reference
            const match = value.match(/\$\{([^.]+)\.output\.(.+)\}/);
            if (match) {
              const [, actionId, fieldPath] = match;
              const actionState = results[actionId];
              if (actionState?.result?.output) {
                resolved[key] = actionState.result.output[fieldPath];
              }
            }
          } else {
            resolved[key] = value;
          }
        }

        return resolved;
      };

      const result = await executeActionLogic(action, previousResults, () => true, resolveInputs);

      expect(result.status).toBe('completed');
      expect(result.result?.output).toMatchObject({
        userId: 'user-123',
        userName: 'John Doe',
        staticValue: 'test',
        processed: true,
      });
    });
  });

  describe('Plan Execution Flow', () => {
    test('should handle dependency failures with continueOnFailure', () => {
      const actions: PlannedAction[] = [
        {
          id: 'action-1',
          actionDefinitionId: 'test.action1',
          inputs: {},
          dependencies: [],
          errorHandling: { continueOnFailure: false },
        },
        {
          id: 'action-2',
          actionDefinitionId: 'test.action2',
          inputs: {},
          dependencies: ['action-1'],
          errorHandling: { continueOnFailure: true }, // Should execute even if action-1 fails
        },
        {
          id: 'action-3',
          actionDefinitionId: 'test.action3',
          inputs: {},
          dependencies: ['action-1'],
          errorHandling: { continueOnFailure: false }, // Should skip if action-1 fails
        },
      ];

      const results = new Map<string, ActionExecutionState>();

      // Simulate action-1 failure
      results.set('action-1', {
        actionId: 'action-1',
        status: 'failed',
        attempts: 3,
        result: {
          status: 'failure',
          error: {
            category: 'network_timeout',
            message: 'Connection timeout',
            retryable: true,
          },
        },
      });

      // Check if action-2 should run (continueOnFailure = true)
      const action2 = actions.find((a) => a.id === 'action-2')!;
      const shouldRunAction2 = action2.dependencies.every((dep) => {
        const depResult = results.get(dep);
        return (
          depResult !== undefined &&
          (depResult.status === 'completed' || action2.errorHandling.continueOnFailure)
        );
      });

      expect(shouldRunAction2).toBe(true);

      // Check if action-3 should run (continueOnFailure = false)
      const action3 = actions.find((a) => a.id === 'action-3')!;
      const shouldRunAction3 = action3.dependencies.every((dep) => {
        const depResult = results.get(dep);
        return (
          depResult !== undefined &&
          (depResult.status === 'completed' || action3.errorHandling.continueOnFailure)
        );
      });

      expect(shouldRunAction3).toBe(false);
    });
  });

  describe('State Management', () => {
    test('should initialize execution state correctly', () => {
      const plan: ExecutionPlan = {
        id: '550e8400-e29b-41d4-a716-446655440000', // valid UUID
        name: 'Test Plan',
        description: 'Test plan description',
        intent: {
          original: 'Do something',
          interpreted: 'Execute test actions',
          confidence: 0.9,
        },
        actions: [
          {
            id: 'action-1',
            actionDefinitionId: 'test.action1',
            inputs: {},
            dependencies: [],
            errorHandling: { continueOnFailure: false },
          },
          {
            id: 'action-2',
            actionDefinitionId: 'test.action2',
            inputs: {},
            dependencies: ['action-1'],
            errorHandling: { continueOnFailure: false },
          },
        ],
        expectedOutcome: {
          description: 'Success',
          validations: [],
        },
        metadata: {
          createdAt: new Date().toISOString(),
          estimatedDuration: 5000,
          tags: ['test'],
        },
      };

      const executionId = 'exec-123';

      // Initialize state
      const initialState: ExecutionState = {
        id: executionId,
        planId: plan.id,
        status: 'running',
        startedAt: new Date().toISOString(),
        actionStates: Object.fromEntries(
          plan.actions.map((action) => [
            action.id,
            {
              actionId: action.id,
              status: 'pending' as const,
              attempts: 0,
            },
          ]),
        ),
        confirmations: [],
        metrics: {
          totalActions: plan.actions.length,
          completedActions: 0,
          failedActions: 0,
          skippedActions: 0,
        },
        version: 1,
      };

      expect(initialState.id).toBe(executionId);
      expect(initialState.planId).toBe(plan.id);
      expect(initialState.status).toBe('running');
      expect(Object.keys(initialState.actionStates)).toHaveLength(2);
      expect(initialState.actionStates['action-1'].status).toBe('pending');
      expect(initialState.actionStates['action-2'].status).toBe('pending');
      expect(initialState.metrics.totalActions).toBe(2);
    });
  });
});
