/**
 * Simplified Action Executor Interface
 *
 * This interface defines the contract for executing individual actions
 * within a workflow. It's designed to be a simple, stateless function
 * that takes an action + inputs and returns a result.
 *
 * Design decisions:
 * - Stateless: Each execution is independent
 * - Direct call: No job queues or async messaging
 * - Type-safe: Uses our JSON-safe schemas throughout
 * - Minimal: Only what's needed for HTTP action execution
 */

import type {
  PlannedAction,
  ActionDefinition,
  ErrorDetail,
  StorageLocation,
} from '@rainmaker/schema';

/**
 * HTTP trace entry for debugging failed requests
 */
export interface HttpTraceEntry {
  timestamp: string;
  request: {
    method: string;
    url: string;
    headers: Record<string, string>;
    body?: string;
  };
  response?: {
    status: number;
    headers: Record<string, string>;
    body: string;
    duration: number;
  };
  error?: ErrorDetail;
}

/**
 * Result from executing an action
 */
export interface ActionExecutionResult {
  status: 'success' | 'failure';
  output?: Record<string, unknown>;
  error?: ErrorDetail;
  httpTrace: HttpTraceEntry[];
  retryable?: boolean;
  retryAfter?: string; // ISO datetime
  storageLocation?: StorageLocation;
}

/**
 * Context for action execution
 */
export interface ActionExecutionContext {
  executionId: string;
  planId: string;
  actionId: string;
  attempt?: number;
}

/**
 * Main executor interface
 *
 * This is what Module 4 will use to execute actions.
 * It takes a planned action, its definition, and resolved inputs,
 * then returns the execution result.
 */
export interface ActionExecutor {
  /**
   * Execute a single action
   *
   * @param action - The planned action from the execution plan
   * @param definition - The action definition (API details, auth, etc.)
   * @param inputs - Resolved input values (references already resolved)
   * @param context - Execution context for logging/tracing
   * @returns Promise resolving to the execution result
   */
  execute(
    action: PlannedAction,
    definition: ActionDefinition,
    inputs: Record<string, unknown>,
    context?: ActionExecutionContext,
  ): Promise<ActionExecutionResult>;
}

/**
 * Configuration for the executor
 */
export interface ExecutorConfig {
  /**
   * Maximum response size in bytes (default: 50MB)
   */
  maxResponseSize?: number;

  /**
   * Default timeout in milliseconds (default: 30s)
   */
  defaultTimeout?: number;

  /**
   * Storage provider for saving responses
   */
  storageProvider?: StorageProvider;

  /**
   * Whether to store HTTP traces for successful requests (default: false)
   */
  storeSuccessTraces?: boolean;
}

/**
 * Simple storage provider interface
 * Much simpler than the complex one in Module 2
 */
export interface StorageProvider {
  save(data: Buffer, metadata: Record<string, string>): Promise<StorageLocation>;
  load(location: StorageLocation): Promise<Buffer>;
}

/**
 * Factory function to create an executor instance
 */
export type CreateActionExecutor = (config?: ExecutorConfig) => ActionExecutor;
