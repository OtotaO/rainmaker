import { describe, expect, test as it, beforeEach, afterEach } from 'bun:test';
import { HttpClient } from '../http';
import type { RetryPolicy } from '../schemas';
import { globalCircuitBreaker } from '../circuit-breaker';

describe('HTTP Client Security Sanitization', () => {
  let server: any;
  let serverPort: number;
  let receivedHeaders: Record<string, string> = {};
  
  const defaultRetryPolicy: RetryPolicy = {
    maxAttempts: 1,
    initialDelay: 100,
    maxDelay: 1000,
    backoffMultiplier: 2,
    retryableErrors: [],
    jitter: false,
  };

  beforeEach(() => {
    // Use a random port for each test
    serverPort = 10000 + Math.floor(Math.random() * 10000);
    receivedHeaders = {};
    // Reset circuit breaker to prevent test interference
    globalCircuitBreaker.resetAll();
  });

  afterEach(() => {
    if (server) {
      server.stop();
      server = null;
    }
  });

  describe('URL sanitization', () => {
    it('removes API keys from query parameters', async () => {
      // Create test server that captures headers
      server = Bun.serve({
        port: serverPort,
        fetch(req) {
          receivedHeaders = Object.fromEntries(req.headers);
          return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' },
          });
        },
      });
      
      const client = new HttpClient({ timeout: 5000 });
      
      const result = await client.executeWithRetry(
        {
          url: `http://localhost:${serverPort}/api/data?api_key=SECRET123&user=test`,
          method: 'GET',
        },
        defaultRetryPolicy
      );

      expect(result.error).toBeUndefined();
      
      // Check that trace contains sanitized URL
      const trace = result.trace[0];
      expect(trace.request.url).toBe(`http://localhost:${serverPort}/api/data`);
      expect(trace.request.url).not.toContain('SECRET123');
      expect(trace.request.url).not.toContain('api_key');
      
      // Server should still receive the full URL
      expect(receivedHeaders.host).toBe(`localhost:${serverPort}`);
    });

    it('handles malformed URLs safely', async () => {
      const client = new HttpClient({ timeout: 5000 });
      
      // This will fail but we're testing the sanitization
      const result = await client.executeWithRetry(
        {
          url: 'not-a-valid-url',
          method: 'GET',
        },
        defaultRetryPolicy
      );

      expect(result.error).toBeDefined();
      
      // Trace should show sanitized invalid URL
      const trace = result.trace[0];
      expect(trace.request.url).toBe('[invalid-url]');
    });

    it('preserves path structure but removes sensitive data', async () => {
      server = Bun.serve({
        port: serverPort,
        fetch(req) {
          return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' },
          });
        },
      });
      
      const client = new HttpClient({ timeout: 5000 });
      
      const result = await client.executeWithRetry(
        {
          url: `http://localhost:${serverPort}/users/12345/profile?token=ABC123#section`,
          method: 'GET',
        },
        defaultRetryPolicy
      );

      const trace = result.trace[0];
      expect(trace.request.url).toBe(`http://localhost:${serverPort}/users/12345/profile`);
      expect(trace.request.url).not.toContain('token');
      expect(trace.request.url).not.toContain('ABC123');
      expect(trace.request.url).not.toContain('#section');
    });
  });

  describe('header sanitization', () => {
    it('redacts Authorization header', async () => {
      server = Bun.serve({
        port: serverPort,
        fetch(req) {
          receivedHeaders = Object.fromEntries(req.headers);
          return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' },
          });
        },
      });
      
      const client = new HttpClient({ timeout: 5000 });
      
      const result = await client.executeWithRetry(
        {
          url: `http://localhost:${serverPort}/api/protected`,
          method: 'GET',
          headers: {
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
            'Content-Type': 'application/json',
          },
        },
        defaultRetryPolicy
      );

      expect(result.error).toBeUndefined();
      
      // Check trace shows redacted auth
      const trace = result.trace[0];
      expect(trace.request.headers['Authorization']).toBe('[REDACTED]');
      expect(trace.request.headers['Content-Type']).toBe('application/json');
      
      // Server should receive the actual token
      expect(receivedHeaders.authorization).toContain('Bearer');
    });

    it('redacts various API key headers', async () => {
      server = Bun.serve({
        port: serverPort,
        fetch(req) {
          receivedHeaders = Object.fromEntries(req.headers);
          return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' },
          });
        },
      });
      
      const client = new HttpClient({ timeout: 5000 });
      
      const sensitiveHeaders = {
        'X-API-Key': 'secret-key-123',
        'X-Auth-Token': 'auth-token-456',
        'Cookie': 'session=abc123; user=john',
        'X-Secret-Key': 'very-secret',
        'api-key': 'another-secret',
      };
      
      const result = await client.executeWithRetry(
        {
          url: `http://localhost:${serverPort}/api/test`,
          method: 'GET',
          headers: {
            ...sensitiveHeaders,
            'User-Agent': 'TestClient/1.0',
            'Accept': 'application/json',
          },
        },
        defaultRetryPolicy
      );

      const trace = result.trace[0];
      
      // All sensitive headers should be redacted
      for (const [key, _] of Object.entries(sensitiveHeaders)) {
        expect(trace.request.headers[key]).toBe('[REDACTED]');
      }
      
      // Safe headers should be preserved
      expect(trace.request.headers['User-Agent']).toBe('TestClient/1.0');
      expect(trace.request.headers['Accept']).toBe('application/json');
    });

    it('truncates long header values', async () => {
      server = Bun.serve({
        port: serverPort,
        fetch(req) {
          return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' },
          });
        },
      });
      
      const client = new HttpClient({ timeout: 5000 });
      
      const longValue = 'x'.repeat(200);
      
      const result = await client.executeWithRetry(
        {
          url: `http://localhost:${serverPort}/api/test`,
          method: 'GET',
          headers: {
            'X-Custom-Header': longValue,
          },
        },
        defaultRetryPolicy
      );

      const trace = result.trace[0];
      expect(trace.request.headers['X-Custom-Header']).toHaveLength(103); // 100 + '...'
      expect(trace.request.headers['X-Custom-Header']).toEndWith('...');
    });
  });

  describe('response data sanitization', () => {
    it('sanitizes error response data in context', async () => {
      // Create error server
      const errorPort = 10000 + Math.floor(Math.random() * 10000);
      const errorServer = Bun.serve({
        port: errorPort,
        fetch(req) {
          return new Response(JSON.stringify({
            error: 'Internal Server Error',
            error_code: 'INTERNAL_ERROR',
            stack_trace: 'SecretInternalPath/file.js:123',
            internal_user_id: '12345',
            database_connection_string: 'postgres://user:pass@host/db',
          }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          });
        },
      });
      
      try {
        const client = new HttpClient({ timeout: 5000 });
        
        const result = await client.executeWithRetry(
          {
            url: `http://localhost:${errorPort}/api/error`,
            method: 'GET',
          },
          defaultRetryPolicy
        );

        expect(result.error).toBeDefined();
        
        // Check error context is sanitized
        const context = result.error!.context;
        
        // Should only include safe fields
        const responseData = context.responseData;
        expect(responseData).toBeDefined();
        expect(responseData.error).toBe('Internal Server Error');
        expect(responseData.error_code).toBe('INTERNAL_ERROR');
        
        // Should NOT include sensitive fields
        expect(responseData.stack_trace).toBeUndefined();
        expect(responseData.internal_user_id).toBeUndefined();
        expect(responseData.database_connection_string).toBeUndefined();
      } finally {
        errorServer.stop();
      }
    });
  });

  describe('request body sanitization', () => {
    it('truncates large request bodies in trace', async () => {
      server = Bun.serve({
        port: serverPort,
        fetch(req) {
          return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' },
          });
        },
      });
      
      const client = new HttpClient({ timeout: 5000 });
      
      const largeBody = {
        data: 'x'.repeat(2000),
        sensitive: 'password123',
      };
      
      const result = await client.executeWithRetry(
        {
          url: `http://localhost:${serverPort}/api/data`,
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          data: largeBody,
        },
        defaultRetryPolicy
      );

      expect(result.error).toBeUndefined();
      
      const trace = result.trace[0];
      expect(trace.request.body).toBeDefined();
      expect(trace.request.body!).toContain('truncated');
      expect(trace.request.body!.length).toBeLessThan(1500);
    });
  });

  describe('error context security', () => {
    it('uses sanitized URL in error context', async () => {
      // Server that always returns 404
      const notFoundPort = 10000 + Math.floor(Math.random() * 10000);
      const notFoundServer = Bun.serve({
        port: notFoundPort,
        fetch(req) {
          return new Response('Not Found', {
            status: 404,
            headers: { 'Content-Type': 'text/plain' },
          });
        },
      });
      
      try {
        const client = new HttpClient({ timeout: 5000 });
        
        const result = await client.executeWithRetry(
          {
            url: `http://localhost:${notFoundPort}/api/data?secret_token=ABC123`,
            method: 'GET',
          },
          defaultRetryPolicy
        );

        expect(result.error).toBeDefined();
        
        // Error context should have sanitized URL
        expect(result.error!.context.url).toBe(`http://localhost:${notFoundPort}/api/data`);
        expect(result.error!.context.url).not.toContain('secret_token');
        expect(result.error!.context.url).not.toContain('ABC123');
      } finally {
        notFoundServer.stop();
      }
    });
  });

  describe('comprehensive security test', () => {
    it('ensures no sensitive data leaks in any part of trace or error', async () => {
      const secrets = {
        apiKey: 'SECRET_API_KEY_12345',
        token: 'SECRET_TOKEN_67890',
        password: 'SECRET_PASSWORD_ABC',
        sessionId: 'SECRET_SESSION_XYZ',
      };
      
      // Create a server that echoes back some data
      const echoPort = 10000 + Math.floor(Math.random() * 10000);
      const echoServer = Bun.serve({
        port: echoPort,
        fetch(req) {
          return new Response(JSON.stringify({
            error: 'Bad Request',
            provided_api_key: secrets.apiKey, // Server echoes back secret
            internal_error: `Database connection failed for user ${secrets.password}`,
          }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        },
      });
      
      try {
        const client = new HttpClient({ timeout: 5000 });
        
        const result = await client.executeWithRetry(
          {
            url: `http://localhost:${echoPort}/api/secure?api_key=${secrets.apiKey}&token=${secrets.token}`,
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${secrets.token}`,
              'X-API-Key': secrets.apiKey,
              'Cookie': `session=${secrets.sessionId}`,
            },
            data: {
              username: 'testuser',
              password: secrets.password,
            },
          },
          defaultRetryPolicy
        );

        // Convert entire result to string to search for leaks
        const resultStr = JSON.stringify(result);
        
        // None of the secrets should appear in the result
        for (const [name, value] of Object.entries(secrets)) {
          expect(resultStr).not.toContain(value);
        }
        
        // Specific checks
        const trace = result.trace[0];
        
        // URL should be sanitized
        expect(trace.request.url).not.toContain('api_key');
        expect(trace.request.url).not.toContain('token');
        
        // Headers should be redacted
        expect(trace.request.headers['Authorization']).toBe('[REDACTED]');
        expect(trace.request.headers['X-API-Key']).toBe('[REDACTED]');
        expect(trace.request.headers['Cookie']).toBe('[REDACTED]');
        
        // Request body should be truncated (contains password)
        expect(trace.request.body).toBeDefined();
        expect(trace.request.body).not.toContain(secrets.password);
        
        // Error context should be sanitized
        if (result.error?.context.responseData) {
          const responseData = result.error.context.responseData;
          expect(JSON.stringify(responseData)).not.toContain(secrets.apiKey);
          expect(JSON.stringify(responseData)).not.toContain(secrets.password);
        }
      } finally {
        echoServer.stop();
      }
    });
  });
});