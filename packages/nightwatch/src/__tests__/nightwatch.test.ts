import { describe, test, expect, beforeEach, mock } from 'bun:test';
import { createNightWatch, createTestLogger, createConfig } from '../index';
import type { NightWatch } from '../core/nightwatch';
import type { NightwatchConfig } from '../types';

describe('NightWatch Core', () => {
  let nightwatch: NightWatch;
  let logger: ReturnType<typeof createTestLogger>;

  beforeEach(() => {
    logger = createTestLogger();
    const config = createConfig({
      workDir: '/tmp/nightwatch-test',
      timeout: 60,
    });
    nightwatch = createNightWatch({ logger, config });
  });

  test('should create instance with custom logger', () => {
    expect(nightwatch).toBeDefined();
    expect(nightwatch.getCurrentTask()).toBeNull();
  });

  test('should validate task options', async () => {
    await expect(
      nightwatch.executeTask({
        repoUrl: '',
        description: 'Test task',
      })
    ).rejects.toThrow('Repository URL is required');

    await expect(
      nightwatch.executeTask({
        repoUrl: 'https://github.com/test/repo.git',
        description: '',
      })
    ).rejects.toThrow('Task description is required');

    await expect(
      nightwatch.executeTask({
        repoUrl: 'not-a-url',
        description: 'Test task',
      })
    ).rejects.toThrow('Invalid repository URL');
  });

  test('should log task execution', async () => {
    // Mock the git clone to avoid actual network calls
    const mockExecute = mock(() => Promise.resolve({
      code: 0,
      signal: null,
      stdout: '',
      stderr: '',
      timedOut: false,
    }));

    // This would need proper mocking setup in real tests
    // For now, we'll just verify the logger captures messages
    
    try {
      await nightwatch.executeTask({
        repoUrl: 'https://github.com/test/repo.git',
        description: 'Test task',
      });
    } catch (error) {
      // Expected to fail without proper git setup
    }

    // Check that appropriate logs were created
    const logs = logger.logs;
    expect(logs.some(log => 
      log.level === 'info' && 
      log.message.includes('Starting task')
    )).toBe(true);
  });
});

describe('Configuration', () => {
  test('should build config with defaults', () => {
    const config = createConfig();
    expect(config.timeout).toBe(5400);
    expect(config.logLevel).toBe('info');
    expect(config.retry.maxRetries).toBe(3);
  });

  test('should override defaults', () => {
    const config = createConfig({
      timeout: 7200,
      logLevel: 'debug',
    });
    expect(config.timeout).toBe(7200);
    expect(config.logLevel).toBe('debug');
    expect(config.retry.maxRetries).toBe(3); // default
  });

  test('should use default retry config when not specified', () => {
    const config = createConfig({
      timeout: 3600,
    });
    // All retry values should be defaults
    expect(config.retry.maxRetries).toBe(3);
    expect(config.retry.initialDelay).toBe(1000);
    expect(config.retry.maxDelay).toBe(30000);
  });

  test('should validate timeout range', () => {
    expect(() => createConfig({ timeout: 30 }))
      .toThrow('Timeout must be between 60 and 86400 seconds');
    
    expect(() => createConfig({ timeout: 100000 }))
      .toThrow('Timeout must be between 60 and 86400 seconds');
  });
});

describe('Logger Service', () => {
  test('test logger should capture logs', () => {
    const logger = createTestLogger();
    
    logger.info('Test message');
    logger.error('Error message', { code: 'TEST_ERROR' });
    
    expect(logger.logs).toHaveLength(2);
    expect(logger.logs[0]).toEqual({
      level: 'info',
      message: 'Test message',
      meta: undefined,
    });
    expect(logger.logs[1]).toEqual({
      level: 'error',
      message: 'Error message',
      meta: { code: 'TEST_ERROR' },
    });
  });
});
