import { describe, test as it, expect, beforeEach, beforeAll, afterAll, mock } from 'bun:test';
import {
  executeActionRun,
  injectStorageProvider,
  injectApiCatalog,
  registerActionDefinition,
} from '../action-executor-jobs';
import type { StorageProvider, ApiCatalog } from '../interfaces';
import { 
  ActionIdSchema,
  ExecutionIdSchema,
  type PlannedAction, 
  type ActionDefinition, 
} from '../schemas';
import { globalCircuitBreaker } from '../circuit-breaker';
import { clearDeduplicationCache } from '../deduplication';

/**
 * Integration tests using Bun's native HTTP server.
 * This replaces MSW which is incompatible with Bun runtime.
 */

// Test server state
let server: any;
const serverPort = 9876;
const baseUrl = `http://localhost:${serverPort}`;

// Response handlers
const routes: Record<string, (req: Request) => Response | Promise<Response>> = {
  'GET /users/123': () => new Response(JSON.stringify({
    id: '123',
    name: 'John Doe',
    email: 'john@example.com',
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  }),
  
  'GET /users/456': () => new Response(JSON.stringify({
    id: '456',
    name: 'Jane Smith',
    email: 'jane@example.com',
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  }),
  
  'GET /users/malformed': () => new Response('Not JSON {invalid}', {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  }),
  
  'GET /users/incomplete': () => new Response(JSON.stringify({
    id: '123',
    // Missing required fields
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  }),
  
  'GET /users/503': () => new Response('Service Unavailable', {
    status: 503,
  }),
  
  'GET /users/404': () => new Response('Not Found', {
    status: 404,
  }),
  
  'GET /users/429': () => new Response('Too Many Requests', {
    status: 429,
    headers: { 'Retry-After': '60' },
  }),
};

// Start test server
server = Bun.serve({
  port: serverPort,
  fetch(req) {
    const url = new URL(req.url);
    const key = `${req.method} ${url.pathname}`;
    
    const handler = routes[key];
    if (handler) {
      return handler(req);
    }
    
    return new Response('Not Found', { status: 404 });
  },
});

// Mock implementations
const mockStorageProvider: StorageProvider = {
  save: mock(async (collection, id, data) => ({
    id,
    checksum: 'mock-checksum',
    size: data.length,
    path: `/mock/storage/${collection}/${id}`,
  })),
  load: mock(async (collection, id) => null),
  exists: mock(async (collection, id) => false),
  list: mock(async (collection, prefix) => []),
  delete: mock(async (collection, id) => true),
  saveBatch: mock(async (operations) =>
    operations.map((op: { collection: string; id: string; data: Buffer }) => ({
      id: op.id,
      checksum: 'mock-checksum',
      size: op.data.length,
      path: `/mock/storage/${collection}/${op.id}`,
    })),
  ),
  loadBatch: mock(async (operations) => operations.map(() => null)),
};

const mockApiCatalog: ApiCatalog = {
  getApiEntry: mock(async (apiId) => null),
  getAllApis: mock(async () => []),
};

// Test action definition pointing to our test server
const testActionDef: ActionDefinition = {
  id: 'test-get-user',
  name: 'Get User',
  description: 'Fetch user details',
  version: '1.0.0',
  endpoint: {
    url: `${baseUrl}/users/{userId}`,
    method: 'GET',
    headers: {
      'X-API-Version': '1.0',
    },
    timeout: 5000,
  },
  inputSchema: {
    type: 'object',
    properties: {
      userId: {
        type: 'string'
      }
    },
    required: ['userId']
  } as any,
  outputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'string'
      },
      name: {
        type: 'string'
      },
      email: {
        type: 'string'
      }
    },
    required: ['id', 'name', 'email']
  } as any,
  retryPolicy: {
    maxAttempts: 3,
    initialDelay: 100, // Shorter for tests
    maxDelay: 1000,
    backoffMultiplier: 2,
    retryableErrors: ['network_timeout', 'api_unavailable'],
    jitter: false,
  },
  knownErrors: [],
  examples: [],
};

describe('Action Executor Integration Tests', () => {
  beforeEach(() => {
    // Reset mocks
    Object.values(mockStorageProvider).forEach((fn) => {
      if (typeof fn === 'function' && 'mockClear' in fn) {
        (fn as any).mockClear();
      }
    });
    Object.values(mockApiCatalog).forEach((fn) => {
      if (typeof fn === 'function' && 'mockClear' in fn) {
        (fn as any).mockClear();
      }
    });
    
    // Reset circuit breaker state
    globalCircuitBreaker.resetAll();

    // Inject dependencies
    injectStorageProvider(mockStorageProvider);
    injectApiCatalog(mockApiCatalog);
    registerActionDefinition(testActionDef);
  });

  afterAll(() => {
    server?.stop();
  });

  it('EXEC-001: validates inputs against action definition schema', async () => {
    const action: PlannedAction = {
      id: ActionIdSchema.parse('action-1'),
      actionDefinitionId: 'test-get-user',
      inputs: {
        // Missing required userId
      },
      dependencies: [],
      errorHandling: {
        continueOnFailure: false,
      },
    };

    const payload = {
      executionId: ExecutionIdSchema.parse('550e8400-e29b-41d4-a716-446655440000'),
      action,
      context: {
        credentials: {},
        previousResults: {},
      },
    };

    const result = await executeActionRun(payload);

    expect(result.status).toBe('failed');
    expect(result.result?.status).toBe('failure');
    if (result.result?.status === 'failure') {
      expect(result.result.error.message).toContain('Input validation failed');
    }
  });

  it('EXEC-002: resolves simple input references correctly', async () => {
    const action: PlannedAction = {
      id: ActionIdSchema.parse('action-2'),
      actionDefinitionId: 'test-get-user',
      inputs: {
        userId: '${action-1.output.userId}',
      },
      dependencies: [ActionIdSchema.parse('action-1')],
      errorHandling: {
        continueOnFailure: false,
      },
    };

    const payload = {
      executionId: ExecutionIdSchema.parse('550e8400-e29b-41d4-a716-446655440000'),
      action,
      context: {
        credentials: {},
        previousResults: {
          'action-1': JSON.stringify({ output: { userId: '123' } }),
        },
      },
    };

    const result = await executeActionRun(payload);


    expect(result.status).toBe('completed');
    expect(result.result?.status).toBe('success');
    if (result.result?.status === 'success') {
      expect(result.result.output.id).toBe('123');
      expect(result.result.output.name).toBe('John Doe');
    }
  });

  it('EXEC-003: validates output against schema', async () => {
    const action: PlannedAction = {
      id: ActionIdSchema.parse('action-1'),
      actionDefinitionId: 'test-get-user',
      inputs: {
        userId: 'incomplete', // Will return incomplete data
      },
      dependencies: [],
      errorHandling: {
        continueOnFailure: false,
      },
    };

    const payload = {
      executionId: ExecutionIdSchema.parse('550e8400-e29b-41d4-a716-446655440000'),
      action,
      context: {
        credentials: {},
        previousResults: {},
      },
    };

    const result = await executeActionRun(payload);

    expect(result.status).toBe('failed');
    if (result.result?.status === 'failure') {
      expect(result.result.error.message).toContain('Output validation failed');
    }
  });

  it('EXEC-004: handles malformed JSON responses', async () => {
    const action: PlannedAction = {
      id: ActionIdSchema.parse('action-1'),
      actionDefinitionId: 'test-get-user',
      inputs: {
        userId: 'malformed',
      },
      dependencies: [],
      errorHandling: {
        continueOnFailure: false,
      },
    };

    const payload = {
      executionId: ExecutionIdSchema.parse('550e8400-e29b-41d4-a716-446655440000'),
      action,
      context: {
        credentials: {},
        previousResults: {},
      },
    };

    const result = await executeActionRun(payload);

    // Debug malformed JSON
    if (result.result?.status === 'failure') {
      console.log('EXEC-004 error category:', result.result.error.category);
      console.log('EXEC-004 error message:', result.result.error.message);
    }

    expect(result.status).toBe('failed');
    if (result.result?.status === 'failure') {
      expect(result.result.error.category).toBe('api_response_malformed');
    }
  });

  it('EXEC-005: handles 503 service unavailable with retry', async () => {
    // Create a temporary action def that will succeed after retry
    let attemptCount = 0;
    routes['GET /users/retry-test'] = () => {
      attemptCount++;
      if (attemptCount < 3) {
        return new Response('Service Unavailable', { status: 503 });
      }
      return new Response(JSON.stringify({
        id: '123',
        name: 'John Doe',
        email: 'john@example.com',
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    const retryActionDef: ActionDefinition = {
      ...testActionDef,
      id: 'test-retry',
      endpoint: {
        ...testActionDef.endpoint,
        url: `${baseUrl}/users/retry-test`,
      },
    };
    
    registerActionDefinition(retryActionDef);

    const action: PlannedAction = {
      id: ActionIdSchema.parse('action-1'),
      actionDefinitionId: 'test-retry',
      inputs: {
        userId: 'retry-test'  // Add required input
      },
      dependencies: [],
      errorHandling: {
        continueOnFailure: false,
      },
    };

    const payload = {
      executionId: ExecutionIdSchema.parse('550e8400-e29b-41d4-a716-446655440000'),
      action,
      context: {
        credentials: {},
        previousResults: {},
      },
    };

    const result = await executeActionRun(payload);

    // Debug retry
    console.log('EXEC-005 status:', result.status);
    console.log('EXEC-005 attemptCount:', attemptCount);
    if (result.result?.status === 'failure') {
      console.log('EXEC-005 error:', result.result.error);
    }

    expect(result.status).toBe('completed');
    expect(attemptCount).toBe(3);
  });

  it('EXEC-006: handles 429 rate limit responses', async () => {
    const action: PlannedAction = {
      id: ActionIdSchema.parse('action-1'),
      actionDefinitionId: 'test-get-user',
      inputs: {
        userId: '429',
      },
      dependencies: [],
      errorHandling: {
        continueOnFailure: false,
      },
    };

    const payload = {
      executionId: ExecutionIdSchema.parse('550e8400-e29b-41d4-a716-446655440000'),
      action,
      context: {
        credentials: {},
        previousResults: {},
      },
    };

    const result = await executeActionRun(payload);

    expect(result.status).toBe('failed');
    if (result.result?.status === 'failure') {
      expect(result.result.error.category).toBe('rate_limit_burst');
      // Should extract retry-after header
      expect(result.result.error.context?.retryAfter).toBe(60);
    }
  });

  it('EXEC-007: stores execution results via storage provider', async () => {
    const action: PlannedAction = {
      id: ActionIdSchema.parse('action-1'),
      actionDefinitionId: 'test-get-user',
      inputs: {
        userId: '123',
      },
      dependencies: [],
      errorHandling: {
        continueOnFailure: false,
      },
    };

    const payload = {
      executionId: ExecutionIdSchema.parse('550e8400-e29b-41d4-a716-446655440000'),
      action,
      context: {
        credentials: {},
        previousResults: {},
      },
    };

    const result = await executeActionRun(payload);

    expect(result.status).toBe('completed');
    
    // Verify storage was called
    expect(mockStorageProvider.save).toHaveBeenCalled();
    const saveCall = (mockStorageProvider.save as any).mock.calls[0];
    expect(saveCall[0]).toBe('action-outputs');
    expect(saveCall[1]).toContain('action-1');
  });


  it('EXEC-009: respects circuit breaker for repeated failures', async () => {
    // Create a unique action definition for this test to avoid interference
    const circuitBreakerActionDef: ActionDefinition = {
      ...testActionDef,
      id: 'test-circuit-breaker',
      endpoint: {
        ...testActionDef.endpoint,
        url: `${baseUrl}/users/{userId}`,
      },
      retryPolicy: {
        maxAttempts: 1, // No retries to speed up test
        initialDelay: 100,
        maxDelay: 1000,
        backoffMultiplier: 2,
        retryableErrors: [],
        jitter: false,
      },
    };
    
    registerActionDefinition(circuitBreakerActionDef);
    
    // First, ensure circuit breaker is completely reset
    globalCircuitBreaker.resetAll();
    
    // Get hostname for direct circuit breaker manipulation
    const testUrl = new URL(circuitBreakerActionDef.endpoint.url.replace('{userId}', '503'));
    const hostname = testUrl.hostname;
    
    const failAction: PlannedAction = {
      id: ActionIdSchema.parse('action-fail'),
      actionDefinitionId: 'test-circuit-breaker',
      inputs: {
        userId: '503', // This returns 503 Service Unavailable
      },
      dependencies: [],
      errorHandling: {
        continueOnFailure: false,
      },
    };

    // Directly record failures to the circuit breaker to ensure it trips
    // This simulates what would happen after the HTTP client records failures
    for (let i = 0; i < 10; i++) {
      globalCircuitBreaker.recordRequest(hostname, false, 'api_unavailable');
    }
    
    // Check circuit breaker state is now OPEN
    const circuitInfo = globalCircuitBreaker.getCircuitInfo(hostname);
    expect(circuitInfo.state).toBe('OPEN');
    expect(circuitInfo.failureRate).toBe(1.0); // 100% failure rate
    expect(circuitInfo.requestCount).toBe(10);

    // Next request should fail fast due to circuit breaker
    const testPayload = {
      executionId: ExecutionIdSchema.parse('550e8400-e29b-41d4-a716-446655440099'),
      action: {
        ...failAction,
        id: ActionIdSchema.parse('action-blocked'),
      },
      context: {
        credentials: {},
        previousResults: {},
      },
    };

    const result = await executeActionRun(testPayload);
    
    expect(result.status).toBe('failed');
    if (result.result?.status === 'failure') {
      expect(result.result.error.message).toContain('Circuit breaker OPEN');
      expect(result.result.error.code).toBe('CIRCUIT_BREAKER_OPEN');
      expect(result.result.error.retryable).toBe(false);
    }
    
    // Verify the request was blocked before any HTTP call
    // There should be only one HTTP trace entry with the circuit breaker error
    expect(result.httpTrace.length).toBe(1);
    expect(result.httpTrace[0].error?.code).toBe('CIRCUIT_BREAKER_OPEN');
  });

  it('EXEC-010: handles deduplication of identical requests', async () => {
    // Clear deduplication cache to ensure clean state
    clearDeduplicationCache();
    
    // Reset storage mock to count calls accurately
    (mockStorageProvider.save as any).mockClear();
    
    const action: PlannedAction = {
      id: ActionIdSchema.parse('action-dup'),
      actionDefinitionId: 'test-get-user',
      inputs: {
        userId: '123',
      },
      dependencies: [],
      errorHandling: {
        continueOnFailure: false,
      },
    };

    const payload = {
      executionId: ExecutionIdSchema.parse('550e8400-e29b-41d4-a716-446655440000'),
      action,
      context: {
        credentials: {},
        previousResults: {},
      },
    };

    // Track HTTP request count
    let httpRequestCount = 0;
    const originalHandler = routes['GET /users/123'];
    routes['GET /users/123'] = (req) => {
      httpRequestCount++;
      return originalHandler(req);
    };

    try {
      // Submit same request twice in parallel
      const [result1, result2] = await Promise.all([
        executeActionRun(payload),
        executeActionRun(payload),
      ]);

      // Both should complete successfully
      expect(result1.status).toBe('completed');
      expect(result2.status).toBe('completed');
      
      // Both should have the same output
      if (result1.result?.status === 'success' && result2.result?.status === 'success') {
        expect(result1.result.output).toEqual(result2.result.output);
      }
      
      // Only one HTTP request should have been made (deduplication worked)
      expect(httpRequestCount).toBe(1);
      
      // Storage should only be called once for the output
      const saveCalls = (mockStorageProvider.save as any).mock.calls;
      const outputSaveCalls = saveCalls.filter((call: any[]) => 
        call[0] === 'action-outputs' && call[1].includes('action-dup')
      );
      expect(outputSaveCalls.length).toBe(1);
      
      // Verify that one result was cached
      const cacheHit = result1.httpTrace.length === 1 || result2.httpTrace.length === 1;
      const directExecution = result1.httpTrace.length === 1 && result2.httpTrace.length === 1;
      expect(cacheHit || directExecution).toBe(true);
    } finally {
      // Restore original handler
      routes['GET /users/123'] = originalHandler;
    }
  });
});

// Separate test suite for EXEC-008 to ensure proper isolation
describe('Action Executor - Storage Failure Handling', () => {
  // Use a different port to avoid conflicts
  const isolatedServerPort = 9877;
  const isolatedBaseUrl = `http://localhost:${isolatedServerPort}`;
  let isolatedServer: any;
  
  // Test action definition pointing to isolated server
  const isolatedTestActionDef: ActionDefinition = {
    ...testActionDef,
    id: 'isolated-test-action', // Different ID to avoid conflicts
    endpoint: {
      ...testActionDef.endpoint,
      url: `${isolatedBaseUrl}/users/{userId}`,
    },
  };
  
  beforeAll(() => {
    // Start a new test server for this suite
    isolatedServer = Bun.serve({
      port: isolatedServerPort,
      fetch(req) {
        const url = new URL(req.url);
        const key = `${req.method} ${url.pathname}`;
        
        const handler = routes[key];
        if (handler) {
          return handler(req);
        }
        
        return new Response('Not Found', { status: 404 });
      },
    });
  });
  
  beforeEach(() => {
    // Reset circuit breaker state
    globalCircuitBreaker.resetAll();
    
    // Register test action and API catalog only
    registerActionDefinition(isolatedTestActionDef);
    injectApiCatalog(mockApiCatalog);
  });

  afterAll(() => {
    // Stop the isolated server
    isolatedServer?.stop();
    // Restore the normal mock storage provider for other tests
    injectStorageProvider(mockStorageProvider);
  });

  it('EXEC-008: handles storage failures gracefully', async () => {
    // Create a completely new storage provider with failing save
    const failingStorageProvider: StorageProvider = {
      save: mock(() => {
        const error = new Error('Storage quota exceeded');
        (error as any).code = 'ENOSPC';
        throw error;
      }),
      load: mock(async (collection, id) => null),
      exists: mock(async (collection, id) => false),
      list: mock(async (collection, prefix) => []),
      delete: mock(async (collection, id) => true),
      saveBatch: mock(async (operations) =>
        operations.map((op: { collection: string; id: string; data: Buffer }) => ({
          id: op.id,
          checksum: 'mock-checksum',
          size: op.data.length,
          path: `/mock/storage/${op.collection}/${op.id}`,
        })),
      ),
      loadBatch: mock(async (operations) => operations.map(() => null)),
    };
    
    // Inject the failing storage provider
    injectStorageProvider(failingStorageProvider);

    const action: PlannedAction = {
      id: ActionIdSchema.parse('action-1'),
      actionDefinitionId: 'isolated-test-action', // Use the isolated action definition
      inputs: {
        userId: '123',
      },
      dependencies: [],
      errorHandling: {
        continueOnFailure: false,
      },
    };

    const payload = {
      executionId: ExecutionIdSchema.parse('550e8400-e29b-41d4-a716-446655440000'),
      action,
      context: {
        credentials: {},
        previousResults: {},
      },
    };

    const result = await executeActionRun(payload);

    // Action should still complete even if storage fails
    expect(result.status).toBe('completed');
    expect(result.result?.status).toBe('success');
    
    // Output location should indicate ephemeral storage
    if (result.result?.status === 'success' && result.result.outputLocation) {
      expect(result.result.outputLocation.provider).toBe('ephemeral');
      expect(result.result.outputLocation.metadata?.storageFailure).toBe(true);
      expect(result.result.outputLocation.metadata?.storageError).toContain('quota');
    }
  });
});