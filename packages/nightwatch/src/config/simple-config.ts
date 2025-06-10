import type { NightwatchConfig } from '../types';
import { ValidationError } from '../errors/core-errors';

/**
 * Simple, explicit configuration builder.
 * No file searching, no magic - just what you pass in.
 */
export class ConfigBuilder {
  private workDir?: string;
  private timeout?: number;
  private logLevel?: NightwatchConfig['logLevel'];
  private retry: Partial<NightwatchConfig['retry']> = {};

  setWorkDir(dir: string): this {
    this.workDir = dir;
    return this;
  }

  setTimeout(seconds: number): this {
    if (seconds < 60 || seconds > 86400) {
      throw new ValidationError('Timeout must be between 60 and 86400 seconds');
    }
    this.timeout = seconds;
    return this;
  }

  setLogLevel(level: NightwatchConfig['logLevel']): this {
    this.logLevel = level;
    return this;
  }

  setRetry(options: Partial<NightwatchConfig['retry']>): this {
    Object.assign(this.retry, options);
    return this;
  }

  build(): NightwatchConfig {
    // Apply defaults only where needed
    return {
      workDir: this.workDir || process.cwd(),
      timeout: this.timeout || 5400,
      logLevel: this.logLevel || 'info',
      retry: {
        maxRetries: this.retry.maxRetries ?? 3,
        initialDelay: this.retry.initialDelay ?? 1000,
        maxDelay: this.retry.maxDelay ?? 30000,
      },
    };
  }
}

/**
 * Create configuration from environment variables.
 * Explicit and predictable - no surprises.
 */
export function configFromEnv(prefix = 'NIGHTWATCH_'): Partial<NightwatchConfig> {
  const config: Partial<NightwatchConfig> = {};

  const workDir = process.env[`${prefix}WORK_DIR`];
  if (workDir) {
    config.workDir = workDir;
  }

  const timeout = process.env[`${prefix}TIMEOUT`];
  if (timeout) {
    const seconds = parseInt(timeout, 10);
    if (!isNaN(seconds)) {
      config.timeout = seconds;
    }
  }

  const logLevel = process.env[`${prefix}LOG_LEVEL`];
  if (logLevel && isValidLogLevel(logLevel)) {
    config.logLevel = logLevel;
  }

  return config;
}

/**
 * Create configuration from explicit options.
 * This is the preferred way in a monorepo.
 */
export function createConfig(options: Partial<NightwatchConfig> = {}): NightwatchConfig {
  const builder = new ConfigBuilder();

  if (options.workDir) builder.setWorkDir(options.workDir);
  if (options.timeout) builder.setTimeout(options.timeout);
  if (options.logLevel) builder.setLogLevel(options.logLevel);
  if (options.retry) builder.setRetry(options.retry);

  return builder.build();
}

function isValidLogLevel(level: string): level is NightwatchConfig['logLevel'] {
  return ['error', 'warn', 'info', 'debug', 'verbose'].includes(level);
}

/**
 * Default configuration for reference
 */
export const DEFAULT_CONFIG: NightwatchConfig = {
  workDir: process.cwd(),
  timeout: 5400,
  logLevel: 'info',
  retry: {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 30000,
  },
};
