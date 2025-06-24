import { beforeEach, describe, expect, it, mock } from 'bun:test';
import type { ActionDefinition } from '@rainmaker/schema/types/execution';
import { createBunExecutor } from '../bun-executor';
import { executeHttpAction, registerActionDefinition } from '../module-integration';

describe('Module Integration', () => {
  let mockFetch: ReturnType<typeof mock>;
  let testExecutor: ReturnType<typeof createBunExecutor>;

  beforeEach(() => {
    // Create mock fetch
    mockFetch = mock();

    // Create executor with mocked fetch for testing
    testExecutor = createBunExecutor({
      storagePath: '/tmp/test-storage',
      fetchFn: mockFetch as unknown as typeof fetch,
    });
  });

  it('should execute action through integration interface', async () => {
    // Register a test action definition
    const definition: ActionDefinition = {
      id: 'test-api-call',
      name: 'Test API Call',
      description: 'Test action for integration',
      endpoint: {
        url: 'https://api.example.com/data/{id}',
        method: 'GET',
      },
    };
    registerActionDefinition(definition);

    // Mock successful response
    const mockResponse = new Response(JSON.stringify({ result: 'success' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
    mockFetch.mockResolvedValueOnce(mockResponse);

    // Execute through integration interface
    const result = await executeHttpAction({
      actionDefinitionId: 'test-api-call',
      inputs: { id: '123' },
      context: {
        executionId: 'exec-1',
        planId: 'plan-1',
        actionId: 'action-1',
      },
      executor: testExecutor,
    });

    expect(result.status).toBe('completed');
    expect(result.data).toEqual({ result: 'success' });
  });

  it('should throw on action failure', async () => {
    const definition: ActionDefinition = {
      id: 'failing-api',
      name: 'Failing API',
      description: 'Test failing action',
      endpoint: {
        url: 'https://api.example.com/fail',
        method: 'POST',
      },
    };
    registerActionDefinition(definition);

    // Mock error response
    // IMPORTANT: Response bodies can only be consumed once (Fetch API constraint)
    // When mocking multiple calls, use mockImplementation to create fresh Response objects
    mockFetch.mockImplementation(() =>
      Promise.resolve(
        new Response('Internal Server Error', {
          status: 500,
          headers: { 'content-type': 'text/plain' },
        }),
      ),
    );

    // Should throw error for Module 4 to handle
    await expect(
      executeHttpAction({
        actionDefinitionId: 'failing-api',
        inputs: {},
        context: {
          executionId: 'exec-2',
          planId: 'plan-2',
          actionId: 'action-2',
        },
        executor: testExecutor,
      }),
    ).rejects.toThrow('Server error: 500');
  });
});
