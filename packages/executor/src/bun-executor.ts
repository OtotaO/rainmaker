/**
 * Simplified Bun-native executor implementation
 * Direct implementation without unnecessary abstractions
 */

import type {
  ActionDefinition,
  ErrorDetail,
  PlannedAction,
  StorageLocation,
} from '@rainmaker/schema/types/execution';
import type {
  ActionExecutionContext,
  ActionExecutionResult,
  ActionExecutor,
  HttpTraceEntry,
  ExecutorConfig as WorkflowExecutorConfig,
} from '@rainmaker/workflow-state/executor-interface';

import { applyAuthentication } from './auth-handler';
import { isBinaryResponse, storeBinaryResponse } from './binary-response-handler';
import {
  type FetchFunction,
  calculateBackoff,
  categorizeHttpError,
  executeHttpRequest,
} from './http-core';

// Our specific configuration that extends the workflow config
export interface BunExecutorConfig extends WorkflowExecutorConfig {
  storagePath: string; // Base path for storing files
  maxFileSize?: number; // Max file size in bytes
  defaultTimeout?: number; // Default timeout in milliseconds
  fetchFn?: FetchFunction; // Injectable fetch function
}

// Replace placeholders in URL template
function buildUrl(template: string, params: Record<string, unknown>): string {
  return template.replace(/{(\w+)}/g, (_match, key) => {
    const value = params[key];
    if (value === undefined) {
      throw new Error(`Missing URL parameter: ${key}`);
    }
    return encodeURIComponent(String(value));
  });
}

// Extract parameters by prefix (e.g., header., query., body.)
function extractParams(inputs: Record<string, unknown>, prefix: string): Record<string, string> {
  const result: Record<string, string> = {};
  const prefixWithDot = `${prefix}.`;

  for (const [key, value] of Object.entries(inputs)) {
    if (key.startsWith(prefixWithDot)) {
      const paramName = key.slice(prefixWithDot.length);
      result[paramName] = String(value);
    }
  }

  return result;
}

// Build request body based on content type
function buildRequestBody(
  inputs: Record<string, unknown>,
  contentType?: string,
): string | undefined {
  const bodyParams = extractParams(inputs, 'body');

  if (Object.keys(bodyParams).length === 0) {
    return undefined;
  }

  // Handle different content types
  if (contentType?.includes('application/json')) {
    return JSON.stringify(bodyParams);
  }
  if (contentType?.includes('application/x-www-form-urlencoded')) {
    return new URLSearchParams(bodyParams).toString();
  }
  // Default to JSON
  return JSON.stringify(bodyParams);
}

export class BunExecutor implements ActionExecutor {
  private fetchFn: FetchFunction;

  constructor(private config: BunExecutorConfig) {
    this.fetchFn = config.fetchFn || fetch;
  }

  async execute(
    _action: PlannedAction,
    definition: ActionDefinition,
    inputs: Record<string, unknown>,
    _context?: ActionExecutionContext,
  ): Promise<ActionExecutionResult> {
    const httpTrace: HttpTraceEntry[] = [];

    // Build URL from template
    const url = buildUrl(definition.endpoint.url, inputs);

    // Extract headers
    const headers: Record<string, string> = {
      ...definition.endpoint.headers,
      ...extractParams(inputs, 'header'),
    };

    // Add content type if we have body params
    if (Object.keys(extractParams(inputs, 'body')).length > 0 && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    // Build request body
    const body = buildRequestBody(inputs, headers['Content-Type']);

    // Apply authentication
    const authenticatedHeaders = await applyAuthentication(
      headers,
      definition.authentication,
      this.fetchFn,
    );

    // Retry configuration
    const retryPolicy = definition.retryPolicy || {
      maxAttempts: 3,
      initialDelayMs: 1000,
      maxDelayMs: 30000,
      backoffMultiplier: 2,
    };

    let lastError: ErrorDetail | undefined;

    // Retry loop
    for (let attempt = 1; attempt <= retryPolicy.maxAttempts; attempt++) {
      const requestTimestamp = new Date().toISOString();
      const traceEntry: HttpTraceEntry = {
        timestamp: requestTimestamp,
        request: {
          method: definition.endpoint.method,
          url,
          headers: authenticatedHeaders,
          ...(body !== undefined && { body }),
        },
      };

      try {
        // Execute HTTP request
        const response = await executeHttpRequest(
          {
            url,
            method: definition.endpoint.method,
            headers: authenticatedHeaders,
            body,
            timeout: definition.endpoint.timeout || this.config.defaultTimeout || 30000,
          },
          this.fetchFn,
        );

        // Add response to trace
        traceEntry.response = {
          status: response.status,
          headers: response.headers,
          body: response.body instanceof Buffer ? '[Binary Data]' : response.body,
          duration: response.duration,
        };
        httpTrace.push(traceEntry);

        // Handle non-2xx responses
        if (response.status < 200 || response.status >= 300) {
          const error = categorizeHttpError(new Error(`HTTP ${response.status}`), response.status);
          lastError = error; // Always update lastError

          // Check if we should retry
          if (error.retryable && attempt < retryPolicy.maxAttempts) {
            const delay = calculateBackoff(
              attempt,
              retryPolicy.initialDelayMs,
              retryPolicy.maxDelayMs,
              retryPolicy.backoffMultiplier,
            );
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          }

          // No more retries - return failure
          return {
            status: 'failure' as const,
            error,
            httpTrace,
            retryable: error.retryable,
          };
        }

        // Success! Process response
        let output: Record<string, unknown> = {};
        let outputLocation: StorageLocation | undefined;

        // Handle binary responses
        if (
          response.body instanceof Buffer &&
          isBinaryResponse(response.headers['content-type'] || '')
        ) {
          outputLocation = await storeBinaryResponse(
            response.body,
            url,
            response.headers['content-type'] || 'application/octet-stream',
            {
              basePath: this.config.storagePath,
              maxFileSize: this.config.maxFileSize || 50 * 1024 * 1024,
            },
          );
          output = {
            stored: true,
            location: outputLocation.path,
            size: outputLocation.size,
            contentType: outputLocation.contentType,
          };
        } else {
          // Parse response body
          const bodyText =
            response.body instanceof Buffer ? response.body.toString('utf-8') : response.body;

          try {
            output = JSON.parse(bodyText);
          } catch {
            // Not JSON - return as text
            output = { text: bodyText };
          }
        }

        const result: ActionExecutionResult = {
          status: 'success' as const,
          output: output as Record<string, unknown>,
          httpTrace,
        };

        if (outputLocation) {
          result.storageLocation = outputLocation;
        }

        return result;
      } catch (error) {
        // Network or other error
        const errorDetail = categorizeHttpError(error);
        traceEntry.error = errorDetail;
        httpTrace.push(traceEntry);

        // Check if we should retry
        if (errorDetail.retryable && attempt < retryPolicy.maxAttempts) {
          lastError = errorDetail;
          const delay = calculateBackoff(
            attempt,
            retryPolicy.initialDelayMs,
            retryPolicy.maxDelayMs,
            retryPolicy.backoffMultiplier,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        // No more retries
        lastError = errorDetail;
      }
    }

    // All retries exhausted
    const finalError = lastError || {
      category: 'api_unexpected_status' as const,
      message: 'Unknown error occurred',
      retryable: false,
      context: {},
    };

    return {
      status: 'failure' as const,
      error: finalError,
      httpTrace,
      retryable: finalError.retryable,
    };
  }
}

/**
 * Factory function to create a BunExecutor instance
 * Uses sensible defaults if no config provided
 */
export function createBunExecutor(config?: Partial<BunExecutorConfig>): ActionExecutor {
  const fullConfig: BunExecutorConfig = {
    storagePath: config?.storagePath || '/tmp/executor-storage',
    maxFileSize: config?.maxFileSize || 50 * 1024 * 1024, // 50MB
    defaultTimeout: config?.defaultTimeout || 30000, // 30s
    ...config,
  };

  return new BunExecutor(fullConfig);
}
