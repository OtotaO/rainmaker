// File: packages/api/src/__tests__/anthropic.test.ts

import { expect, test, describe, beforeEach, afterEach, vi } from 'vitest';
import { Anthropic } from '@anthropic-ai/sdk';
import * as fs from 'fs';
import * as path from 'path';

// Note: Mocks are now defined in vitest.setup.ts

describe('Anthropic Integration', () => {
  let anthropic: any;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original process.env
    originalEnv = { ...process.env };
    
    // Clear mocks
    vi.clearAllMocks();
    
    // Create a new instance of Anthropic for each test
    anthropic = new Anthropic({ apiKey: 'test-api-key' });
  });

  afterEach(() => {
    // Restore original process.env
    process.env = originalEnv;
  });

  test.skip('should read API key from .env file', () => {
    // Import the module that reads the API key
    const testEnv = require('../test-env.cjs');
    
    // Check that readFileSync was called
    expect(fs.readFileSync).toHaveBeenCalled();
    
    // Check that the API key is available in the environment
    expect(process.env.ANTHROPIC_API_KEY).toBe('test-api-key');
  });

  test('should create an Anthropic client with the API key', () => {
    // Check that Anthropic constructor was called with the correct API key
    expect(Anthropic).toHaveBeenCalledWith({ apiKey: 'test-api-key' });
  });

  test('should successfully call the Anthropic API', async () => {
    // Call the Anthropic API
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 100,
      messages: [{ role: 'user', content: 'Say hello!' }]
    });
    
    // Check that the API was called with the correct parameters
    expect(anthropic.messages.create).toHaveBeenCalledWith({
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 100,
      messages: [{ role: 'user', content: 'Say hello!' }]
    });
    
    // Check that the response has the expected structure
    expect(response).toHaveProperty('content');
    expect(response.content[0].text).toBe('This is a test response from the mocked Anthropic API.');
  });

  test('should handle API errors gracefully', async () => {
    // Mock the API to throw an error
    anthropic.messages.create = vi.fn().mockRejectedValue(new Error('API Error'));
    
    // Call the API and expect it to throw
    await expect(anthropic.messages.create({
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 100,
      messages: [{ role: 'user', content: 'Say hello!' }]
    })).rejects.toThrow('API Error');
  });
});
