/**
 * Simplified Executor Module
 *
 * Direct Bun-native implementation without unnecessary abstractions
 */

// Main executor
export { BunExecutor, createBunExecutor } from './bun-executor';
export type { BunExecutorConfig } from './bun-executor';

// Core utilities
export { executeHttpRequest, categorizeHttpError, calculateBackoff } from './http-core';
export type { HttpRequest, HttpResponse } from './http-core';

// Binary handling
export { storeBinaryResponse, isBinaryResponse, cleanupOldFiles } from './binary-response-handler';
export type { StorageConfig } from './binary-response-handler';

// Authentication
export {
  applyAuthentication,
  getOAuth2Token,
  clearTokenCache,
  cleanupExpiredTokens,
} from './auth-handler';

// Re-export workflow-state interfaces for convenience
export type {
  ActionExecutor,
  ActionExecutionResult,
  ActionExecutionContext,
  HttpTraceEntry,
  StorageProvider,
  ExecutorConfig,
  CreateActionExecutor,
} from '@rainmaker/workflow-state/executor-interface';

// Module integration for direct function calls
export {
  executeHttpAction,
  loadActionDefinition,
  registerActionDefinition,
  getExecutor,
} from './module-integration';

// Default export is the factory function
export { createBunExecutor as default } from './bun-executor';
