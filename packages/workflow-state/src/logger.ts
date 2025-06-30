/**
 * Structured logging for workflow execution
 *
 * In production, this would integrate with your logging infrastructure
 * (e.g., Winston, Pino, Datadog, etc.)
 */

export interface LogContext {
  executionId?: string;
  planId?: string;
  actionId?: string;
  [key: string]: unknown;
}

export class WorkflowLogger {
  private context: LogContext;

  constructor(baseContext: LogContext = {}) {
    this.context = baseContext;
  }

  /**
   * Create a child logger with additional context
   */
  child(context: LogContext): WorkflowLogger {
    return new WorkflowLogger({
      ...this.context,
      ...context,
    });
  }

  /**
   * Log info level message
   */
  info(message: string, data?: Record<string, unknown>): void {
    console.log(
      JSON.stringify({
        level: 'info',
        message,
        timestamp: new Date().toISOString(),
        ...this.context,
        ...data,
      }),
    );
  }

  /**
   * Log warning level message
   */
  warn(message: string, data?: Record<string, unknown>): void {
    console.warn(
      JSON.stringify({
        level: 'warn',
        message,
        timestamp: new Date().toISOString(),
        ...this.context,
        ...data,
      }),
    );
  }

  /**
   * Log error level message
   */
  error(message: string, error?: unknown, data?: Record<string, unknown>): void {
    const errorData: Record<string, unknown> = {
      level: 'error',
      message,
      timestamp: new Date().toISOString(),
      ...this.context,
      ...data,
    };

    if (error instanceof Error) {
      errorData['error'] = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    } else {
      errorData['error'] = String(error);
    }

    console.error(JSON.stringify(errorData));
  }

  /**
   * Log metrics/measurements
   */
  metric(name: string, value: number, tags?: Record<string, string>): void {
    console.log(
      JSON.stringify({
        level: 'metric',
        metric: name,
        value,
        tags: {
          ...this.context,
          ...tags,
        },
        timestamp: new Date().toISOString(),
      }),
    );
  }
}

// Default logger instance
export const logger = new WorkflowLogger();
