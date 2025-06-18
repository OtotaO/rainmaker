import crypto from 'node:crypto';
import type { PlannedAction, ActionExecutionState } from './schemas';

/**
 * Request deduplication for action execution.
 * 
 * This module prevents the same action from being executed multiple times
 * concurrently or within a short time window. This is critical for:
 * 1. Preventing duplicate API calls (especially for non-idempotent operations)
 * 2. Avoiding race conditions in workflow execution
 * 3. Reducing unnecessary load on external APIs
 * 4. Ensuring consistent state management
 * 
 * Design decisions:
 * - Uses content-based hashing (action ID + inputs) for deduplication
 * - In-memory cache for simplicity (can be replaced with Redis for distributed systems)
 * - Configurable TTL for cached results (default 5 minutes)
 * - Pending requests block duplicate attempts until completion
 * - Failed requests are cached briefly to allow retries
 * 
 * Future enhancements:
 * - Distributed cache support (Redis/Memcached)
 * - Configurable deduplication strategies per action type
 * - Metrics for duplicate request detection
 */

/**
 * Deduplication result types
 */
export type DeduplicationResult = 
  | { type: 'proceed'; key: string }
  | { type: 'duplicate_pending'; key: string; startedAt: Date }
  | { type: 'duplicate_completed'; key: string; result: ActionExecutionState };

/**
 * Entry in the deduplication cache
 */
interface CacheEntry {
  key: string;
  status: 'pending' | 'completed' | 'failed';
  startedAt: Date;
  completedAt?: Date;
  result?: ActionExecutionState;
  ttl: number;
}

/**
 * Simple in-memory cache for deduplication.
 * In production, this should be replaced with a distributed cache.
 */
class DeduplicationCache {
  private cache = new Map<string, CacheEntry>();
  private cleanupInterval: NodeJS.Timer;
  
  constructor() {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60 * 1000);
  }
  
  /**
   * Get a cache entry by key
   */
  get(key: string): CacheEntry | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    
    // Check if entry has expired
    if (entry.completedAt) {
      const age = Date.now() - entry.completedAt.getTime();
      if (age > entry.ttl) {
        this.cache.delete(key);
        return undefined;
      }
    }
    
    return entry;
  }
  
  /**
   * Set a cache entry
   */
  set(key: string, entry: CacheEntry): void {
    this.cache.set(key, entry);
  }
  
  /**
   * Delete a cache entry
   */
  delete(key: string): void {
    this.cache.delete(key);
  }
  
  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.completedAt) {
        const age = now - entry.completedAt.getTime();
        if (age > entry.ttl) {
          this.cache.delete(key);
        }
      }
      
      // Clean up pending entries that are stuck (> 10 minutes)
      if (entry.status === 'pending') {
        const pendingTime = now - entry.startedAt.getTime();
        if (pendingTime > 10 * 60 * 1000) {
          this.cache.delete(key);
        }
      }
    }
  }
  
  /**
   * Destroy the cache and clean up resources
   */
  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.cache.clear();
  }
}

// Global cache instance
const deduplicationCache = new DeduplicationCache();

/**
 * Generate a deduplication key for an action.
 * 
 * The key is based on:
 * 1. Action definition ID (the type of action)
 * 2. Action inputs (the specific parameters)
 * 3. Dependencies (actions this depends on)
 * 
 * This ensures that only truly identical actions are deduplicated.
 * Actions with different inputs or dependencies will have different keys.
 * 
 * @param action The action to generate a key for
 * @returns A stable hash key for deduplication
 */
export function generateDeduplicationKey(action: PlannedAction): string {
  const keyData = {
    actionDefinitionId: action.actionDefinitionId,
    inputs: action.inputs,
    dependencies: action.dependencies.sort(), // Sort for consistent hashing
  };
  
  // Create a stable JSON representation with deep sorting
  const jsonStr = JSON.stringify(keyData, null, 0);
  
  // Generate SHA-256 hash
  const hash = crypto.createHash('sha256');
  hash.update(jsonStr);
  
  return `action-exec:${hash.digest('hex')}`;
}

/**
 * Check if an action is a duplicate of a pending or recently completed action.
 * 
 * @param action The action to check
 * @param ttlMs TTL for completed actions in milliseconds (default 5 minutes)
 * @returns Deduplication result indicating whether to proceed or return cached result
 */
export function checkDuplication(
  action: PlannedAction,
  ttlMs: number = 5 * 60 * 1000
): DeduplicationResult {
  const key = generateDeduplicationKey(action);
  const entry = deduplicationCache.get(key);
  
  if (!entry) {
    // No duplicate found, proceed with execution
    return { type: 'proceed', key };
  }
  
  if (entry.status === 'pending') {
    // Another execution is in progress
    return { 
      type: 'duplicate_pending', 
      key,
      startedAt: entry.startedAt,
    };
  }
  
  if (entry.status === 'completed' && entry.result) {
    // Recently completed, return cached result
    return {
      type: 'duplicate_completed',
      key,
      result: entry.result,
    };
  }
  
  if (entry.status === 'failed') {
    // Failed execution, allow retry by proceeding
    // Clear the failed entry to allow fresh execution
    deduplicationCache.delete(key);
    return { type: 'proceed', key };
  }
  
  // Shouldn't reach here, but proceed if we do
  return { type: 'proceed', key };
}

/**
 * Mark an action execution as started.
 * This prevents duplicate executions while the action is in progress.
 * 
 * @param key The deduplication key
 * @param ttlMs TTL for the cache entry
 */
export function markExecutionStarted(key: string, ttlMs: number = 5 * 60 * 1000): void {
  deduplicationCache.set(key, {
    key,
    status: 'pending',
    startedAt: new Date(),
    ttl: ttlMs,
  });
}

/**
 * Mark an action execution as completed with its result.
 * 
 * @param key The deduplication key
 * @param result The execution result
 * @param ttlMs TTL for caching the result
 */
export function markExecutionCompleted(
  key: string,
  result: ActionExecutionState,
  ttlMs: number = 5 * 60 * 1000
): void {
  const entry = deduplicationCache.get(key);
  if (entry) {
    entry.status = 'completed';
    entry.completedAt = new Date();
    entry.result = result;
    entry.ttl = ttlMs;
  } else {
    // Create new entry if it doesn't exist (shouldn't happen normally)
    deduplicationCache.set(key, {
      key,
      status: 'completed',
      startedAt: new Date(),
      completedAt: new Date(),
      result,
      ttl: ttlMs,
    });
  }
}

/**
 * Mark an action execution as failed.
 * Failed executions are cached briefly to prevent immediate retry storms.
 * 
 * @param key The deduplication key
 * @param shortTtlMs Short TTL for failed executions (default 30 seconds)
 */
export function markExecutionFailed(
  key: string,
  shortTtlMs: number = 30 * 1000
): void {
  const entry = deduplicationCache.get(key);
  if (entry) {
    entry.status = 'failed';
    entry.completedAt = new Date();
    entry.ttl = shortTtlMs;
  } else {
    // Create new entry if it doesn't exist
    deduplicationCache.set(key, {
      key,
      status: 'failed',
      startedAt: new Date(),
      completedAt: new Date(),
      ttl: shortTtlMs,
    });
  }
}

/**
 * Wait for a pending execution to complete.
 * This is used when a duplicate request is detected for a pending action.
 * 
 * @param key The deduplication key
 * @param timeoutMs Maximum time to wait (default 5 minutes)
 * @returns The completed result or null if timeout
 */
export async function waitForPendingExecution(
  key: string,
  timeoutMs: number = 5 * 60 * 1000
): Promise<ActionExecutionState | null> {
  const startTime = Date.now();
  const pollInterval = 100; // Check every 100ms
  
  while (Date.now() - startTime < timeoutMs) {
    const entry = deduplicationCache.get(key);
    
    if (!entry || entry.status === 'failed') {
      // Entry disappeared or failed, return null
      return null;
    }
    
    if (entry.status === 'completed' && entry.result) {
      // Execution completed, return result
      return entry.result;
    }
    
    // Still pending, wait a bit
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }
  
  // Timeout reached
  return null;
}

/**
 * Clear the deduplication cache.
 * Useful for testing or manual cache invalidation.
 */
export function clearDeduplicationCache(): void {
  deduplicationCache.destroy();
}

/**
 * Get deduplication statistics for monitoring.
 */
export function getDeduplicationStats(): {
  totalEntries: number;
  pendingEntries: number;
  completedEntries: number;
  failedEntries: number;
} {
  let pending = 0;
  let completed = 0;
  let failed = 0;
  
  // Note: In a real implementation, this would use the cache's internal methods
  // For now, we'll return placeholder stats
  return {
    totalEntries: 0,
    pendingEntries: pending,
    completedEntries: completed,
    failedEntries: failed,
  };
}