// File: packages/api/src/__tests__/test-env.test.ts

import { expect, test, describe, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// Mock fs module
jest.mock('fs', () => {
  return {
    readFileSync: jest.fn().mockReturnValue('ANTHROPIC_API_KEY=test-api-key\nOTHER_KEY=other-value')
  };
});

// Mock path module
jest.mock('path', () => {
  return {
    resolve: jest.fn().mockReturnValue('/fake/path/.env')
  };
});

describe('Environment Variables Module', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original process.env
    originalEnv = { ...process.env };
    
    // Clear mocks
    jest.clearAllMocks();
    
    // Clear the module cache to ensure a fresh import
    jest.resetModules();
  });

  afterEach(() => {
    // Restore original process.env
    process.env = originalEnv;
  });

  test('should read API key from .env file when not in process.env', () => {
    // Ensure ANTHROPIC_API_KEY is not in process.env
    delete process.env.ANTHROPIC_API_KEY;
    
    // Import the module that reads the API key
    const { apiKey } = require('../test-env');
    
    // Check that readFileSync was called
    expect(fs.readFileSync).toHaveBeenCalled();
    expect(path.resolve).toHaveBeenCalled();
    
    // Check that the API key was extracted correctly
    expect(apiKey).toBe('test-api-key');
  });

  test('should use API key from process.env when available', () => {
    // Set ANTHROPIC_API_KEY in process.env
    process.env.ANTHROPIC_API_KEY = 'process-env-api-key';
    
    // Import the module that reads the API key
    const { apiKey } = require('../test-env');
    
    // Check that readFileSync was not called
    expect(fs.readFileSync).not.toHaveBeenCalled();
    
    // Check that the API key was taken from process.env
    expect(apiKey).toBe('process-env-api-key');
  });

  test('should handle missing .env file gracefully', () => {
    // Ensure ANTHROPIC_API_KEY is not in process.env
    delete process.env.ANTHROPIC_API_KEY;
    
    // Mock readFileSync to throw an error
    (fs.readFileSync as any).mockImplementation(() => {
      throw new Error('File not found');
    });
    
    // Import the module that reads the API key
    const { apiKey } = require('../test-env');
    
    // Check that readFileSync was called
    expect(fs.readFileSync).toHaveBeenCalled();
    
    // Check that the API key is undefined
    expect(apiKey).toBeUndefined();
  });

  test('should handle malformed .env file gracefully', () => {
    // Ensure ANTHROPIC_API_KEY is not in process.env
    delete process.env.ANTHROPIC_API_KEY;
    
    // Mock readFileSync to return malformed content
    (fs.readFileSync as any).mockReturnValue('MALFORMED_CONTENT');
    
    // Import the module that reads the API key
    const { apiKey } = require('../test-env');
    
    // Check that readFileSync was called
    expect(fs.readFileSync).toHaveBeenCalled();
    
    // Check that the API key is undefined
    expect(apiKey).toBeUndefined();
  });
});
