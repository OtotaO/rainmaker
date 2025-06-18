/**
 * Enhanced storage provider interface with comprehensive error handling.
 * 
 * This addresses the "Storage Provider Interface Assumptions" issue by:
 * 1. Defining specific error types for different failure modes
 * 2. Providing retry guidance for transient failures
 * 3. Including error context for debugging
 * 4. Supporting graceful degradation strategies
 * 
 * Design principles:
 * - Explicit error types enable proper handling strategies
 * - Transient vs permanent failures are distinguished
 * - Error context aids debugging without leaking sensitive data
 * - Batch operations can partially succeed with detailed results
 * - Storage health can be monitored proactively
 */

/**
 * Storage error types for different failure modes.
 */
export enum StorageErrorType {
  // Transient errors (retryable)
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  RATE_LIMITED = 'RATE_LIMITED',
  TEMPORARILY_UNAVAILABLE = 'TEMPORARILY_UNAVAILABLE',
  
  // Permanent errors (not retryable)
  NOT_FOUND = 'NOT_FOUND',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  INVALID_DATA = 'INVALID_DATA',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  
  // System errors (may or may not be retryable)
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  CORRUPTION = 'CORRUPTION',
  UNKNOWN = 'UNKNOWN',
}

/**
 * Storage error with detailed context.
 */
export class StorageError extends Error {
  constructor(
    public type: StorageErrorType,
    message: string,
    public retryable: boolean,
    public retryAfter?: number, // Milliseconds to wait before retry
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = 'StorageError';
  }
}

/**
 * Result of a storage operation that can succeed or fail.
 */
export type StorageResult<T> = 
  | { success: true; data: T }
  | { success: false; error: StorageError };

/**
 * Successful save result with metadata.
 */
export interface SaveResult {
  id: string;
  checksum: string;
  size: number;
  path: string;
  timestamp: Date;
  ttl?: number; // Time to live in seconds
}

/**
 * Load result with data and metadata.
 */
export interface LoadResult {
  data: Buffer;
  metadata: Record<string, string>;
  checksum: string;
  size: number;
  timestamp: Date;
}

/**
 * Batch operation result with partial success support.
 */
export interface BatchResult<T> {
  successful: T[];
  failed: Array<{
    operation: any;
    error: StorageError;
  }>;
  totalCount: number;
  successCount: number;
  failureCount: number;
}

/**
 * Storage health status for monitoring.
 */
export interface StorageHealth {
  available: boolean;
  latencyMs: number;
  freeSpace?: number;
  totalSpace?: number;
  lastError?: StorageError;
  lastChecked: Date;
}

/**
 * Enhanced storage provider interface with error handling.
 * 
 * Key improvements:
 * 1. All operations return Result types with explicit errors
 * 2. Batch operations support partial success
 * 3. Health checks enable proactive monitoring
 * 4. Retry guidance through error types
 * 5. Atomic operations for consistency
 */
export interface EnhancedStorageProvider {
  /**
   * Save data with error handling.
   * 
   * @param collection The collection/bucket name
   * @param id Unique identifier
   * @param data Binary data to store
   * @param options Save options (TTL, metadata, etc.)
   * @returns Result with save metadata or error
   */
  save(
    collection: string, 
    id: string, 
    data: Buffer,
    options?: {
      ttl?: number;
      metadata?: Record<string, string>;
      overwrite?: boolean;
    }
  ): Promise<StorageResult<SaveResult>>;
  
  /**
   * Load data with error handling.
   * 
   * @param collection The collection/bucket name
   * @param id Unique identifier
   * @returns Result with data or error (NOT_FOUND if missing)
   */
  load(
    collection: string, 
    id: string
  ): Promise<StorageResult<LoadResult>>;
  
  /**
   * Check existence with error handling.
   * 
   * @param collection The collection/bucket name
   * @param id Unique identifier
   * @returns Result with boolean or error
   */
  exists(
    collection: string, 
    id: string
  ): Promise<StorageResult<boolean>>;
  
  /**
   * List items with pagination and error handling.
   * 
   * @param collection The collection/bucket name
   * @param options List options
   * @returns Result with item list or error
   */
  list(
    collection: string,
    options?: {
      prefix?: string;
      limit?: number;
      continuationToken?: string;
    }
  ): Promise<StorageResult<{
    items: string[];
    continuationToken?: string;
    hasMore: boolean;
  }>>;
  
  /**
   * Delete item with error handling.
   * 
   * @param collection The collection/bucket name
   * @param id Unique identifier
   * @returns Result with success boolean or error
   */
  delete(
    collection: string, 
    id: string
  ): Promise<StorageResult<boolean>>;
  
  /**
   * Batch save with partial success support.
   * 
   * @param operations Save operations
   * @returns Batch result with successes and failures
   */
  saveBatch(
    operations: Array<{
      collection: string;
      id: string;
      data: Buffer;
      options?: {
        ttl?: number;
        metadata?: Record<string, string>;
      };
    }>
  ): Promise<BatchResult<SaveResult>>;
  
  /**
   * Batch load with partial success support.
   * 
   * @param operations Load operations
   * @returns Batch result with successes and failures
   */
  loadBatch(
    operations: Array<{
      collection: string;
      id: string;
    }>
  ): Promise<BatchResult<LoadResult>>;
  
  /**
   * Atomic compare-and-swap operation.
   * 
   * @param collection The collection/bucket name
   * @param id Unique identifier
   * @param expectedChecksum Expected checksum for CAS
   * @param newData New data to store
   * @returns Result with success or error (including CAS mismatch)
   */
  compareAndSwap(
    collection: string,
    id: string,
    expectedChecksum: string,
    newData: Buffer
  ): Promise<StorageResult<SaveResult>>;
  
  /**
   * Check storage health and availability.
   * 
   * @returns Current health status
   */
  checkHealth(): Promise<StorageHealth>;
}

/**
 * Storage adapter to convert enhanced interface to legacy interface.
 * This allows gradual migration of existing code.
 */
export class StorageAdapter implements import('./interfaces').StorageProvider {
  constructor(private enhanced: EnhancedStorageProvider) {}
  
  async save(collection: string, id: string, data: Buffer): Promise<import('./interfaces').SaveResult> {
    const result = await this.enhanced.save(collection, id, data);
    
    if (!result.success) {
      throw result.error;
    }
    
    return {
      id: result.data.id,
      checksum: result.data.checksum,
      size: result.data.size,
      path: result.data.path,
    };
  }
  
  async load(collection: string, id: string): Promise<{ data: Buffer; metadata: Record<string, string> } | null> {
    const result = await this.enhanced.load(collection, id);
    
    if (!result.success) {
      if (result.error.type === StorageErrorType.NOT_FOUND) {
        return null;
      }
      throw result.error;
    }
    
    return {
      data: result.data.data,
      metadata: result.data.metadata,
    };
  }
  
  async exists(collection: string, id: string): Promise<boolean> {
    const result = await this.enhanced.exists(collection, id);
    
    if (!result.success) {
      throw result.error;
    }
    
    return result.data;
  }
  
  async list(collection: string, prefix?: string): Promise<string[]> {
    const result = await this.enhanced.list(collection, { prefix });
    
    if (!result.success) {
      throw result.error;
    }
    
    return result.data.items;
  }
  
  async delete(collection: string, id: string): Promise<boolean> {
    const result = await this.enhanced.delete(collection, id);
    
    if (!result.success) {
      throw result.error;
    }
    
    return result.data;
  }
  
  async saveBatch(operations: import('./interfaces').SaveOperation[]): Promise<import('./interfaces').SaveResult[]> {
    const enhancedOps = operations.map(op => ({
      collection: op.collection,
      id: op.id,
      data: op.data,
    }));
    
    const result = await this.enhanced.saveBatch(enhancedOps);
    
    // Throw if any failed (legacy behavior)
    if (result.failureCount > 0) {
      throw new Error(`Batch save failed: ${result.failureCount} operations failed`);
    }
    
    return result.successful.map(r => ({
      id: r.id,
      checksum: r.checksum,
      size: r.size,
      path: r.path,
    }));
  }
  
  async loadBatch(operations: import('./interfaces').LoadOperation[]): Promise<(import('./interfaces').LoadResult | null)[]> {
    const enhancedOps = operations.map(op => ({
      collection: op.collection,
      id: op.id,
    }));
    
    const result = await this.enhanced.loadBatch(enhancedOps);
    
    // Map results maintaining order
    return operations.map(op => {
      const success = result.successful.find(
        s => s.id === op.id && s.path.includes(op.collection)
      );
      
      if (success) {
        return {
          data: success.data,
          metadata: success.metadata,
        };
      }
      
      // Check if it was NOT_FOUND
      const failure = result.failed.find(
        f => f.operation.id === op.id && 
        f.error.type === StorageErrorType.NOT_FOUND
      );
      
      if (failure) {
        return null;
      }
      
      // Other error - throw
      throw new Error(`Failed to load ${op.collection}/${op.id}`);
    });
  }
}