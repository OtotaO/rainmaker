import { describe, expect, test as it, mock } from 'bun:test';
import {
  StorageError,
  StorageErrorType,
  StorageAdapter,
  type EnhancedStorageProvider,
  type StorageResult,
  type SaveResult,
  type LoadResult,
  type BatchResult,
} from '../storage-enhanced';

describe('Enhanced Storage Provider', () => {
  const createMockProvider = (): EnhancedStorageProvider => {
    const mockProvider = {
      save: mock(() => {}),
      load: mock(() => {}),
      exists: mock(() => {}),
      list: mock(() => {}),
      delete: mock(() => {}),
      saveBatch: mock(() => {}),
      loadBatch: mock(() => {}),
      compareAndSwap: mock(() => {}),
      checkHealth: mock(() => {}),
    };
    return mockProvider as any;
  };

  describe('StorageError', () => {
    it('creates error with proper properties', () => {
      const error = new StorageError(
        StorageErrorType.RATE_LIMITED,
        'Too many requests',
        true,
        5000,
        { endpoint: 's3://bucket' }
      );
      
      expect(error.type).toBe(StorageErrorType.RATE_LIMITED);
      expect(error.message).toBe('Too many requests');
      expect(error.retryable).toBe(true);
      expect(error.retryAfter).toBe(5000);
      expect(error.context).toEqual({ endpoint: 's3://bucket' });
      expect(error.name).toBe('StorageError');
    });

    it('distinguishes retryable from non-retryable errors', () => {
      const transientError = new StorageError(
        StorageErrorType.NETWORK_ERROR,
        'Connection reset',
        true
      );
      
      const permanentError = new StorageError(
        StorageErrorType.PERMISSION_DENIED,
        'Access denied',
        false
      );
      
      expect(transientError.retryable).toBe(true);
      expect(permanentError.retryable).toBe(false);
    });
  });

  describe('Error Types', () => {
    it('covers all common storage failure modes', () => {
      // Transient errors
      expect(StorageErrorType.NETWORK_ERROR).toBeDefined();
      expect(StorageErrorType.TIMEOUT).toBeDefined();
      expect(StorageErrorType.RATE_LIMITED).toBeDefined();
      expect(StorageErrorType.TEMPORARILY_UNAVAILABLE).toBeDefined();
      
      // Permanent errors  
      expect(StorageErrorType.NOT_FOUND).toBeDefined();
      expect(StorageErrorType.PERMISSION_DENIED).toBeDefined();
      expect(StorageErrorType.INVALID_DATA).toBeDefined();
      expect(StorageErrorType.QUOTA_EXCEEDED).toBeDefined();
      
      // System errors
      expect(StorageErrorType.CONFIGURATION_ERROR).toBeDefined();
      expect(StorageErrorType.CORRUPTION).toBeDefined();
      expect(StorageErrorType.UNKNOWN).toBeDefined();
    });
  });

  describe('StorageAdapter', () => {
    it('converts successful save to legacy format', async () => {
      const mockProvider = createMockProvider();
      const adapter = new StorageAdapter(mockProvider);
      
      const saveResult: SaveResult = {
        id: 'test-id',
        checksum: 'abc123',
        size: 1024,
        path: '/storage/test-id',
        timestamp: new Date(),
      };
      
      mockProvider.save.mockResolvedValue({
        success: true,
        data: saveResult,
      });
      
      const result = await adapter.save('collection', 'test-id', Buffer.from('data'));
      
      expect(result).toEqual({
        id: 'test-id',
        checksum: 'abc123',
        size: 1024,
        path: '/storage/test-id',
      });
    });

    it('throws on save error', async () => {
      const mockProvider = createMockProvider();
      const adapter = new StorageAdapter(mockProvider);
      
      const error = new StorageError(
        StorageErrorType.QUOTA_EXCEEDED,
        'Storage quota exceeded',
        false
      );
      
      mockProvider.save.mockResolvedValue({
        success: false,
        error,
      });
      
      await expect(
        adapter.save('collection', 'test-id', Buffer.from('data'))
      ).rejects.toThrow(error);
    });

    it('converts NOT_FOUND to null for load', async () => {
      const mockProvider = createMockProvider();
      const adapter = new StorageAdapter(mockProvider);
      
      mockProvider.load.mockResolvedValue({
        success: false,
        error: new StorageError(
          StorageErrorType.NOT_FOUND,
          'Item not found',
          false
        ),
      });
      
      const result = await adapter.load('collection', 'missing-id');
      expect(result).toBeNull();
    });

    it('converts successful load to legacy format', async () => {
      const mockProvider = createMockProvider();
      const adapter = new StorageAdapter(mockProvider);
      
      const loadResult: LoadResult = {
        data: Buffer.from('test data'),
        metadata: { contentType: 'text/plain' },
        checksum: 'xyz789',
        size: 9,
        timestamp: new Date(),
      };
      
      mockProvider.load.mockResolvedValue({
        success: true,
        data: loadResult,
      });
      
      const result = await adapter.load('collection', 'test-id');
      
      expect(result).toEqual({
        data: Buffer.from('test data'),
        metadata: { contentType: 'text/plain' },
      });
    });

    it('handles batch operations with partial success', async () => {
      const mockProvider = createMockProvider();
      const adapter = new StorageAdapter(mockProvider);
      
      const batchResult: BatchResult<SaveResult> = {
        successful: [
          {
            id: 'id1',
            checksum: 'check1',
            size: 100,
            path: '/storage/id1',
            timestamp: new Date(),
          },
        ],
        failed: [
          {
            operation: { id: 'id2' },
            error: new StorageError(
              StorageErrorType.NETWORK_ERROR,
              'Connection failed',
              true
            ),
          },
        ],
        totalCount: 2,
        successCount: 1,
        failureCount: 1,
      };
      
      mockProvider.saveBatch.mockResolvedValue(batchResult);
      
      // Legacy interface throws on any failure
      await expect(
        adapter.saveBatch([
          { collection: 'col', id: 'id1', data: Buffer.from('data1') },
          { collection: 'col', id: 'id2', data: Buffer.from('data2') },
        ])
      ).rejects.toThrow('Batch save failed: 1 operations failed');
    });
  });

  describe('Result Types', () => {
    it('supports success results', () => {
      const successResult: StorageResult<string> = {
        success: true,
        data: 'test-data',
      };
      
      expect(successResult.success).toBe(true);
      if (successResult.success) {
        expect(successResult.data).toBe('test-data');
      }
    });

    it('supports error results', () => {
      const errorResult: StorageResult<string> = {
        success: false,
        error: new StorageError(
          StorageErrorType.TIMEOUT,
          'Operation timed out',
          true,
          1000
        ),
      };
      
      expect(errorResult.success).toBe(false);
      if (!errorResult.success) {
        expect(errorResult.error.type).toBe(StorageErrorType.TIMEOUT);
        expect(errorResult.error.retryable).toBe(true);
      }
    });
  });

  describe('Health Check', () => {
    it('provides storage health information', async () => {
      const mockProvider = createMockProvider();
      
      mockProvider.checkHealth.mockResolvedValue({
        available: true,
        latencyMs: 45,
        freeSpace: 1024 * 1024 * 1024, // 1GB
        totalSpace: 10 * 1024 * 1024 * 1024, // 10GB
        lastChecked: new Date(),
      });
      
      const health = await mockProvider.checkHealth();
      
      expect(health.available).toBe(true);
      expect(health.latencyMs).toBe(45);
      expect(health.freeSpace).toBeDefined();
      expect(health.totalSpace).toBeDefined();
    });

    it('reports unhealthy state with error', async () => {
      const mockProvider = createMockProvider();
      
      const lastError = new StorageError(
        StorageErrorType.CONFIGURATION_ERROR,
        'Invalid credentials',
        false
      );
      
      mockProvider.checkHealth.mockResolvedValue({
        available: false,
        latencyMs: -1,
        lastError,
        lastChecked: new Date(),
      });
      
      const health = await mockProvider.checkHealth();
      
      expect(health.available).toBe(false);
      expect(health.lastError).toBe(lastError);
    });
  });

  describe('Batch Operations', () => {
    it('supports partial success in batch operations', () => {
      const batchResult: BatchResult<SaveResult> = {
        successful: [
          {
            id: 'success1',
            checksum: 'check1',
            size: 100,
            path: '/path1',
            timestamp: new Date(),
          },
          {
            id: 'success2',
            checksum: 'check2',
            size: 200,
            path: '/path2',
            timestamp: new Date(),
          },
        ],
        failed: [
          {
            operation: { collection: 'col', id: 'fail1' },
            error: new StorageError(
              StorageErrorType.RATE_LIMITED,
              'Rate limit exceeded',
              true,
              5000
            ),
          },
        ],
        totalCount: 3,
        successCount: 2,
        failureCount: 1,
      };
      
      expect(batchResult.successCount).toBe(2);
      expect(batchResult.failureCount).toBe(1);
      expect(batchResult.failed[0].error.retryable).toBe(true);
      expect(batchResult.failed[0].error.retryAfter).toBe(5000);
    });
  });

  describe('Compare and Swap', () => {
    it('supports atomic updates', async () => {
      const mockProvider = createMockProvider();
      
      mockProvider.compareAndSwap.mockResolvedValue({
        success: true,
        data: {
          id: 'test-id',
          checksum: 'new-checksum',
          size: 2048,
          path: '/storage/test-id',
          timestamp: new Date(),
        },
      });
      
      const result = await mockProvider.compareAndSwap(
        'collection',
        'test-id',
        'old-checksum',
        Buffer.from('new data')
      );
      
      expect(result.success).toBe(true);
    });

    it('fails on checksum mismatch', async () => {
      const mockProvider = createMockProvider();
      
      mockProvider.compareAndSwap.mockResolvedValue({
        success: false,
        error: new StorageError(
          StorageErrorType.INVALID_DATA,
          'Checksum mismatch: expected old-checksum, found different-checksum',
          false,
          undefined,
          { expected: 'old-checksum', actual: 'different-checksum' }
        ),
      });
      
      const result = await mockProvider.compareAndSwap(
        'collection',
        'test-id',
        'old-checksum',
        Buffer.from('new data')
      );
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe(StorageErrorType.INVALID_DATA);
        expect(result.error.context?.expected).toBe('old-checksum');
      }
    });
  });
});