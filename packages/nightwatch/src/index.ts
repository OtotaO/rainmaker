/**
 * NightWatch - Library API for monorepo integration
 * 
 * This is the main entry point when using NightWatch as a library.
 * For CLI usage, see cli-v2.ts
 */

// Core functionality
export { NightWatch, createNightWatch } from './core/nightwatch';
export type { NightwatchOptions, TaskOptions } from './core/nightwatch';

// Configuration
export { 
  createConfig, 
  configFromEnv, 
  ConfigBuilder,
  DEFAULT_CONFIG 
} from './config/simple-config';

// Logging
export { 
  createLogger, 
  createNoOpLogger, 
  createTestLogger 
} from './utils/logger-service';

// Process management
export { 
  SimpleProcessManager,
  execute,
  executeWithInput,
  ProcessError
} from './utils/simple-process-manager';
export type { ProcessOptions } from './utils/simple-process-manager';

// AI services
export {
  createAIService,
  AIService
} from './services/ai-service';
export type {
  AIServiceConfig,
  CodeAnalysisRequest,
  CodeAnalysisResponse,
  ImplementationStep,
  CodeGenerationRequest,
  CodeGenerationResponse
} from './services/ai-service';

// File operations
export {
  scanDirectory,
  getRepositoryStructure,
  readFileSafe,
  writeFileSafe,
  deleteFileSafe
} from './utils/file-scanner';
export type { FileScanOptions } from './utils/file-scanner';

// Error types
export { default as NightwatchError } from './errors/base-error';
export {
  EnvironmentError,
  ConfigurationError,
  CommandError,
  TimeoutError,
  ValidationError,
  AuthenticationError,
  RateLimitError,
  DependencyError
} from './errors/core-errors';

// Type exports
export type {
  Logger,
  NightwatchConfig,
  NightwatchTask,
  ProcessResult,
  ProcessExecutionResult,
  EnvVarOptions
} from './types';

/**
 * Example usage in a monorepo:
 * 
 * ```typescript
 * import { createNightWatch, createLogger, createConfig } from '@myorg/nightwatch';
 * 
 * const logger = createLogger({ level: 'debug' });
 * const config = createConfig({
 *   workDir: '/workspace/nightwatch-tasks',
 *   timeout: 7200,
 *   ai: {
 *     apiUrl: 'http://localhost:3001',
 *     apiKey: process.env.ANTHROPIC_API_KEY
 *   }
 * });
 * 
 * const nightwatch = createNightWatch({ logger, config });
 * 
 * const result = await nightwatch.executeTask({
 *   repoUrl: 'https://github.com/org/repo.git',
 *   description: 'Implement feature X',
 *   contextFile: './context.md'
 * });
 * ```
 */
