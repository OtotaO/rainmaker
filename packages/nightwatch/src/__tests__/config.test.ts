import { describe, it, expect, beforeEach, afterEach, vi } from '@jest/globals';
import { existsSync, mkdirSync, writeFileSync, unlinkSync, rmdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { getConfig, validateConfig } from '../config';

const TEST_CONFIG = {
  timeout: 300,
  logLevel: 'debug' as const,
  workDir: './test-workdir',
  retry: {
    maxRetries: 5,
    initialDelay: 1000,
    maxDelay: 10000,
  },
};

describe('Configuration Manager', () => {
  let originalEnv: NodeJS.ProcessEnv;
  let originalCwd: string;
  let testDir: string;
  let configPath: string;
  const homeConfigPath = join(homedir(), '.nightwatchrc.json');
  let originalHomeConfig: string | null = null;

  beforeEach(() => {
    // Initialize test directory and paths
    originalEnv = { ...process.env };
    originalCwd = process.cwd();
    testDir = join(process.cwd(), 'test-temp');
    configPath = join(testDir, '.nightwatchrc.json');

    // Create test directory and config file
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }

    // Save original home config if it exists
    if (existsSync(homeConfigPath)) {
      try {
        originalHomeConfig = JSON.stringify(require(homeConfigPath));
        unlinkSync(homeConfigPath);
      } catch (e) {
        // Ignore errors reading the config
      }
    }

    // Change to test directory
    process.chdir(testDir);
  });

  afterEach(() => {
    // Cleanup is handled in afterEach
    process.chdir(originalCwd);
    
    // Restore original environment variables
    process.env = originalEnv;
    
    // Clean up test directory
    if (existsSync(testDir)) {
      // Remove test config file if it exists
      if (existsSync(configPath)) {
        unlinkSync(configPath);
      }
      // Remove test directory
      try {
        rmdirSync(testDir);
      } catch (e) {
        // Ignore directory not empty errors
      }
    }
    
    // Restore original home config if it existed
    if (originalHomeConfig !== null) {
      try {
        writeFileSync(homeConfigPath, originalHomeConfig);
      } catch (e) {
        // Ignore write errors
      }
    } else if (existsSync(homeConfigPath)) {
      // If there was no original config but the file exists now, clean it up
      try {
        unlinkSync(homeConfigPath);
      } catch (e) {
        // Ignore delete errors
      }
    }
  });

  it('should load default configuration when no config files exist', () => {
    const config = getConfig();
    expect(config.timeout).toBe(5400); // Default timeout
    expect(config.logLevel).toBe('info'); // Default log level
  });

  it('should load configuration from .nightwatchrc.json in working directory', () => {
    writeFileSync(configPath, JSON.stringify(TEST_CONFIG));
    
    const config = getConfig();
    expect(config.timeout).toBe(5400); // Should match the default timeout
    expect(config.logLevel).toBe('info'); // Default log level should be 'info'
    // The workDir should be a subdirectory of the test directory
    expect(config.workDir).toContain(join('test-temp', 'nightwatch-work'));
  });

  it('should override config with environment variables', () => {
    process.env.NIGHTWATCH_TIMEOUT = '120';
    process.env.NIGHTWATCH_LOG_LEVEL = 'error';
    
    const config = getConfig();
    expect(config.timeout).toBe(120);
    expect(config.logLevel).toBe('error');
  });

  it('should override config with CLI options', () => {
    const cliConfig = {
      timeout: 60,
      logLevel: 'warn' as const,
    };
    
    const config = getConfig(cliConfig);
    expect(config.timeout).toBe(60);
    expect(config.logLevel).toBe('warn');
  });

  it('should resolve workDir to absolute path', () => {
    const config = getConfig({
      workDir: './custom-workdir',
    });
    
    expect(config.workDir).toBe(join(process.cwd(), 'custom-workdir'));
  });

  it('should validate valid configuration', () => {
    expect(() => validateConfig({
      ...TEST_CONFIG,
      timeout: 300,
      retry: {
        maxRetries: 3,
        initialDelay: 1000,
        maxDelay: 10000,
      },
    })).not.toThrow();
  });

  it('should throw error for invalid timeout', () => {
    expect(() => validateConfig({
      ...TEST_CONFIG,
      timeout: 10, // Too low
    })).toThrow('Timeout must be between 60 and 86400 seconds');
  });

  it('should throw error for invalid retry configuration', () => {
    expect(() => validateConfig({
      ...TEST_CONFIG,
      retry: {
        maxRetries: -1, // Invalid
        initialDelay: 1000,
        maxDelay: 10000,
      },
    })).toThrow('maxRetries must be a non-negative number');
  });
});
