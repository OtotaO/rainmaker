import { describe, test, expect } from 'bun:test';
import {
  createFanOutFanInPattern,
  createSequentialPipeline,
  createConditionalBranch,
  findCircularDependencies,
  calculateExecutionMetrics,
} from '../patterns';
import type { PlannedAction, ActionExecutionState } from '@rainmaker/schema';

describe('Workflow Patterns', () => {
  describe('createFanOutFanInPattern', () => {
    test('should set combiner dependencies correctly', () => {
      const actions: PlannedAction[] = [
        {
          id: 'fetch-1',
          actionDefinitionId: 'api.fetch',
          inputs: { url: 'api1' },
          dependencies: [],
          errorHandling: { continueOnFailure: false },
        },
        {
          id: 'fetch-2',
          actionDefinitionId: 'api.fetch',
          inputs: { url: 'api2' },
          dependencies: [],
          errorHandling: { continueOnFailure: false },
        },
        {
          id: 'combine',
          actionDefinitionId: 'data.combine',
          inputs: {},
          dependencies: [],
          errorHandling: { continueOnFailure: false },
        },
      ];

      const result = createFanOutFanInPattern(['fetch-1', 'fetch-2'], 'combine', actions);

      const combiner = result.find((a) => a.id === 'combine');
      expect(combiner?.dependencies).toContain('fetch-1');
      expect(combiner?.dependencies).toContain('fetch-2');
    });
  });

  describe('createSequentialPipeline', () => {
    test('should create sequential dependencies', () => {
      const actions: PlannedAction[] = [
        {
          id: 'step-1',
          actionDefinitionId: 'process.step1',
          inputs: {},
          dependencies: [],
          errorHandling: { continueOnFailure: false },
        },
        {
          id: 'step-2',
          actionDefinitionId: 'process.step2',
          inputs: {},
          dependencies: [],
          errorHandling: { continueOnFailure: false },
        },
        {
          id: 'step-3',
          actionDefinitionId: 'process.step3',
          inputs: {},
          dependencies: [],
          errorHandling: { continueOnFailure: false },
        },
      ];

      const result = createSequentialPipeline(['step-1', 'step-2', 'step-3'], actions);

      expect(result.find((a) => a.id === 'step-1')?.dependencies).toEqual([]);
      expect(result.find((a) => a.id === 'step-2')?.dependencies).toEqual(['step-1']);
      expect(result.find((a) => a.id === 'step-3')?.dependencies).toEqual(['step-2']);
    });
  });

  describe('createConditionalBranch', () => {
    test('should set up conditional execution', () => {
      const actions: PlannedAction[] = [
        {
          id: 'check-type',
          actionDefinitionId: 'user.check',
          inputs: {},
          dependencies: [],
          errorHandling: { continueOnFailure: false },
        },
        {
          id: 'premium-flow',
          actionDefinitionId: 'process.premium',
          inputs: {},
          dependencies: [],
          errorHandling: { continueOnFailure: false },
        },
        {
          id: 'basic-flow',
          actionDefinitionId: 'process.basic',
          inputs: {},
          dependencies: [],
          errorHandling: { continueOnFailure: false },
        },
      ];

      const result = createConditionalBranch(
        'check-type',
        'userType',
        [
          { value: 'premium', actionIds: ['premium-flow'] },
          { value: 'basic', actionIds: ['basic-flow'] },
        ],
        actions,
      );

      const premiumFlow = result.find((a) => a.id === 'premium-flow');
      expect(premiumFlow?.dependencies).toContain('check-type');
      expect(premiumFlow?.condition).toEqual({
        if: '${check-type.output.userType}',
        then: 'execute',
        else: 'skip',
      });
    });
  });

  describe('findCircularDependencies', () => {
    test('should detect circular dependencies', () => {
      const actions: PlannedAction[] = [
        {
          id: 'a',
          actionDefinitionId: 'action.a',
          inputs: {},
          dependencies: ['b'],
          errorHandling: { continueOnFailure: false },
        },
        {
          id: 'b',
          actionDefinitionId: 'action.b',
          inputs: {},
          dependencies: ['c'],
          errorHandling: { continueOnFailure: false },
        },
        {
          id: 'c',
          actionDefinitionId: 'action.c',
          inputs: {},
          dependencies: ['a'], // Creates cycle: a -> b -> c -> a
          errorHandling: { continueOnFailure: false },
        },
      ];

      const cycles = findCircularDependencies(actions);
      expect(cycles.length).toBeGreaterThan(0);
      expect(cycles[0]).toContain('a');
      expect(cycles[0]).toContain('b');
      expect(cycles[0]).toContain('c');
    });

    test('should not detect cycles in valid DAG', () => {
      const actions: PlannedAction[] = [
        {
          id: 'a',
          actionDefinitionId: 'action.a',
          inputs: {},
          dependencies: [],
          errorHandling: { continueOnFailure: false },
        },
        {
          id: 'b',
          actionDefinitionId: 'action.b',
          inputs: {},
          dependencies: ['a'],
          errorHandling: { continueOnFailure: false },
        },
        {
          id: 'c',
          actionDefinitionId: 'action.c',
          inputs: {},
          dependencies: ['a', 'b'],
          errorHandling: { continueOnFailure: false },
        },
      ];

      const cycles = findCircularDependencies(actions);
      expect(cycles).toEqual([]);
    });
  });

  describe('calculateExecutionMetrics', () => {
    test('should calculate metrics correctly', () => {
      const states: Record<string, ActionExecutionState> = {
        'action-1': {
          actionId: 'action-1',
          status: 'completed',
          startedAt: '2024-01-01T00:00:00Z',
          completedAt: '2024-01-01T00:00:10Z',
          duration: 10000,
          attempts: 1,
          result: {
            status: 'success',
            output: { data: 'test' },
            outputLocation: {
              provider: 'local',
              path: '/test',
              size: 100,
              checksum: 'abc',
              contentType: 'application/json',
              metadata: {},
            },
          },
        },
        'action-2': {
          actionId: 'action-2',
          status: 'failed',
          startedAt: '2024-01-01T00:00:00Z',
          completedAt: '2024-01-01T00:00:05Z',
          duration: 5000,
          attempts: 3,
          result: {
            status: 'failure',
            error: {
              category: 'network_timeout',
              message: 'Timeout',
              retryable: true,
            },
          },
        },
        'action-3': {
          actionId: 'action-3',
          status: 'skipped',
          startedAt: '2024-01-01T00:00:00Z',
          completedAt: '2024-01-01T00:00:00Z',
          duration: 0,
          attempts: 0,
          result: {
            status: 'skipped',
            reason: 'Dependency failed',
          },
        },
      };

      const metrics = calculateExecutionMetrics(states);

      expect(metrics.totalDuration).toBe(15000);
      expect(metrics.averageDuration).toBe(10000); // Only completed actions
      expect(metrics.successRate).toBeCloseTo(0.333, 3);
      expect(metrics.actionsByStatus).toEqual({
        completed: 1,
        failed: 1,
        skipped: 1,
      });
    });
  });
});
