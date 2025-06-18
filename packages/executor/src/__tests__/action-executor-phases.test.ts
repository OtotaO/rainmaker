import { describe, expect, test as it, mock } from 'bun:test';
import {
  validateActionDefinition,
  resolveActionInputs,
  validateActionInputs,
  processHttpResponse,
  validateActionOutput,
  storeActionOutput,
  type ExecutionContext,
  type PhaseLogger,
} from '../action-executor-phases';
import type { ActionDefinition, PlannedAction } from '../schemas';

describe('Action Executor Phases', () => {
  const createContext = (overrides?: Partial<ExecutionContext>): ExecutionContext => ({
    executionId: 'exec-123',
    action: {
      id: 'action-1',
      actionDefinitionId: 'test-action',
      inputs: { param: 'value' },
      dependencies: [],
      retryConfig: {
        maxAttempts: 1,
        backoffMultiplier: 2,
        initialDelayMs: 1000,
      },
    },
    actionDef: {
      id: 'test-action',
      name: 'Test Action',
      description: 'Test',
      endpoint: {
        url: 'https://api.example.com/test',
        method: 'GET',
        headers: {},
        timeout: 30000,
      },
      retryPolicy: {
        maxAttempts: 1,
        initialDelay: 1000,
        maxDelay: 5000,
        backoffMultiplier: 2,
        retryableErrors: [],
        jitter: false,
      },
    },
    credentials: {},
    previousResults: {},
    startTime: Date.now(),
    state: {
      actionId: 'action-1',
      status: 'running',
      startedAt: new Date().toISOString(),
      attempts: 0,
      httpTrace: [],
    },
    ...overrides,
  });

  const mockLogger: PhaseLogger = {
    info: mock(() => {}),
    error: mock(() => {}),
  };

  describe('validateActionDefinition', () => {
    it('returns error when action definition not found', () => {
      const context = createContext();
      const definitions = new Map<string, ActionDefinition>();
      
      const result = validateActionDefinition(context, definitions);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.category).toBe('validation_failed');
        expect(result.error.message).toContain('Action definition not found');
      }
    });

    it('returns context with action definition when found', () => {
      const context = createContext();
      const actionDef: ActionDefinition = {
        id: 'test-action',
        name: 'Test',
        description: 'Test action',
        endpoint: {
          url: 'https://api.example.com',
          method: 'GET',
          headers: {},
          timeout: 30000,
        },
        retryPolicy: {
          maxAttempts: 1,
          initialDelay: 1000,
          maxDelay: 5000,
          backoffMultiplier: 2,
          retryableErrors: [],
          jitter: false,
        },
      };
      const definitions = new Map([['test-action', actionDef]]);
      
      const result = validateActionDefinition(context, definitions);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.actionDef).toBe(actionDef);
      }
    });
  });

  describe('resolveActionInputs', () => {
    it('resolves simple inputs without references', async () => {
      const context = createContext({
        action: {
          ...createContext().action,
          inputs: { name: 'test', value: 123 },
        },
      });
      
      const result = await resolveActionInputs(context);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.resolvedInputs).toEqual({ name: 'test', value: 123 });
      }
    });

    it('returns error for invalid resolved inputs', async () => {
      const context = createContext({
        action: {
          ...createContext().action,
          inputs: { ref: '${missing.output}' },
          dependencies: ['missing'],
        },
      });
      
      const result = await resolveActionInputs(context);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.category).toBe('state_inconsistent');
        expect(result.error.message).toContain('Failed to resolve input references');
      }
    });
  });

  describe('validateActionInputs', () => {
    it('skips validation when no schema defined', async () => {
      const context = createContext({
        actionDef: {
          ...createContext().actionDef,
          inputSchema: undefined,
        },
        resolvedInputs: { any: 'data' },
      });
      
      const result = await validateActionInputs(context);
      
      expect(result.success).toBe(true);
    });

    it('validates inputs against JSON schema', async () => {
      const context = createContext({
        actionDef: {
          ...createContext().actionDef,
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              age: { type: 'number' },
            },
            required: ['name'],
          },
        },
        resolvedInputs: { name: 'test', age: 25 },
      });
      
      const result = await validateActionInputs(context);
      
      expect(result.success).toBe(true);
    });

    it('returns error for invalid inputs', async () => {
      const context = createContext({
        actionDef: {
          ...createContext().actionDef,
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string' },
            },
            required: ['name'],
          },
        },
        resolvedInputs: { age: 25 }, // Missing required 'name'
      });
      
      const result = await validateActionInputs(context);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.category).toBe('validation_failed');
        expect(result.error.message).toContain('Input validation failed');
      }
    });
  });

  describe('processHttpResponse', () => {
    it('processes JSON response', async () => {
      const context = createContext();
      const response = {
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' },
        data: { result: 'success', value: 42 },
        config: {} as any,
      };
      
      const result = await processHttpResponse(context, response, mockLogger);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ result: 'success', value: 42 });
      }
    });

    it('processes text response', async () => {
      const context = createContext();
      const response = {
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'text/plain' },
        data: 'Hello, World!',
        config: {} as any,
      };
      
      const result = await processHttpResponse(context, response, mockLogger);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ text: 'Hello, World!' });
      }
    });

    it('processes binary response', async () => {
      const context = createContext();
      const binaryData = Buffer.from('Binary content');
      const response = {
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/octet-stream' },
        data: binaryData,
        config: {} as any,
      };
      
      const result = await processHttpResponse(context, response, mockLogger);
      
      expect(result.success).toBe(true);
      if (result.success) {
        const output = result.data as any;
        expect(output.binary).toBeDefined();
        expect(output.contentType).toBe('application/octet-stream');
        expect(output.size).toBe(binaryData.length);
      }
    });

    it('handles malformed JSON', async () => {
      const context = createContext();
      const response = {
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' },
        data: 'Not JSON {invalid}',
        config: {} as any,
      };
      
      const result = await processHttpResponse(context, response, mockLogger);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.category).toBe('api_response_malformed');
        expect(result.error.message).toContain('Invalid JSON');
      }
    });
  });

  describe('validateActionOutput', () => {
    it('skips validation when no schema defined', async () => {
      const context = createContext({
        actionDef: {
          ...createContext().actionDef,
          outputSchema: undefined,
        },
      });
      const outputData = { any: 'data' };
      
      const result = await validateActionOutput(context, outputData);
      
      expect(result.success).toBe(true);
    });

    it('validates output against schema', async () => {
      const context = createContext({
        actionDef: {
          ...createContext().actionDef,
          outputSchema: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              data: { type: 'array' },
            },
            required: ['status'],
          },
        },
      });
      const outputData = { status: 'ok', data: [1, 2, 3] };
      
      const result = await validateActionOutput(context, outputData);
      
      expect(result.success).toBe(true);
    });

    it('returns error for invalid output', async () => {
      const context = createContext({
        actionDef: {
          ...createContext().actionDef,
          outputSchema: {
            type: 'object',
            properties: {
              status: { type: 'string' },
            },
            required: ['status'],
          },
        },
      });
      const outputData = { data: 'missing status' };
      
      const result = await validateActionOutput(context, outputData);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.category).toBe('validation_failed');
        expect(result.error.message).toContain('Output validation failed');
      }
    });
  });

  describe('storeActionOutput', () => {
    it('stores output successfully', async () => {
      const context = createContext();
      const outputData = { result: 'test data' };
      const mockStorage = {
        save: mock(() => {}).mockResolvedValue({
          path: '/storage/output.json',
          size: 100,
          checksum: 'abc123',
        }),
        retrieve: mock(() => {}),
        delete: mock(() => {}),
      };
      
      const result = await storeActionOutput(context, outputData, mockStorage);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.path).toBe('/storage/output.json');
        expect(result.data.size).toBe(100);
        expect(result.data.checksum).toBe('abc123');
        expect(result.data.contentType).toBe('application/json');
      }
      
      expect(mockStorage.save).toHaveBeenCalledWith(
        'action-outputs',
        'exec-123-action-1-output',
        expect.any(Buffer)
      );
    });

    it('handles storage errors', async () => {
      const context = createContext();
      const outputData = { result: 'test data' };
      const mockStorage = {
        save: mock(() => {}).mockRejectedValue(new Error('Storage full')),
        retrieve: mock(() => {}),
        delete: mock(() => {}),
      };
      
      const result = await storeActionOutput(context, outputData, mockStorage);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.category).toBe('state_inconsistent');
        expect(result.error.message).toContain('Failed to store output');
        expect(result.error.retryable).toBe(true);
      }
    });
  });
});