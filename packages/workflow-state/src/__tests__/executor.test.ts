import { describe, test, expect, beforeEach, mock } from 'bun:test';
import type { ExecutionPlan, PlannedAction } from '@rainmaker/schema';

// Note: In a real test, we would mock @trigger.dev/sdk
// For now, we'll test the helper functions that don't depend on trigger.dev

// Import the functions we can test without trigger.dev
// These would normally be internal to executor.ts
const groupActionsByDependencyLevel = (actions: PlannedAction[]): PlannedAction[][] => {
  const levels: PlannedAction[][] = [];
  const processed = new Set<string>();

  while (processed.size < actions.length) {
    const currentLevel = actions.filter((action) => {
      if (processed.has(action.id)) return false;
      return action.dependencies.every((dep) => processed.has(dep));
    });

    if (currentLevel.length === 0) {
      const remaining = actions.filter((a) => !processed.has(a.id));
      throw new Error(
        `Circular dependency detected among actions: ${remaining.map((a) => a.id).join(', ')}`,
      );
    }

    levels.push(currentLevel);
    for (const action of currentLevel) {
      processed.add(action.id);
    }
  }

  return levels;
};

describe('Executor Functions', () => {
  describe('groupActionsByDependencyLevel', () => {
    test('should group independent actions in level 0', () => {
      const actions: PlannedAction[] = [
        {
          id: 'a',
          actionDefinitionId: 'test.a',
          inputs: {},
          dependencies: [],
          errorHandling: { continueOnFailure: false },
        },
        {
          id: 'b',
          actionDefinitionId: 'test.b',
          inputs: {},
          dependencies: [],
          errorHandling: { continueOnFailure: false },
        },
      ];

      const levels = groupActionsByDependencyLevel(actions);

      expect(levels).toHaveLength(1);
      expect(levels[0]).toHaveLength(2);
      expect(levels[0].map((a) => a.id).sort()).toEqual(['a', 'b']);
    });

    test('should create multiple levels for dependencies', () => {
      const actions: PlannedAction[] = [
        {
          id: 'a',
          actionDefinitionId: 'test.a',
          inputs: {},
          dependencies: [],
          errorHandling: { continueOnFailure: false },
        },
        {
          id: 'b',
          actionDefinitionId: 'test.b',
          inputs: {},
          dependencies: ['a'],
          errorHandling: { continueOnFailure: false },
        },
        {
          id: 'c',
          actionDefinitionId: 'test.c',
          inputs: {},
          dependencies: ['b'],
          errorHandling: { continueOnFailure: false },
        },
        {
          id: 'd',
          actionDefinitionId: 'test.d',
          inputs: {},
          dependencies: ['a'],
          errorHandling: { continueOnFailure: false },
        },
      ];

      const levels = groupActionsByDependencyLevel(actions);

      expect(levels).toHaveLength(3);
      expect(levels[0].map((a) => a.id)).toEqual(['a']);
      expect(levels[1].map((a) => a.id).sort()).toEqual(['b', 'd']);
      expect(levels[2].map((a) => a.id)).toEqual(['c']);
    });

    test('should detect circular dependencies', () => {
      const actions: PlannedAction[] = [
        {
          id: 'a',
          actionDefinitionId: 'test.a',
          inputs: {},
          dependencies: ['b'],
          errorHandling: { continueOnFailure: false },
        },
        {
          id: 'b',
          actionDefinitionId: 'test.b',
          inputs: {},
          dependencies: ['a'],
          errorHandling: { continueOnFailure: false },
        },
      ];

      expect(() => groupActionsByDependencyLevel(actions)).toThrow(
        'Circular dependency detected among actions: a, b',
      );
    });

    test('should handle complex dependency graphs', () => {
      const actions: PlannedAction[] = [
        {
          id: 'init',
          actionDefinitionId: 'test.init',
          inputs: {},
          dependencies: [],
          errorHandling: { continueOnFailure: false },
        },
        {
          id: 'fetch-1',
          actionDefinitionId: 'test.fetch',
          inputs: {},
          dependencies: ['init'],
          errorHandling: { continueOnFailure: false },
        },
        {
          id: 'fetch-2',
          actionDefinitionId: 'test.fetch',
          inputs: {},
          dependencies: ['init'],
          errorHandling: { continueOnFailure: false },
        },
        {
          id: 'process-1',
          actionDefinitionId: 'test.process',
          inputs: {},
          dependencies: ['fetch-1'],
          errorHandling: { continueOnFailure: false },
        },
        {
          id: 'process-2',
          actionDefinitionId: 'test.process',
          inputs: {},
          dependencies: ['fetch-2'],
          errorHandling: { continueOnFailure: false },
        },
        {
          id: 'combine',
          actionDefinitionId: 'test.combine',
          inputs: {},
          dependencies: ['process-1', 'process-2'],
          errorHandling: { continueOnFailure: false },
        },
        {
          id: 'finalize',
          actionDefinitionId: 'test.finalize',
          inputs: {},
          dependencies: ['combine'],
          errorHandling: { continueOnFailure: false },
        },
      ];

      const levels = groupActionsByDependencyLevel(actions);

      expect(levels).toHaveLength(5);
      expect(levels[0].map((a) => a.id)).toEqual(['init']);
      expect(levels[1].map((a) => a.id).sort()).toEqual(['fetch-1', 'fetch-2']);
      expect(levels[2].map((a) => a.id).sort()).toEqual(['process-1', 'process-2']);
      expect(levels[3].map((a) => a.id)).toEqual(['combine']);
      expect(levels[4].map((a) => a.id)).toEqual(['finalize']);
    });
  });

  // Note: Additional tests for executor functions would require mocking trigger.dev
  // This would include tests for:
  // - executePlan task execution
  // - executeAction task execution
  // - Error handling and retries
  // - State updates and result recording
});
