import { describe, expect, test as it, mock } from 'bun:test';
import { storeActionOutput } from '../action-executor-phases';
import type { ExecutionContext, StorageProvider } from '../action-executor-phases';

describe('Storage Error Handling', () => {
  const createContext = (): ExecutionContext => ({
    executionId: 'exec-123',
    action: {
      id: 'action-1',
      actionDefinitionId: 'test-action',
      inputs: {},
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
  });

  const mockStorage = (): StorageProvider => ({
    save: mock(() => {}),
    load: mock(() => {}),
    exists: mock(() => {}),
    list: mock(() => {}),
    delete: mock(() => {}),
    saveBatch: mock(() => {}),
    loadBatch: mock(() => {}),
  });

  it('handles successful storage', async () => {
    const context = createContext();
    const storage = mockStorage();
    const outputData = { result: 'success' };
    
    storage.save.mockResolvedValue({
      id: 'output-123',
      path: '/storage/output-123',
      size: 100,
      checksum: 'abc123',
    });
    
    const result = await storeActionOutput(context, outputData, storage);
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.provider).toBe('local');
      expect(result.data.path).toBe('/storage/output-123');
      expect(result.data.size).toBe(100);
      expect(result.data.checksum).toBe('abc123');
      expect(result.data.contentType).toBe('application/json');
    }
  });

  it('categorizes network errors correctly', async () => {
    const context = createContext();
    const storage = mockStorage();
    const outputData = { result: 'success' };
    
    const networkError = new Error('Connection refused');
    networkError.code = 'ECONNREFUSED';
    storage.save.mockRejectedValue(networkError);
    
    const result = await storeActionOutput(context, outputData, storage);
    
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.category).toBe('network_error');
      expect(result.error.retryable).toBe(true);
      expect(result.error.suggestion).toContain('Network connectivity issue');
      expect(result.error.context.storageError.code).toBe('ECONNREFUSED');
    }
  });

  it('categorizes rate limit errors correctly', async () => {
    const context = createContext();
    const storage = mockStorage();
    const outputData = { result: 'success' };
    
    const rateLimitError = new Error('Too many requests');
    rateLimitError.statusCode = 429;
    storage.save.mockRejectedValue(rateLimitError);
    
    const result = await storeActionOutput(context, outputData, storage);
    
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.category).toBe('rate_limited');
      expect(result.error.retryable).toBe(true);
      expect(result.error.suggestion).toContain('rate limit');
      expect(result.error.context.storageError.statusCode).toBe(429);
    }
  });

  it('categorizes quota errors as non-retryable', async () => {
    const context = createContext();
    const storage = mockStorage();
    const outputData = { result: 'success' };
    
    const quotaError = new Error('Storage quota exceeded');
    storage.save.mockRejectedValue(quotaError);
    
    const result = await storeActionOutput(context, outputData, storage);
    
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.category).toBe('state_inconsistent');
      expect(result.error.retryable).toBe(false); // Key: not retryable
      expect(result.error.suggestion).toContain('quota exceeded');
    }
  });

  it('categorizes permission errors as non-retryable', async () => {
    const context = createContext();
    const storage = mockStorage();
    const outputData = { result: 'success' };
    
    const permissionError = new Error('Permission denied');
    permissionError.code = 'EACCES';
    storage.save.mockRejectedValue(permissionError);
    
    const result = await storeActionOutput(context, outputData, storage);
    
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.category).toBe('unauthorized');
      expect(result.error.retryable).toBe(false); // Key: not retryable
      expect(result.error.suggestion).toContain('permission denied');
      expect(result.error.context.storageError.code).toBe('EACCES');
    }
  });

  it('categorizes service unavailable errors correctly', async () => {
    const context = createContext();
    const storage = mockStorage();
    const outputData = { result: 'success' };
    
    const serviceError = new Error('Service temporarily unavailable');
    serviceError.statusCode = 503;
    storage.save.mockRejectedValue(serviceError);
    
    const result = await storeActionOutput(context, outputData, storage);
    
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.category).toBe('api_unavailable');
      expect(result.error.retryable).toBe(true);
      expect(result.error.suggestion).toContain('temporarily unavailable');
    }
  });

  it('handles timeout errors', async () => {
    const context = createContext();
    const storage = mockStorage();
    const outputData = { result: 'success' };
    
    const timeoutError = new Error('Request timeout');
    timeoutError.code = 'ETIMEDOUT';
    storage.save.mockRejectedValue(timeoutError);
    
    const result = await storeActionOutput(context, outputData, storage);
    
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.category).toBe('network_error');
      expect(result.error.retryable).toBe(true);
      expect(result.error.context.storageError.code).toBe('ETIMEDOUT');
    }
  });

  it('includes output size in error context', async () => {
    const context = createContext();
    const storage = mockStorage();
    const outputData = { result: 'success', data: 'x'.repeat(1000) };
    
    storage.save.mockRejectedValue(new Error('Storage failed'));
    
    const result = await storeActionOutput(context, outputData, storage);
    
    expect(result.success).toBe(false);
    if (!result.success) {
      const expectedSize = Buffer.from(JSON.stringify(outputData)).length;
      expect(result.error.context.outputSize).toBe(expectedSize);
    }
  });

  it('handles 403 forbidden errors', async () => {
    const context = createContext();
    const storage = mockStorage();
    const outputData = { result: 'success' };
    
    const forbiddenError = new Error('Forbidden');
    forbiddenError.statusCode = 403;
    storage.save.mockRejectedValue(forbiddenError);
    
    const result = await storeActionOutput(context, outputData, storage);
    
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.category).toBe('unauthorized');
      expect(result.error.retryable).toBe(false);
      expect(result.error.context.storageError.statusCode).toBe(403);
    }
  });

  it('handles disk space errors', async () => {
    const context = createContext();
    const storage = mockStorage();
    const outputData = { result: 'success' };
    
    const spaceError = new Error('No space left on device');
    spaceError.code = 'ENOSPC';
    storage.save.mockRejectedValue(spaceError);
    
    const result = await storeActionOutput(context, outputData, storage);
    
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.category).toBe('state_inconsistent');
      expect(result.error.retryable).toBe(false);
      expect(result.error.suggestion).toContain('free up space');
    }
  });
});