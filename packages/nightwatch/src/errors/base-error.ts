import type { NightwatchErrorOptions } from './types';

/**
 * Base error class that all Nightwatch errors should extend.
 * Provides consistent error handling and formatting across the application.
 */
class NightwatchError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: unknown;
  public readonly cause?: unknown;

  constructor(message: string, options: NightwatchErrorOptions) {
    super(message);

    // Set the error name to the class name
    Object.defineProperty(this, 'name', {
      value: this.constructor.name,
      configurable: true,
      writable: true
    });

    // Set error properties from options
    this.code = options.code;
    this.statusCode = options.statusCode || 500;
    this.isOperational = options.isOperational ?? true;
    this.details = options.details;
    this.cause = options.cause;

    // Capture stack trace, excluding constructor call from it
    Error.captureStackTrace?.(this, this.constructor);
  }

  /**
   * Convert error to a plain object for JSON serialization
   */
  public toJSON(): Record<string, unknown> {
    const result: Record<string, unknown> = {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      isOperational: this.isOperational,
    };

    // Only include properties if they exist
    if (this.details !== undefined) {
      result.details = this.details;
    }

    if (this.stack) {
      result.stack = this.stack;
    }

    if (this.cause !== undefined) {
      result.cause = this.cause;
    }

    return result;
  }

  /**
   * Convert error to string representation
   */
  public override toString(): string {
    return `${this.name} [${this.code}]: ${this.message}`;
  }
}

// Export only as default export
export default NightwatchError;
