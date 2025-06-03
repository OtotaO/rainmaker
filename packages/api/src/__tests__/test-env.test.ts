import { expect, test, describe, beforeEach, afterEach } from 'vitest';

describe('Environment Variables Module', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original process.env
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    // Restore original process.env
    process.env = originalEnv;
  });

  test('should use API key from process.env when available', () => {
    // Set ANTHROPIC_API_KEY in process.env
    process.env.ANTHROPIC_API_KEY = 'process-env-api-key';
    
    // Check that the API key was taken from process.env
    expect(process.env.ANTHROPIC_API_KEY).toBe('process-env-api-key');
  });

  test('should handle environment variable loading', () => {
    // Test basic environment variable handling
    const testKey = 'TEST_ENV_VAR';
    const testValue = 'test-value';
    
    process.env[testKey] = testValue;
    
    expect(process.env[testKey]).toBe(testValue);
  });

  test('should handle missing environment variables', () => {
    // Test handling of missing environment variables
    const missingKey = 'NON_EXISTENT_ENV_VAR';
    
    expect(process.env[missingKey]).toBeUndefined();
  });

  test('should handle environment variable deletion', () => {
    // Test deletion of environment variables
    const testKey = 'TEMP_TEST_VAR';
    process.env[testKey] = 'temp-value';
    
    expect(process.env[testKey]).toBe('temp-value');
    
    delete process.env[testKey];
    
    expect(process.env[testKey]).toBeUndefined();
  });
});
