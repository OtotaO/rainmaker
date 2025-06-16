import { existsSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import { homedir } from 'os';
import { env } from '../utils/env';
import { logger } from '../utils/logger';
import { NightwatchConfig } from '../types';

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Omit<NightwatchConfig, 'workDir'> = {
  timeout: 5400, // 90 minutes in seconds
  logLevel: 'info',
  retry: {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 30000,
  },
};

/**
 * Configuration file names to look for
 */
const CONFIG_FILES = [
  '.nightwatchrc.json',
  '.nightwatchrc',
  'nightwatch.config.json',
];

/**
 * Load configuration from a file
 */
function loadConfigFile(filePath: string): Partial<NightwatchConfig> {
  try {
    const content = readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as Partial<NightwatchConfig>;
  } catch (error) {
    logger.warn(`Failed to load config file ${filePath}:`, error);
    return {};
  }
}

/**
 * Find and load configuration file
 */
function findAndLoadConfig(cwd: string = process.cwd()): Partial<NightwatchConfig> {
  // Check in current working directory
  for (const file of CONFIG_FILES) {
    const filePath = join(cwd, file);
    if (existsSync(filePath)) {
      logger.debug(`Loading config from ${filePath}`);
      return loadConfigFile(filePath);
    }
  }

  // Check in home directory
  const home = homedir();
  if (home && home !== cwd) {
    for (const file of CONFIG_FILES) {
      const filePath = join(home, file);
      if (existsSync(filePath)) {
        logger.debug(`Loading config from ${filePath}`);
        return loadConfigFile(filePath);
      }
    }
  }

  return {};
}

/**
 * Load environment variables
 */
function loadEnvVars(): Partial<NightwatchConfig> {
  return {
    timeout: env.number('NIGHTWATCH_TIMEOUT', { default: DEFAULT_CONFIG.timeout }),
    logLevel: env('NIGHTWATCH_LOG_LEVEL', { 
      default: DEFAULT_CONFIG.logLevel,
      allowedValues: ['error', 'warn', 'info', 'debug', 'verbose']
    }) as NightwatchConfig['logLevel'],
    workDir: env('NIGHTWATCH_WORKDIR', { default: resolve(process.cwd(), 'nightwatch-work') }),
  };
}

/**
 * Merge configurations with the following precedence:
 * 1. Environment variables
 * 2. Config file
 * 3. Default values
 */
function mergeConfigs(
  envConfig: Partial<NightwatchConfig>,
  fileConfig: Partial<NightwatchConfig>,
  cliConfig: Partial<NightwatchConfig> = {}
): NightwatchConfig {
  // Start with default config
  const config: NightwatchConfig = {
    ...DEFAULT_CONFIG,
    workDir: resolve(process.cwd(), 'nightwatch-work'),
  };

  // Apply config from file
  Object.assign(config, fileConfig);

  // Apply environment variables (override file config)
  Object.assign(config, envConfig);

  // Apply CLI options (override everything)
  Object.assign(config, cliConfig);

  // Resolve workDir to absolute path
  if (config.workDir && !config.workDir.startsWith('/')) {
    config.workDir = resolve(process.cwd(), config.workDir);
  }

  return config as NightwatchConfig;
}

/**
 * Get the application configuration
 */
export function getConfig(cliConfig: Partial<NightwatchConfig> = {}): NightwatchConfig {
  const envConfig = loadEnvVars();
  const fileConfig = findAndLoadConfig();
  return mergeConfigs(envConfig, fileConfig, cliConfig);
}

/**
 * Validate the configuration
 */
export function validateConfig(config: NightwatchConfig): void {
  if (config.timeout && (config.timeout < 60 || config.timeout > 86400)) {
    throw new Error('Timeout must be between 60 and 86400 seconds');
  }

  if (config.retry) {
    if (config.retry.maxRetries < 0) {
      throw new Error('maxRetries must be a non-negative number');
    }
    if (config.retry.initialDelay < 0) {
      throw new Error('initialDelay must be a non-negative number');
    }
    if (config.retry.maxDelay < 0) {
      throw new Error('maxDelay must be a non-negative number');
    }
    if (config.retry.initialDelay > config.retry.maxDelay) {
      throw new Error('initialDelay must be less than or equal to maxDelay');
    }
  }
}

/**
 * Get the default configuration
 */
export function getDefaultConfig(): NightwatchConfig {
  return {
    ...DEFAULT_CONFIG,
    workDir: resolve(process.cwd(), 'nightwatch-work'),
  };
}

export * from '../types';
