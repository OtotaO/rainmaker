import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { env } from '../utils/env';

describe('Environment Utilities', () => {
  // Save original environment variables
  const originalEnv = { ...process.env };

  beforeAll(() => {
    // Set up test environment variables
    process.env.TEST_STRING = 'test-value';
    process.env.TEST_NUMBER = '42';
    process.env.TEST_BOOLEAN = 'true';
  });

  afterAll(() => {
    // Restore original environment variables
    process.env = originalEnv;
  });

  it('should get string environment variables', () => {
    const value = env('TEST_STRING');
    expect(value).toBe('test-value');
  });

  it('should return default value when variable is not set', () => {
    const value = env('NON_EXISTENT', { default: 'default-value' });
    expect(value).toBe('default-value');
  });

  it('should throw when required variable is not set', () => {
    expect(() => env.required('REQUIRED_BUT_NOT_SET')).toThrow();
  });

  it('should get number environment variables', () => {
    const value = env.number('TEST_NUMBER');
    expect(value).toBe(42);
  });

  it('should get boolean environment variables', () => {
    const value = env.boolean('TEST_BOOLEAN');
    expect(value).toBe(true);
  });

  it('should parse JSON environment variables', () => {
    process.env.TEST_JSON = '{"key": "value"}';
    const value = env.json('TEST_JSON');
    expect(value).toEqual({ key: 'value' });
  });

  it('should parse array environment variables', () => {
    process.env.TEST_ARRAY = 'one,two,three';
    const value = env.array('TEST_ARRAY');
    expect(value).toEqual(['one', 'two', 'three']);
  });
});
