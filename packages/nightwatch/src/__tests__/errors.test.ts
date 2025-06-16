import { describe, expect, it } from 'bun:test';
import {
  NightwatchError,
  EnvironmentError,
  ConfigurationError,
  CommandError,
  TimeoutError,
  ValidationError,
  AuthenticationError,
  RateLimitError,
  DependencyError,
  NotFoundError,
  // Import HTTP errors directly from http-errors
} from '../errors';
import {
  BadRequestError as HttpBadRequestError,
  ForbiddenError as HttpForbiddenError,
  NotFoundError as HttpNotFoundError,
  NotImplementedError as HttpNotImplementedError,
  ConflictError as HttpConflictError,
} from '../errors/http-errors';

describe('Custom Errors', () => {
  describe('NightwatchError', () => {
    it('should create a basic error', () => {
      const error = new NightwatchError('Test error', { code: 'TEST_ERROR' });
      
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(NightwatchError);
      expect(error.name).toBe('NightwatchError');
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.statusCode).toBe(500);
      expect(error.isOperational).toBe(true);
      expect(error.stack).toBeDefined();
    });

    it('should include details when provided', () => {
      const details = { key: 'value' };
      const error = new NightwatchError('Test error', { 
        code: 'TEST_ERROR',
        details 
      });
      
      expect(error.details).toEqual(details);
    });

    it('should convert to JSON', () => {
      const error = new NightwatchError('Test error', { code: 'TEST_ERROR' });
      const json = error.toJSON();
      
      expect(json).toMatchObject({
        name: 'NightwatchError',
        message: 'Test error',
        code: 'TEST_ERROR',
        statusCode: 500,
        isOperational: true,
      });
      expect(json.stack).toBeDefined();
    });

    it('should convert to string', () => {
      const error = new NightwatchError('Test error', { code: 'TEST_ERROR', statusCode: 400 });
      expect(error.toString()).toBe('NightwatchError [TEST_ERROR]: Test error');
    });
  });

  describe('Specific Error Types', () => {
    it('should create an EnvironmentError', () => {
      const error = new EnvironmentError('API_KEY');

      expect(error).toBeInstanceOf(NightwatchError);
      expect(error.name).toBe('EnvironmentError');
      expect(error.message).toBe('API_KEY');
      expect(error.code).toBe('ENVIRONMENT_ERROR');
      expect(error.statusCode).toBe(500);
    });

    it('should create a ConfigurationError', () => {
      const error = new ConfigurationError('Invalid config', { details: { key: 'invalid' } });

      expect(error).toBeInstanceOf(NightwatchError);
      expect(error.name).toBe('ConfigurationError');
      expect(error.message).toBe('Invalid config');
      expect(error.code).toBe('CONFIGURATION_ERROR');
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual({ key: 'invalid' });
    });

    it('should create a CommandError', () => {
      const stderr = 'Command failed';
      const error = new CommandError('Command failed', {
        details: {
          command: 'git pull',
          exitCode: 1,
          stderr: stderr,
        },
      });

      expect(error).toBeInstanceOf(NightwatchError);
      expect(error.name).toBe('CommandError');
      expect(error.message).toBe('Command failed');
      expect(error.code).toBe('COMMAND_ERROR');
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual({
        command: 'git pull',
        exitCode: 1,
        stderr: 'Command failed',
      });
    });

    it('should create a TimeoutError', () => {
      const error = new TimeoutError('Operation timed out', {
        details: {
          operation: 'database query',
          timeoutMs: 5000,
        },
      });

      expect(error).toBeInstanceOf(NightwatchError);
      expect(error.name).toBe('TimeoutError');
      expect(error.message).toBe('Operation timed out');
      expect(error.code).toBe('TIMEOUT_ERROR');
      expect(error.statusCode).toBe(408);
      expect(error.details).toEqual({
        operation: 'database query',
        timeoutMs: 5000,
      });
    });
  });

  describe('HTTP Errors', () => {
    it('should create a BadRequestError', () => {
      const error = new HttpBadRequestError('Invalid request');
      
      expect(error).toBeInstanceOf(HttpBadRequestError);
      expect(error.message).toBe('Invalid request');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('HTTP_BAD_REQUEST');
    });

    it('should create a ForbiddenError', () => {
      const error = new HttpForbiddenError('Access denied');
      
      expect(error).toBeInstanceOf(HttpForbiddenError);
      expect(error.message).toBe('Access denied');
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe('HTTP_FORBIDDEN');
    });

    it('should create a NotFoundError', () => {
      // Testing HTTP version
      const httpError = new HttpNotFoundError('Resource not found');
      expect(httpError).toBeInstanceOf(HttpNotFoundError);
      expect(httpError.message).toBe('Resource not found');
      expect(httpError.statusCode).toBe(404);
      expect(httpError.code).toBe('HTTP_NOT_FOUND');
      
      // Testing core version
      const coreError = new NotFoundError('Resource not found', {
        details: { resourceType: 'user', id: '123' },
      });
      expect(coreError).toBeInstanceOf(NotFoundError);
      expect(coreError.message).toBe('Resource not found');
      expect(coreError.statusCode).toBe(404);
      expect(coreError.code).toBe('HTTP_NOT_FOUND');
      expect(coreError.details).toEqual({ resourceType: 'user', id: '123' });
    });
  });

  describe('RateLimitError', () => {
    it('should create a RateLimitError with default values', () => {
      // Using the core RateLimitError which takes a message and options
      const error = new RateLimitError('Rate limit exceeded', { 
        details: { retryAfter: 60 } 
      });
      
      expect(error).toBeInstanceOf(RateLimitError);
      expect(error.name).toBe('RateLimitError');
      expect(error.message).toBe('Rate limit exceeded');
      expect(error.statusCode).toBe(429);
      expect(error.code).toBe('RATE_LIMIT_ERROR');
      expect(error.details).toEqual({ retryAfter: 60 });
    });
  });
});
