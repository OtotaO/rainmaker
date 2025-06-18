import { describe, expect, test as it, beforeEach, afterEach, mock } from 'bun:test';
import {
  generateDeduplicationKey,
  checkDuplication,
  markExecutionStarted,
  markExecutionCompleted,
  markExecutionFailed,
  waitForPendingExecution,
  clearDeduplicationCache,
} from '../deduplication';
import type { PlannedAction, ActionExecutionState } from '../schemas';

describe('Request Deduplication', () => {
  beforeEach(() => {
    clearDeduplicationCache();
  });

  afterEach(() => {
    clearDeduplicationCache();
  });

  const createTestAction = (overrides?: Partial<PlannedAction>): PlannedAction => {
    const defaults: PlannedAction = {
      id: 'action-1',
      actionDefinitionId: 'http-request',
      inputs: { url: 'https://api.example.com/data', method: 'GET' },
      dependencies: [],
      retryConfig: {
        maxAttempts: 3,
        backoffMultiplier: 2,
        initialDelayMs: 1000,
      },
    };
    
    return {
      ...defaults,
      ...overrides,
      // Ensure inputs are properly overridden, not merged
      inputs: overrides?.inputs || defaults.inputs,
    };
  };

  const createTestExecutionState = (): ActionExecutionState => ({
    actionId: 'action-1',
    status: 'completed',
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    duration: 1234,
    attempts: 1,
    httpTrace: [],
    result: {
      status: 'success',
      output: { data: 'test result' },
    },
  });

  describe('generateDeduplicationKey', () => {
    it('generates consistent keys for identical actions', () => {
      const action1 = createTestAction();
      const action2 = createTestAction();
      
      const key1 = generateDeduplicationKey(action1);
      const key2 = generateDeduplicationKey(action2);
      
      expect(key1).toBe(key2);
      expect(key1).toMatch(/^action-exec:[a-f0-9]{64}$/);
    });

    it('generates different keys for different inputs', () => {
      const action1 = createTestAction({
        inputs: { url: 'https://api.example.com/data1', method: 'GET' },
      });
      const action2 = createTestAction({
        inputs: { url: 'https://api.example.com/data2', method: 'GET' },
      });
      
      // Verify inputs are different
      expect(action1.inputs).not.toEqual(action2.inputs);
      
      const key1 = generateDeduplicationKey(action1);
      const key2 = generateDeduplicationKey(action2);
      
      expect(key1).not.toBe(key2);
    });

    it('generates different keys for different dependencies', () => {
      const action1 = createTestAction({
        dependencies: ['dep-1'],
      });
      const action2 = createTestAction({
        dependencies: ['dep-2'],
      });
      
      const key1 = generateDeduplicationKey(action1);
      const key2 = generateDeduplicationKey(action2);
      
      expect(key1).not.toBe(key2);
    });

    it('generates consistent keys regardless of dependency order', () => {
      const action1 = createTestAction({
        dependencies: ['dep-1', 'dep-2', 'dep-3'],
      });
      const action2 = createTestAction({
        dependencies: ['dep-3', 'dep-1', 'dep-2'],
      });
      
      const key1 = generateDeduplicationKey(action1);
      const key2 = generateDeduplicationKey(action2);
      
      expect(key1).toBe(key2);
    });
  });

  describe('checkDuplication', () => {
    it('returns proceed for first execution', () => {
      const action = createTestAction();
      const result = checkDuplication(action);
      
      expect(result.type).toBe('proceed');
      expect(result.key).toMatch(/^action-exec:/);
    });

    it('returns duplicate_pending for concurrent execution', () => {
      const action = createTestAction();
      const key = generateDeduplicationKey(action);
      
      // Mark as started
      markExecutionStarted(key);
      
      // Check for duplicate
      const result = checkDuplication(action);
      
      expect(result.type).toBe('duplicate_pending');
      if (result.type === 'duplicate_pending') {
        expect(result.startedAt).toBeInstanceOf(Date);
      }
    });

    it('returns duplicate_completed for recent execution', () => {
      const action = createTestAction();
      const key = generateDeduplicationKey(action);
      const executionState = createTestExecutionState();
      
      // Mark as completed
      markExecutionStarted(key);
      markExecutionCompleted(key, executionState);
      
      // Check for duplicate
      const result = checkDuplication(action);
      
      expect(result.type).toBe('duplicate_completed');
      if (result.type === 'duplicate_completed') {
        expect(result.result).toEqual(executionState);
      }
    });

    it('returns proceed for failed execution (allows retry)', () => {
      const action = createTestAction();
      const key = generateDeduplicationKey(action);
      
      // Mark as failed
      markExecutionStarted(key);
      markExecutionFailed(key);
      
      // Check for duplicate - should allow retry
      const result = checkDuplication(action);
      
      expect(result.type).toBe('proceed');
    });
  });

  describe('TTL and expiration', () => {
    it('expires completed executions after TTL', async () => {
      const action = createTestAction();
      const key = generateDeduplicationKey(action);
      const executionState = createTestExecutionState();
      
      // Mark as completed with very short TTL
      markExecutionStarted(key);
      markExecutionCompleted(key, executionState, 100); // 100ms TTL
      
      // Should be cached initially
      let result = checkDuplication(action);
      expect(result.type).toBe('duplicate_completed');
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Should be expired now
      result = checkDuplication(action);
      expect(result.type).toBe('proceed');
    });

    it('uses shorter TTL for failed executions', async () => {
      const action = createTestAction();
      const key = generateDeduplicationKey(action);
      
      // Mark as failed with default short TTL
      markExecutionStarted(key);
      markExecutionFailed(key, 100); // 100ms TTL
      
      // Should allow immediate retry
      let result = checkDuplication(action);
      expect(result.type).toBe('proceed');
    });
  });

  describe('waitForPendingExecution', () => {
    it('returns result when execution completes', async () => {
      const action = createTestAction();
      const key = generateDeduplicationKey(action);
      const executionState = createTestExecutionState();
      
      // Mark as started
      markExecutionStarted(key);
      
      // Start waiting in background
      const waitPromise = waitForPendingExecution(key, 1000);
      
      // Complete execution after short delay
      setTimeout(() => {
        markExecutionCompleted(key, executionState);
      }, 50);
      
      // Wait should return the result
      const result = await waitPromise;
      expect(result).toEqual(executionState);
    });

    it('returns null on timeout', async () => {
      const action = createTestAction();
      const key = generateDeduplicationKey(action);
      
      // Mark as started but never complete
      markExecutionStarted(key);
      
      // Wait with short timeout
      const result = await waitForPendingExecution(key, 100);
      
      expect(result).toBeNull();
    });

    it('returns null if execution fails', async () => {
      const action = createTestAction();
      const key = generateDeduplicationKey(action);
      
      // Mark as started
      markExecutionStarted(key);
      
      // Start waiting in background
      const waitPromise = waitForPendingExecution(key, 1000);
      
      // Mark as failed after short delay
      setTimeout(() => {
        markExecutionFailed(key);
      }, 50);
      
      // Wait should return null for failed execution
      const result = await waitPromise;
      expect(result).toBeNull();
    });
  });

  describe('concurrent execution scenarios', () => {
    it('handles rapid duplicate requests correctly', async () => {
      const action = createTestAction();
      const executionState = createTestExecutionState();
      
      // Simulate multiple concurrent requests
      const results = await Promise.all([
        (async () => {
          const result = checkDuplication(action);
          if (result.type === 'proceed') {
            markExecutionStarted(result.key);
            // Simulate execution time
            await new Promise(resolve => setTimeout(resolve, 100));
            markExecutionCompleted(result.key, executionState);
            return { type: 'executed', state: executionState };
          } else if (result.type === 'duplicate_pending') {
            const state = await waitForPendingExecution(result.key);
            return { type: 'waited', state };
          } else {
            return { type: 'cached', state: result.result };
          }
        })(),
        (async () => {
          // Small delay to ensure second request comes after first
          await new Promise(resolve => setTimeout(resolve, 10));
          const result = checkDuplication(action);
          if (result.type === 'proceed') {
            markExecutionStarted(result.key);
            await new Promise(resolve => setTimeout(resolve, 100));
            markExecutionCompleted(result.key, executionState);
            return { type: 'executed', state: executionState };
          } else if (result.type === 'duplicate_pending') {
            const state = await waitForPendingExecution(result.key);
            return { type: 'waited', state };
          } else {
            return { type: 'cached', state: result.result };
          }
        })(),
      ]);
      
      // First request should execute
      expect(results[0].type).toBe('executed');
      
      // Second request should wait or get cached result
      expect(['waited', 'cached']).toContain(results[1].type);
      expect(results[1].state).toEqual(executionState);
    });

    it('handles different actions independently', async () => {
      const action1 = createTestAction({ 
        inputs: { url: 'https://api1.example.com', method: 'GET' } 
      });
      const action2 = createTestAction({ 
        inputs: { url: 'https://api2.example.com', method: 'GET' } 
      });
      
      // Verify inputs are different
      expect(action1.inputs).not.toEqual(action2.inputs);
      
      // Both should proceed independently
      const result1 = checkDuplication(action1);
      const result2 = checkDuplication(action2);
      
      expect(result1.type).toBe('proceed');
      expect(result2.type).toBe('proceed');
      expect(result1.key).not.toBe(result2.key);
    });
  });

  describe('edge cases', () => {
    it('handles missing cache entries gracefully', () => {
      const action = createTestAction();
      const key = generateDeduplicationKey(action);
      
      // Try to mark completed without starting first
      markExecutionCompleted(key, createTestExecutionState());
      
      // Should still work
      const result = checkDuplication(action);
      expect(result.type).toBe('duplicate_completed');
    });

    it('handles very large input objects', () => {
      const largeInputs = {
        data: Array(1000).fill(null).map((_, i) => ({
          id: i,
          value: `value-${i}`,
          nested: { deep: { data: `data-${i}` } },
        })),
      };
      
      const action = createTestAction({ inputs: largeInputs });
      const key = generateDeduplicationKey(action);
      
      // Should generate key without issues
      expect(key).toMatch(/^action-exec:[a-f0-9]{64}$/);
      
      // Should work with deduplication
      const result = checkDuplication(action);
      expect(result.type).toBe('proceed');
    });

    it('handles special characters in inputs', () => {
      const action = createTestAction({
        inputs: {
          url: 'https://api.example.com/data?q=test&special=!@#$%^&*()',
          body: '{"emoji": "🚀", "unicode": "你好"}',
        },
      });
      
      const key = generateDeduplicationKey(action);
      expect(key).toMatch(/^action-exec:[a-f0-9]{64}$/);
    });
  });
});