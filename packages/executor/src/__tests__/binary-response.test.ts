import { describe, expect, test as it, beforeEach, afterEach, mock } from 'bun:test';
import { executeActionRun } from '../action-executor-jobs';
import { injectStorageProvider, injectApiCatalog, registerActionDefinition } from '../action-executor-jobs';
import type { ExecuteActionPayload } from '../action-executor-jobs';
import type { ActionDefinition, HttpMethod } from '../schemas';
import { globalCircuitBreaker } from '../circuit-breaker';

// Mock dependencies
const mockStorageProvider = {
  save: mock(() => {}).mockResolvedValue({
    path: '/mock/path',
    size: 100,
    checksum: 'mock-checksum',
  }),
  retrieve: mock(() => {}),
  delete: mock(() => {}),
};

const mockApiCatalog = {
  getApiEntry: mock(() => {}).mockResolvedValue(null),
  searchApis: mock(() => {}),
};

const mockLogger = {
  info: mock(() => {}),
  error: mock(() => {}),
};

const mockIo = {
  logger: mockLogger,
  sendEvent: mock(() => {}),
};

describe('Binary Response Handling', () => {
  let server: any;
  let serverPort: number;
  let responseData: any;
  let responseHeaders: Record<string, string>;
  let responseStatus: number;
  let testId: string;

  // Helper to set up mock server response
  const setupMockResponse = async (data: any, headers: Record<string, string> = {}, status: number = 200) => {
    responseData = data;
    responseHeaders = headers;
    responseStatus = status;
    // Give the server a moment to process the update
    await new Promise(resolve => setTimeout(resolve, 50));
  };

  beforeEach(() => {
    // Clear all mocks
    mockStorageProvider.save.mockClear();
    // Reset circuit breaker to prevent test interference
    globalCircuitBreaker.resetAll();
    mockStorageProvider.retrieve.mockClear();
    mockStorageProvider.delete.mockClear();
    mockApiCatalog.getApiEntry.mockClear();
    mockApiCatalog.searchApis.mockClear();
    mockLogger.info.mockClear();
    mockLogger.error.mockClear();
    mockIo.sendEvent.mockClear();
    
    // Use a random port for each test
    serverPort = 10000 + Math.floor(Math.random() * 10000);
    
    // Generate unique test ID
    testId = `binary-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Initialize response data as null
    responseData = null;
    responseHeaders = {};
    responseStatus = 200;
    
    // Create test server
    server = Bun.serve({
      port: serverPort,
      fetch(req) {
        // Return the configured response
        if (responseData instanceof Buffer) {
          return new Response(responseData, {
            status: responseStatus,
            headers: responseHeaders,
          });
        } else if (responseData instanceof ArrayBuffer || responseData instanceof Uint8Array) {
          return new Response(responseData, {
            status: responseStatus,
            headers: responseHeaders,
          });
        } else if (typeof responseData === 'string') {
          return new Response(responseData, {
            status: responseStatus,
            headers: responseHeaders,
          });
        } else if (responseData && typeof responseData === 'object') {
          // For objects that have a toJSON method that throws
          if (responseData.toJSON && typeof responseData.toJSON === 'function') {
            try {
              const jsonStr = JSON.stringify(responseData);
              return new Response(jsonStr, {
                status: responseStatus,
                headers: responseHeaders,
              });
            } catch (e) {
              // Return a response that will trigger the error handling
              // The binary handler will be called with the string '[object Object]'
              // which won't trigger the error we're testing for
              // Instead, we need to pass through the object somehow
              return new Response('[object Object]', {
                status: responseStatus,
                headers: responseHeaders,
              });
            }
          }
          return new Response(JSON.stringify(responseData), {
            status: responseStatus,
            headers: responseHeaders,
          });
        } else {
          // Default empty response
          return new Response('', {
            status: responseStatus,
            headers: responseHeaders,
          });
        }
      },
    });
    
    // Inject mocked dependencies
    injectStorageProvider(mockStorageProvider);
    injectApiCatalog(mockApiCatalog);
    
    // Register test action definition with unique ID
    const actionDef: ActionDefinition = {
      id: testId,
      name: 'Binary Test Action',
      description: 'Test action for binary responses',
      endpoint: {
        url: `http://localhost:${serverPort}/binary`,
        method: 'GET' as HttpMethod,
        headers: {},
      },
      inputSchema: undefined,
      outputSchema: undefined,
      retryPolicy: {
        maxAttempts: 1,
        initialDelay: 1000,
        maxDelay: 5000,
        backoffMultiplier: 2,
        retryableErrors: [],
        jitter: false,
      },
    };
    registerActionDefinition(actionDef);
  });
  
  afterEach(() => {
    if (server) {
      server.stop();
      server = null;
    }
  });

  const createPayload = (): ExecuteActionPayload => ({
    executionId: 'exec-123',
    action: {
      id: 'action-1',
      actionDefinitionId: testId,
      inputs: {},
      dependencies: [],
      retryConfig: {
        maxAttempts: 1,
        backoffMultiplier: 2,
        initialDelayMs: 1000,
      },
    },
    context: {
      credentials: {},
      previousResults: {},
    },
  });

  describe('Buffer handling', () => {
    it('handles Buffer response correctly', async () => {
      const binaryData = Buffer.from('Hello, World!', 'utf8');
      await setupMockResponse(binaryData, { 'Content-Type': 'application/octet-stream' });

      const result = await executeActionRun(createPayload(), mockIo);
      
      expect(result.status).toBe('completed');
      expect(result.result?.status).toBe('success');
      
      // Verify the output was base64 encoded
      const output = result.result?.output as any;
      expect(output.binary).toBe(binaryData.toString('base64'));
      expect(output.contentType).toBe('application/octet-stream');
      expect(output.size).toBe(binaryData.length);
    });

    it('handles ArrayBuffer response', async () => {
      const text = 'Test ArrayBuffer data';
      const arrayBuffer = new ArrayBuffer(text.length);
      const view = new Uint8Array(arrayBuffer);
      for (let i = 0; i < text.length; i++) {
        view[i] = text.charCodeAt(i);
      }
      await setupMockResponse(arrayBuffer, { 'Content-Type': 'application/octet-stream' });

      const result = await executeActionRun(createPayload(), mockIo);
      
      expect(result.status).toBe('completed');
      const output = result.result?.output as any;
      
      // Verify ArrayBuffer was converted correctly
      const decodedBuffer = Buffer.from(output.binary, 'base64');
      expect(decodedBuffer.toString()).toBe(text);
    });

    it('handles Uint8Array response', async () => {
      const data = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
      await setupMockResponse(data, { 'Content-Type': 'application/octet-stream' });

      const result = await executeActionRun(createPayload(), mockIo);
      
      expect(result.status).toBe('completed');
      const output = result.result?.output as any;
      
      // Verify Uint8Array was converted correctly
      const decodedBuffer = Buffer.from(output.binary, 'base64');
      expect(decodedBuffer.toString()).toBe('Hello');
    });
  });

  describe('String handling', () => {
    it('handles base64 string response', async () => {
      const originalData = 'Test data for base64';
      const base64Data = Buffer.from(originalData).toString('base64');
      await setupMockResponse(base64Data, { 'Content-Type': 'application/octet-stream' });

      const result = await executeActionRun(createPayload(), mockIo);
      
      expect(result.status).toBe('completed');
      const output = result.result?.output as any;
      
      // The base64 string should be decoded and re-encoded
      const decodedBuffer = Buffer.from(output.binary, 'base64');
      expect(decodedBuffer.toString()).toBe(originalData);
    });

    it('handles binary string response', async () => {
      const binaryString = '\x00\x01\x02\x03\xFF';
      await setupMockResponse(binaryString, { 'Content-Type': 'application/octet-stream' });

      const result = await executeActionRun(createPayload(), mockIo);
      
      expect(result.status).toBe('completed');
      const output = result.result?.output as any;
      expect(output.binary).toBeDefined();
      expect(output.size).toBeGreaterThan(0);
    });
  });

  describe('Object handling', () => {
    it('handles object response as binary', async () => {
      const objectData = { message: 'This is not JSON content type' };
      await setupMockResponse(objectData, { 'Content-Type': 'application/octet-stream' });

      const result = await executeActionRun(createPayload(), mockIo);
      
      expect(result.status).toBe('completed');
      const output = result.result?.output as any;
      
      // Object should be stringified and encoded
      const decodedBuffer = Buffer.from(output.binary, 'base64');
      const decodedObject = JSON.parse(decodedBuffer.toString());
      expect(decodedObject).toEqual(objectData);
    });
  });

  describe('Error handling', () => {

    it('rejects oversized binary responses', async () => {
      // Create a buffer larger than 50MB (the HTTP client's default limit)
      const largeBuffer = Buffer.alloc(51 * 1024 * 1024);
      await setupMockResponse(largeBuffer, { 'Content-Type': 'application/octet-stream' });

      const result = await executeActionRun(createPayload(), mockIo);
      
      expect(result.status).toBe('failed');
      expect(result.result?.status).toBe('failure');
      expect(result.result?.error?.message).toContain('maxContentLength size of 52428800 exceeded');
    });
  });

  describe('Content type detection', () => {
    it('processes JSON with correct content type', async () => {
      const jsonData = { key: 'value', number: 123 };
      await setupMockResponse(jsonData, { 'Content-Type': 'application/json' });

      const result = await executeActionRun(createPayload(), mockIo);
      
      expect(result.status).toBe('completed');
      const output = result.result?.output as any;
      
      // Should be treated as JSON, not binary
      expect(output).toEqual(jsonData);
      expect(output.binary).toBeUndefined();
    });

    it('processes text with correct content type', async () => {
      const textData = 'This is plain text content';
      await setupMockResponse(textData, { 'Content-Type': 'text/plain' });

      const result = await executeActionRun(createPayload(), mockIo);
      
      expect(result.status).toBe('completed');
      const output = result.result?.output as any;
      
      // Should be treated as text, not binary
      expect(output).toEqual({ text: textData });
      expect(output.binary).toBeUndefined();
    });

    it('treats unknown content types as binary', async () => {
      const data = Buffer.from('Unknown content type data');
      await setupMockResponse(data, { 'Content-Type': 'application/x-custom' });

      const result = await executeActionRun(createPayload(), mockIo);
      
      expect(result.status).toBe('completed');
      const output = result.result?.output as any;
      
      // Should be treated as binary
      expect(output.binary).toBeDefined();
      expect(output.contentType).toBe('application/x-custom');
    });
  });
});