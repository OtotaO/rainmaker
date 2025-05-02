// File: packages/api/src/config/index.ts

import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { logger } from '../lib/logger';

// Load environment variables from .env file
dotenv.config();

// Define schema for configuration validation
const ConfigSchema = z.object({
  anthropic: z.object({
    apiKey: z.string().min(1, 'Anthropic API key is required'),
    model: z.string().default('claude-3-7'),
    maxTokens: z.number().int().positive().default(3000),
    timeout: z.number().int().positive().default(30000),
    maxRetries: z.number().int().positive().default(3),
  }),
  server: z.object({
    port: z.number().int().positive().default(3001),
    cors: z.boolean().default(true),
  }),
  database: z.object({
    url: z.string().min(1, 'Database URL is required'),
  }),
});

type Config = z.infer<typeof ConfigSchema>;

// Helper function to load environment variables
function loadConfigFromEnvironment() {
  // Get values from environment with specific error handling
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicApiKey) {
    logger.error('Anthropic API key is missing');
  }
  
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    logger.error('Database URL is missing');
  }
  
  return {
    anthropic: {
      apiKey: anthropicApiKey || '',
      model: process.env.ANTHROPIC_MODEL || 'claude-3-7',
      maxTokens: process.env.ANTHROPIC_MAX_TOKENS ? parseInt(process.env.ANTHROPIC_MAX_TOKENS, 10) : 3000,
      timeout: process.env.ANTHROPIC_TIMEOUT ? parseInt(process.env.ANTHROPIC_TIMEOUT, 10) : 30000,
      maxRetries: process.env.ANTHROPIC_MAX_RETRIES ? parseInt(process.env.ANTHROPIC_MAX_RETRIES, 10) : 3,
    },
    server: {
      port: process.env.PORT ? parseInt(process.env.PORT, 10) : 3001,
      cors: process.env.ENABLE_CORS !== 'false',
    },
    database: {
      url: databaseUrl || '',
    },
  };
}

// Try to build config from environment variables
let config: Config;

try {
  // Load config from environment
  const rawConfig = loadConfigFromEnvironment();
  
  // Validate config against schema
  config = ConfigSchema.parse(rawConfig);
  
  // Double-check critical values
  if (!config.anthropic.apiKey) {
    throw new Error('Anthropic API key is required but was not provided');
  }
  
  if (!config.database.url) {
    throw new Error('Database URL is required but was not provided');
  }
  
  logger.info('Configuration loaded successfully');
} catch (error) {
  logger.error('Failed to load configuration', { error });
  throw new Error('Configuration error: Could not load valid configuration');
}

export default config;

// Export specific config sections for convenience
export const anthropicConfig = config.anthropic;
export const serverConfig = config.server;
export const databaseConfig = config.database;

// Example of how to use the ConfigSetting service alongside static config
// This can be used to retrieve dynamic configuration values that override static defaults
/**
 * Gets a configuration value from ConfigSetting if available, or falls back to a default value
 * @param configService - The ConfigSettingService instance
 * @param key - The configuration key to look up
 * @param defaultValue - The default value to use if key is not found in ConfigSetting
 * @returns The configuration value
 * 
 * Usage example:
 * ```
 * // Get a dynamic feature flag, defaulting to false if not configured
 * const isFeatureEnabled = await getDynamicConfig(configService, 'features.newFeature.enabled', false);
 * 
 * // Get a dynamic API timeout, defaulting to the static config value
 * const timeout = await getDynamicConfig(configService, 'api.timeout', config.anthropic.timeout);
 * ```
 */
export async function getDynamicConfig<T>(configService: any, key: string, defaultValue: T): Promise<T> {
  try {
    const setting = await configService.getConfigSetting(key);
    return setting ? setting.value as T : defaultValue;
  } catch (error) {
    logger.warn(`Failed to get dynamic config for ${key}, using default value`, { error });
    return defaultValue;
  }
}
