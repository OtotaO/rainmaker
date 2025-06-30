import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import { mkdirSync, rmSync } from 'node:fs';
import type { ActionDefinition, PlannedAction } from '@rainmaker/schema/types/execution';
import { createBunExecutor } from '../bun-executor';

// Test storage path
const TEST_STORAGE_PATH = '/tmp/executor-test-storage';

// Helper to create test executor with mocked fetch
function createTestExecutor(mockFetch: ReturnType<typeof mock>) {
  return createBunExecutor({
    storagePath: TEST_STORAGE_PATH,
    defaultTimeout: 5000,
    fetchFn: mockFetch as unknown as typeof fetch,
  });
}

describe('BunExecutor', () => {
  let mockFetch: ReturnType<typeof mock>;

  beforeEach(() => {
    // Create test storage directory
    mkdirSync(TEST_STORAGE_PATH, { recursive: true });

    // Create a fresh mock for each test
    mockFetch = mock();
  });

  afterEach(() => {
    // Clean up test storage
    rmSync(TEST_STORAGE_PATH, { recursive: true, force: true });
  });

  describe('execute', () => {
    const baseAction: PlannedAction = {
      id: 'test-action',
      actionDefinitionId: 'api-call',
      inputs: {},
      dependencies: [],
      errorHandling: {
        continueOnFailure: false,
      },
    };

    const baseDefinition: ActionDefinition = {
      id: 'api-call',
      name: 'API Call',
      description: 'Test API call',
      endpoint: {
        url: 'https://api.example.com/test',
        method: 'GET',
      },
    };

    it('should execute successful GET request', async () => {
      const executor = createTestExecutor(mockFetch);

      // Setup mock response
      const mockResponse = new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });

      mockFetch.mockResolvedValueOnce(mockResponse);

      const result = await executor.execute(
        baseAction,
        baseDefinition,
        {},
        { executionId: 'exec-1', planId: 'plan-1', actionId: 'test-action' },
      );

      expect(result.status).toBe('success');
      expect(result.output).toEqual({ success: true });
      expect(result.httpTrace).toHaveLength(1);
      expect(result.httpTrace[0]?.request.url).toBe('https://api.example.com/test');
    });

    it('should handle URL parameter substitution', async () => {
      const definition: ActionDefinition = {
        ...baseDefinition,
        endpoint: {
          url: 'https://api.example.com/users/{userId}/posts/{postId}',
          method: 'GET',
        },
      };

      const executor = createTestExecutor(mockFetch);

      const mockResponse = new Response(JSON.stringify({ id: 'post-456' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });

      mockFetch.mockResolvedValueOnce(mockResponse);

      await executor.execute(baseAction, definition, { userId: 123, postId: 'post-456' });

      expect(mockFetch.mock.calls[0]?.[0]).toBe('https://api.example.com/users/123/posts/post-456');
    });

    it('should add authentication headers', async () => {
      const definition: ActionDefinition = {
        ...baseDefinition,
        authentication: {
          type: 'bearer',
          token: 'secret-token',
        },
      };

      const executor = createTestExecutor(mockFetch);

      const mockResponse = new Response(JSON.stringify({}), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });

      mockFetch.mockResolvedValueOnce(mockResponse);

      await executor.execute(baseAction, definition, {});

      const fetchCall = mockFetch.mock.calls[0];
      expect(fetchCall?.[1]?.headers?.Authorization).toBe('Bearer secret-token');
    });

    it('should handle request body for POST requests', async () => {
      const definition: ActionDefinition = {
        ...baseDefinition,
        endpoint: {
          url: 'https://api.example.com/users',
          method: 'POST',
        },
      };

      const executor = createTestExecutor(mockFetch);

      const mockResponse = new Response(JSON.stringify({ id: 'user-123' }), {
        status: 201,
        headers: { 'content-type': 'application/json' },
      });

      mockFetch.mockResolvedValueOnce(mockResponse);

      await executor.execute(baseAction, definition, {
        'body.name': 'John Doe',
        'body.email': 'john@example.com',
      });

      const fetchCall = mockFetch.mock.calls[0];
      expect(fetchCall?.[1]?.method).toBe('POST');
      expect(fetchCall?.[1]?.body).toBe(
        JSON.stringify({
          name: 'John Doe',
          email: 'john@example.com',
        }),
      );
      expect(fetchCall?.[1]?.headers?.['Content-Type']).toBe('application/json');
    });

    it('should retry on retryable failures', async () => {
      const executor = createTestExecutor(mockFetch);

      const error500 = new Response('Internal Server Error', {
        status: 500,
        headers: { 'content-type': 'text/plain' },
      });

      const successResponse = new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });

      mockFetch.mockResolvedValueOnce(error500).mockResolvedValueOnce(successResponse);

      const result = await executor.execute(baseAction, baseDefinition, {});

      expect(result.status).toBe('success');
      expect(mockFetch.mock.calls).toHaveLength(2);
      expect(result.httpTrace).toHaveLength(2);
    });

    it('should fail after max retries', async () => {
      const executor = createTestExecutor(mockFetch);

      // Mock implementation that returns a new Response each time
      mockFetch.mockImplementation(() =>
        Promise.resolve(
          new Response('Internal Server Error', {
            status: 500,
            headers: { 'content-type': 'text/plain' },
          }),
        ),
      );

      const result = await executor.execute(baseAction, baseDefinition, {});

      expect(result.status).toBe('failure');
      expect(result.error?.category).toBe('api_unexpected_status');
      expect(result.retryable).toBe(true); // Result indicates error was retryable
      expect(mockFetch.mock.calls).toHaveLength(3); // 3 attempts total (maxAttempts default)
    });

    it('should not retry on non-retryable failures', async () => {
      const executor = createTestExecutor(mockFetch);

      const error401 = new Response('Unauthorized', {
        status: 401,
        headers: { 'content-type': 'text/plain' },
      });

      mockFetch.mockResolvedValueOnce(error401);

      const result = await executor.execute(baseAction, baseDefinition, {});

      expect(result.status).toBe('failure');
      expect(result.error?.category).toBe('auth_invalid');
      expect(result.retryable).toBe(false);
      expect(mockFetch.mock.calls).toHaveLength(1); // No retry
    });

    it('should handle binary responses', async () => {
      const executor = createTestExecutor(mockFetch);

      const binaryData = new Uint8Array([0x89, 0x50, 0x4e, 0x47]); // PNG header
      const mockResponse = new Response(binaryData, {
        status: 200,
        headers: { 'content-type': 'image/png' },
      });

      mockFetch.mockResolvedValueOnce(mockResponse);

      const result = await executor.execute(baseAction, baseDefinition, {});

      expect(result.status).toBe('success');
      expect(result.output?.['stored']).toBe(true);
      expect(result.output?.['contentType']).toBe('image/png');
      expect(result.storageLocation?.provider).toBe('local');
      expect(result.storageLocation?.path).toContain(TEST_STORAGE_PATH);
    });

    it('should handle network errors', async () => {
      const executor = createTestExecutor(mockFetch);

      mockFetch.mockRejectedValueOnce(new TypeError('fetch failed'));

      const result = await executor.execute(baseAction, baseDefinition, {});

      expect(result.status).toBe('failure');
      expect(result.error?.category).toBe('network_connection_refused');
      expect(result.retryable).toBe(true);
    });

    it('should respect timeout', async () => {
      const executor = createTestExecutor(mockFetch);

      const definition: ActionDefinition = {
        ...baseDefinition,
        endpoint: {
          ...baseDefinition.endpoint,
          timeout: 100,
        },
      };

      // Mock a timeout - AbortSignal throws DOMException
      mockFetch.mockRejectedValueOnce(new Error('The operation was aborted'));

      const result = await executor.execute(baseAction, definition, {});

      expect(result.status).toBe('failure');
      expect(result.error?.message).toBeDefined();
    });
  });
});
