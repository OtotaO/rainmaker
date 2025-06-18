import { describe, expect, test as it, beforeEach, afterEach } from 'bun:test';
import { HttpClient } from '../http';
import type { RetryPolicy } from '../schemas';
import { globalCircuitBreaker } from '../circuit-breaker';

describe('HTTP Client Memory Safety', () => {
  let server: any;
  let serverPort: number;
  
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
    // Reset circuit breaker to prevent test interference
    globalCircuitBreaker.resetAll();
  });

  afterEach(() => {
    if (server) {
      server.stop();
      server = null;
    }
  });

  describe('response size limits', () => {
    it('rejects responses exceeding maxResponseSize', async () => {
      // Server sends 100MB response
      server = Bun.serve({
        port: serverPort,
        async fetch(req) {
          // Create a readable stream that generates 100MB of data
          const totalSize = 100 * 1024 * 1024;
          const chunkSize = 1024 * 1024; // 1MB chunks
          let sent = 0;
          
          const stream = new ReadableStream({
            async pull(controller) {
              if (sent >= totalSize) {
                controller.close();
                return;
              }
              
              const chunk = new Uint8Array(Math.min(chunkSize, totalSize - sent)).fill(120); // 'x'
              controller.enqueue(chunk);
              sent += chunk.length;
            }
          });
          
          return new Response(stream, {
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': '104857600', // 100MB
            },
          });
        },
      });

      const client = new HttpClient({
        timeout: 5000,
        maxResponseSize: 50 * 1024 * 1024, // 50MB limit
      });

      const result = await client.executeWithRetry(
        {
          url: `http://localhost:${serverPort}/large`,
          method: 'GET',
        },
        defaultRetryPolicy
      );

      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('maxContentLength');
      expect(result.response).toBeUndefined();
    });

    it('accepts responses within size limit', async () => {
      const responseData = { data: 'a'.repeat(1000) }; // Small response
      
      server = Bun.serve({
        port: serverPort,
        fetch(req) {
          const body = JSON.stringify(responseData);
          return new Response(body, {
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': body.length.toString(),
            },
          });
        },
      });

      const client = new HttpClient({
        timeout: 5000,
        maxResponseSize: 50 * 1024 * 1024, // 50MB limit
      });

      const result = await client.executeWithRetry(
        {
          url: `http://localhost:${serverPort}/small`,
          method: 'GET',
        },
        defaultRetryPolicy
      );

      expect(result.error).toBeUndefined();
      expect(result.response?.data).toEqual(JSON.stringify(responseData));
    });

    it('uses default size limit when not specified', async () => {
      const client = new HttpClient({
        timeout: 5000,
        // maxResponseSize not specified - should use 50MB default
      });

      // Verify the default was applied
      expect(client['config'].maxResponseSize).toBe(50 * 1024 * 1024);
    });
  });

  describe('trace truncation', () => {
    it('truncates large response bodies in trace', async () => {
      const largeData = 'x'.repeat(5000); // 5KB of data
      
      server = Bun.serve({
        port: serverPort,
        fetch(req) {
          return new Response(largeData, {
            headers: { 'Content-Type': 'text/plain' },
          });
        },
      });

      const client = new HttpClient({
        timeout: 5000,
      });

      const result = await client.executeWithRetry(
        {
          url: `http://localhost:${serverPort}/trace-test`,
          method: 'GET',
        },
        defaultRetryPolicy
      );

      expect(result.error).toBeUndefined();
      expect(result.trace).toHaveLength(1);
      
      const trace = result.trace[0];
      expect(trace.response?.body).toContain('... [truncated');
      expect(trace.response?.body.length).toBeLessThan(2000); // Well under 5KB
    });

    it('truncates error response bodies in trace', async () => {
      const largeError = { error: 'x'.repeat(5000) };
      
      server = Bun.serve({
        port: serverPort,
        fetch(req) {
          return new Response(JSON.stringify(largeError), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          });
        },
      });

      const client = new HttpClient({
        timeout: 5000,
      });

      const result = await client.executeWithRetry(
        {
          url: `http://localhost:${serverPort}/error-trace`,
          method: 'GET',
        },
        defaultRetryPolicy
      );

      expect(result.error).toBeDefined();
      expect(result.trace.length).toBeGreaterThanOrEqual(1);
      
      // Check the last trace entry (could have retries)
      const trace = result.trace[result.trace.length - 1];
      expect(trace.response?.body).toContain('... [truncated');
      expect(trace.response?.body.length).toBeLessThan(2000);
    });

    it('does not truncate small response bodies', async () => {
      const smallData = { message: 'Hello, World!' };
      
      server = Bun.serve({
        port: serverPort,
        fetch(req) {
          return new Response(JSON.stringify(smallData), {
            headers: { 'Content-Type': 'application/json' },
          });
        },
      });

      const client = new HttpClient({
        timeout: 5000,
      });

      const result = await client.executeWithRetry(
        {
          url: `http://localhost:${serverPort}/small-trace`,
          method: 'GET',
        },
        defaultRetryPolicy
      );

      expect(result.error).toBeUndefined();
      expect(result.trace).toHaveLength(1);
      
      const trace = result.trace[0];
      expect(trace.response?.body).toBe(JSON.stringify(smallData));
      expect(trace.response?.body).not.toContain('truncated');
    });
  });

  describe('memory efficiency', () => {
    it('handles multiple large responses without memory leak', async () => {
      // This test verifies that trace truncation prevents memory accumulation
      const responseSize = 1024 * 1024; // 1MB per response
      const numRequests = 10;
      
      let requestCount = 0;
      server = Bun.serve({
        port: serverPort,
        fetch(req) {
          requestCount++;
          return new Response('x'.repeat(responseSize), {
            headers: { 'Content-Type': 'text/plain' },
          });
        },
      });

      const client = new HttpClient({
        timeout: 5000,
      });

      // Make multiple requests
      for (let i = 0; i < numRequests; i++) {
        const result = await client.executeWithRetry(
          {
            url: `http://localhost:${serverPort}/request-${i}`,
            method: 'GET',
          },
          defaultRetryPolicy
        );
        
        expect(result.error).toBeUndefined();
        // Each trace should have truncated body
        expect(result.trace[0].response?.body).toContain('truncated');
      }
      
      expect(requestCount).toBe(numRequests);
      
      // If trace truncation is working, total memory for traces should be small
      // Each truncated trace is ~1KB, so 10 requests = ~10KB vs 10MB without truncation
    });
  });

  describe('edge cases', () => {
    it('handles responses with no Content-Length header', async () => {
      server = Bun.serve({
        port: serverPort,
        fetch(req) {
          return new Response(JSON.stringify({ data: 'test' }), {
            headers: { 'Content-Type': 'application/json' },
            // No Content-Length header
          });
        },
      });

      const client = new HttpClient({
        timeout: 5000,
      });

      const result = await client.executeWithRetry(
        {
          url: `http://localhost:${serverPort}/no-length`,
          method: 'GET',
        },
        defaultRetryPolicy
      );

      expect(result.error).toBeUndefined();
      expect(result.response?.data).toEqual(JSON.stringify({ data: 'test' }));
    });

    it('handles chunked transfer encoding', async () => {
      server = Bun.serve({
        port: serverPort,
        async fetch(req) {
          // Create a stream that sends data in chunks
          const stream = new ReadableStream({
            async start(controller) {
              controller.enqueue(new TextEncoder().encode(JSON.stringify({ part: 1 })));
              await new Promise(resolve => setTimeout(resolve, 10));
              controller.enqueue(new TextEncoder().encode(JSON.stringify({ part: 2 })));
              controller.close();
            }
          });
          
          return new Response(stream, {
            headers: {
              'Content-Type': 'application/json',
              'Transfer-Encoding': 'chunked',
            },
          });
        },
      });

      const client = new HttpClient({
        timeout: 5000,
      });

      const result = await client.executeWithRetry(
        {
          url: `http://localhost:${serverPort}/chunked`,
          method: 'GET',
        },
        defaultRetryPolicy
      );

      expect(result.error).toBeUndefined();
      // Axios should handle chunked encoding transparently
      expect(result.response?.data).toBeDefined();
    });

    it('enforces size limit even without Content-Length header', async () => {
      server = Bun.serve({
        port: serverPort,
        async fetch(req) {
          // Try to send 60MB without declaring size
          const totalSize = 60 * 1024 * 1024; // 60MB
          const chunkSize = 1024 * 1024; // 1MB chunks
          let sent = 0;
          
          const stream = new ReadableStream({
            async pull(controller) {
              if (sent >= totalSize) {
                controller.close();
                return;
              }
              
              const chunk = new Uint8Array(Math.min(chunkSize, totalSize - sent)).fill(121); // 'y'
              controller.enqueue(chunk);
              sent += chunk.length;
            }
          });
          
          return new Response(stream, {
            headers: {
              'Content-Type': 'text/plain',
              // No Content-Length header - streaming response
            },
          });
        },
      });

      const client = new HttpClient({
        timeout: 5000,
        maxResponseSize: 50 * 1024 * 1024, // 50MB limit
      });

      const result = await client.executeWithRetry(
        {
          url: `http://localhost:${serverPort}/no-length-large`,
          method: 'GET',
        },
        defaultRetryPolicy
      );

      // Should still enforce the limit
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('maxContentLength');
    });
  });
});