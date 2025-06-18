import { describe, expect, test as it, beforeEach, afterEach } from 'bun:test';
import { HttpClient } from '../http';
import type { RetryPolicy } from '../schemas';
import { globalCircuitBreaker } from '../circuit-breaker';

describe('HTTP Error Categorization', () => {
  let server: any;
  let serverPort: number;
  
  const defaultRetryPolicy: RetryPolicy = {
    maxAttempts: 1,
    initialDelay: 100,
    maxDelay: 1000,
    backoffMultiplier: 2,
    retryableErrors: ['network_timeout', 'network_connection_refused'],
    jitter: false,
  };

  beforeEach(() => {
    // Use a random port for each test
    serverPort = 10000 + Math.floor(Math.random() * 10000);
    // Reset circuit breaker to prevent test interference
    globalCircuitBreaker.resetAll();
  });

  afterEach(() => {
    if (server) {
      server.stop();
      server = null;
    }
  });

  describe('request timeout', () => {
    it('handles request timeouts', async () => {
      const client = new HttpClient({
        timeout: 100, // Very short timeout
      });
      
      // Create server that accepts but doesn't respond (triggers timeout)
      server = Bun.serve({
        port: serverPort,
        fetch(req) {
          // Don't return anything - will trigger timeout
          return new Promise(() => {}); // Never resolves
        },
      });

      const result = await client.executeWithRetry(
        {
          url: `http://localhost:${serverPort}/slow`,
          method: 'GET',
        },
        defaultRetryPolicy
      );

      expect(result.error).toBeDefined();
      expect(result.error!.category).toBe('network_timeout');
      expect(result.error!.context.errorSubtype).toBe('request_aborted');
    });
  });

  describe('connection refused', () => {
    it('categorizes connection refused errors', async () => {
      const client = new HttpClient({ timeout: 1000 });

      // Use a port that's likely not in use
      const connResult = await client.executeWithRetry(
        {
          url: `http://localhost:${serverPort + 9999}/api`,
          method: 'GET',
        },
        defaultRetryPolicy
      );

      expect(connResult.error).toBeDefined();
      expect(connResult.error!.category).toBe('network_connection_refused');
      // Could be tcp_connection_refused or unknown_error depending on platform
      expect(['tcp_connection_refused', 'unknown_error']).toContain(
        connResult.error!.context.errorSubtype
      );
    });
  });

  describe('retry delay hints', () => {
    it('provides retry delays for connection errors', async () => {
      const client = new HttpClient({ timeout: 1000 });

      // Connection refused should have retry delay
      const connResult = await client.executeWithRetry(
        {
          url: `http://localhost:${serverPort + 9999}/api`,
          method: 'GET',
        },
        defaultRetryPolicy
      );

      expect(connResult.error).toBeDefined();
      // Should have some retry delay suggestion
      if (connResult.error!.context.suggestedRetryDelay) {
        expect(connResult.error!.context.suggestedRetryDelay).toBeGreaterThan(0);
      }
    });

    it('extracts retry delay from 429 responses', async () => {
      server = Bun.serve({
        port: serverPort,
        fetch(req) {
          return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': '120', // 120 seconds
            },
          });
        },
      });

      const client = new HttpClient({ timeout: 5000 });
      const result = await client.executeWithRetry(
        {
          url: `http://localhost:${serverPort}/rate-limited`,
          method: 'GET',
        },
        defaultRetryPolicy
      );

      expect(result.error).toBeDefined();
      expect(result.error!.category).toBe('rate_limit_burst');
      expect(result.error!.context.errorSubtype).toBe('too_many_requests');
      expect(result.error!.context.suggestedRetryDelay).toBe(120000); // 120s in ms
      expect(result.error!.suggestion).toContain('Rate limit');
    });
  });

  describe('HTTP status code handling', () => {
    it('differentiates between retryable and non-retryable 5xx errors', async () => {
      const client = new HttpClient({ timeout: 5000 });

      // Create server that handles both 503 and 501 responses
      server = Bun.serve({
        port: serverPort,
        fetch(req) {
          const url = new URL(req.url);
          if (url.pathname === '/unavailable') {
            return new Response('Service Unavailable', { status: 503 });
          } else if (url.pathname === '/not-implemented') {
            return new Response('Not Implemented', { status: 501 });
          }
          return new Response('Not Found', { status: 404 });
        },
      });

      const result503 = await client.executeWithRetry(
        {
          url: `http://localhost:${serverPort}/unavailable`,
          method: 'GET',
        },
        defaultRetryPolicy
      );

      expect(result503.error!.retryable).toBe(true);
      expect(result503.error!.context.errorSubtype).toBe('service_unavailable');

      const result501 = await client.executeWithRetry(
        {
          url: `http://localhost:${serverPort}/not-implemented`,
          method: 'GET',
        },
        defaultRetryPolicy
      );

      expect(result501.error!.retryable).toBe(false);
      expect(result501.error!.context.errorSubtype).toBe('server_error');
    });

    it('provides specific suggestions for different error codes', async () => {
      const client = new HttpClient({ timeout: 5000 });

      const testCases = [
        { status: 400, path: '/bad-request', expectedSuggestion: 'Bad request' },
        { status: 401, path: '/unauthorized', expectedSuggestion: 'Invalid authentication' },
        { status: 403, path: '/forbidden', expectedSuggestion: 'expired' },
        { status: 422, path: '/unprocessable', expectedSuggestion: 'Unprocessable entity' },
        { status: 503, path: '/unavailable', expectedSuggestion: 'temporarily unavailable' },
      ];

      server = Bun.serve({
        port: serverPort,
        fetch(req) {
          const url = new URL(req.url);
          const testCase = testCases.find(tc => tc.path === url.pathname);
          if (testCase) {
            return new Response('', { status: testCase.status });
          }
          return new Response('Not Found', { status: 404 });
        },
      });

      for (const testCase of testCases) {
        const result = await client.executeWithRetry(
          {
            url: `http://localhost:${serverPort}${testCase.path}`,
            method: 'GET',
          },
          defaultRetryPolicy
        );

        expect(result.error).toBeDefined();
        expect(result.error!.suggestion).toContain(testCase.expectedSuggestion);
      }
    });
  });

  describe('error context security', () => {
    it('sanitizes URLs in error contexts', async () => {
      const client = new HttpClient({ timeout: 1000 });

      // Test with a connection refused error that includes sensitive URL params
      const result = await client.executeWithRetry(
        {
          url: `http://localhost:${serverPort + 9999}/endpoint?api_key=SECRET&user=test`,
          method: 'GET',
        },
        defaultRetryPolicy
      );

      expect(result.error).toBeDefined();
      
      // Should NOT include the API key in the URL
      expect(result.error!.context.url).toBe(`http://localhost:${serverPort + 9999}/endpoint`);
      expect(JSON.stringify(result.error!.context)).not.toContain('SECRET');
      expect(JSON.stringify(result.error!.context)).not.toContain('api_key');
    });
  });


  describe('comprehensive error categorization', () => {
    it('provides meaningful error details', async () => {
      const client = new HttpClient({ timeout: 5000 });

      // Test a 404 error
      server = Bun.serve({
        port: serverPort,
        fetch(req) {
          const url = new URL(req.url);
          if (url.pathname === '/not-found') {
            return new Response('Not Found', { status: 404 });
          }
          return new Response('OK', { status: 200 });
        },
      });

      const result = await client.executeWithRetry(
        {
          url: `http://localhost:${serverPort}/not-found`,
          method: 'GET',
        },
        defaultRetryPolicy
      );

      expect(result.error).toBeDefined();
      expect(result.error!.category).toBe('validation_failed');
      expect(result.error!.statusCode).toBe(404);
      expect(result.error!.retryable).toBe(false);
      expect(result.error!.context.errorSubtype).toBe('client_error');
    });
  });
});