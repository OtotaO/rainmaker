import NightwatchError from './base-error';
import type { NightwatchErrorOptions } from './types';

/**
 * Error thrown when there's an issue with the environment
 */
export class EnvironmentError extends NightwatchError {
  constructor(message: string, options: Omit<NightwatchErrorOptions, 'code'> = {}) {
    super(message, {
      code: 'ENVIRONMENT_ERROR',
      statusCode: 500,
      ...options,
    });
  }
}

/**
 * Error thrown when there's a configuration issue
 */
export class ConfigurationError extends NightwatchError {
  constructor(message: string, options: Omit<NightwatchErrorOptions, 'code'> = {}) {
    super(message, {
      code: 'CONFIGURATION_ERROR',
      statusCode: 400,
      ...options,
    });
  }
}

/**
 * Error thrown when a command fails
 */
export class CommandError extends NightwatchError {
  constructor(message: string, options: Omit<NightwatchErrorOptions, 'code'> = {}) {
    super(message, {
      code: 'COMMAND_ERROR',
      statusCode: 400,
      ...options,
    });
  }
}

/**
 * Error thrown when an operation times out
 */
export class TimeoutError extends NightwatchError {
  constructor(message: string, options: Omit<NightwatchErrorOptions, 'code'> = {}) {
    super(message, {
      code: 'TIMEOUT_ERROR',
      statusCode: 408,
      ...options,
    });
  }
}

/**
 * Error thrown when input validation fails
 */
export class ValidationError extends NightwatchError {
  constructor(message: string, options: Omit<NightwatchErrorOptions, 'code'> = {}) {
    super(message, {
      code: 'VALIDATION_ERROR',
      statusCode: 400,
      ...options,
    });
  }
}

/**
 * Error thrown when authentication fails
 */
export class AuthenticationError extends NightwatchError {
  constructor(message: string, options: Omit<NightwatchErrorOptions, 'code'> = {}) {
    super(message, {
      code: 'AUTHENTICATION_ERROR',
      statusCode: 401,
      ...options,
    });
  }
}

/**
 * Error thrown when rate limits are exceeded
 */
export class RateLimitError extends NightwatchError {
  constructor(message: string, options: Omit<NightwatchErrorOptions, 'code'> = {}) {
    super(message, {
      code: 'RATE_LIMIT_ERROR',
      statusCode: 429,
      ...options,
    });
  }
}

/**
 * Error thrown when there's a dependency issue
 */
export class DependencyError extends NightwatchError {
  constructor(message: string, options: Omit<NightwatchErrorOptions, 'code'> = {}) {
    super(message, {
      code: 'DEPENDENCY_ERROR',
      statusCode: 500,
      ...options,
    });
  }
}

// Note: Common HTTP-related errors have been moved to http-errors.ts
// to avoid duplication and ensure consistent error handling
