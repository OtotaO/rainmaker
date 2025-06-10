/**
 * Options for creating a NightwatchError
 */
export interface NightwatchErrorOptions {
  /**
   * Error name (defaults to the name of the error class)
   */
  name?: string;
  
  /**
   * Machine-readable error code
   */
  code: string;
  
  /**
   * HTTP status code (defaults to 500)
   */
  statusCode?: number;
  
  /**
   * Whether this is an operational error (default: true)
   */
  isOperational?: boolean;
  
  /**
   * Additional error details
   */
  details?: unknown;
  
  /**
   * The original error that caused this error
   */
  cause?: unknown;
  
  /**
   * Stack trace to use instead of capturing a new one
   */
  stack?: string;
}

/**
 * Interface for the NightwatchError class
 */
export interface INightwatchError extends Error {
  code: string;
  statusCode: number;
  isOperational: boolean;
  details?: unknown;
  cause?: unknown;
  toJSON(): Record<string, unknown>;
}

/**
 * Type guard to check if an error is a NightwatchError
 */
export function isNightwatchError(error: unknown): error is INightwatchError {
  return (
    error instanceof Error &&
    'code' in error &&
    typeof error.code === 'string' &&
    'statusCode' in error &&
    typeof error.statusCode === 'number' &&
    'isOperational' in error &&
    typeof error.isOperational === 'boolean' &&
    'toJSON' in error &&
    typeof error.toJSON === 'function'
  );
}
