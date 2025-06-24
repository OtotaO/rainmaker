/**
 * Core HTTP client using Bun's native fetch
 * Simplified from the complex multi-layer abstraction
 */

import type { Authentication, ErrorDetail } from '@rainmaker/schema/types/execution';

// Simple error categorization based on status/error
export function categorizeHttpError(error: unknown, statusCode?: number): ErrorDetail {
  // Network errors
  if (error instanceof TypeError) {
    return {
      category: 'network_connection_refused',
      message: error.message,
      retryable: true,
      context: {},
    };
  }

  // Status code based categorization
  if (statusCode) {
    if (statusCode === 401) {
      return {
        category: 'auth_invalid',
        message: 'Authentication failed',
        statusCode,
        retryable: false,
        context: {},
      };
    }
    if (statusCode === 429) {
      return {
        category: 'rate_limit_burst',
        message: 'Rate limit exceeded',
        statusCode,
        retryable: true,
        context: {},
      };
    }
    if (statusCode >= 500) {
      return {
        category: 'api_unexpected_status',
        message: `Server error: ${statusCode}`,
        statusCode,
        retryable: true,
        context: {},
      };
    }
    if (statusCode >= 400) {
      return {
        category: 'validation_failed',
        message: `Client error: ${statusCode}`,
        statusCode,
        retryable: false,
        context: {},
      };
    }
  }

  // Generic error
  return {
    category: 'api_unexpected_status',
    message: error instanceof Error ? error.message : 'Unknown error',
    retryable: false,
    context: {},
  };
}

// Apply authentication to request (sync auth only - OAuth2 handled in auth-handler.ts)
export function applyAuth(
  headers: Record<string, string>,
  auth?: Authentication,
): Record<string, string> {
  if (!auth) return headers;

  switch (auth.type) {
    case 'bearer':
      return { ...headers, Authorization: `Bearer ${auth.token}` };

    case 'api_key':
      return { ...headers, [auth.header]: auth.value };

    case 'basic': {
      const encoded = btoa(`${auth.username}:${auth.password}`);
      return { ...headers, Authorization: `Basic ${encoded}` };
    }

    case 'oauth2_client_credentials':
      // OAuth2 requires async token exchange - handled in auth-handler.ts
      return headers;

    default:
      return headers;
  }
}

// Simple exponential backoff calculation
export function calculateBackoff(
  attempt: number,
  initialDelayMs = 1000,
  maxDelayMs = 30000,
  multiplier = 2,
): number {
  const delay = initialDelayMs * multiplier ** (attempt - 1);
  return Math.min(delay, maxDelayMs);
}

// Core HTTP request with minimal abstraction
export interface HttpRequest {
  url: string;
  method: string;
  headers?: Record<string, string>;
  body?: string | Buffer | undefined;
  timeout?: number;
}

export interface HttpResponse {
  status: number;
  headers: Record<string, string>;
  body: string | Buffer;
  duration: number;
}

// Fetch function type for dependency injection
export type FetchFunction = typeof fetch;

export async function executeHttpRequest(
  request: HttpRequest,
  fetchFn: FetchFunction = fetch,
): Promise<HttpResponse> {
  const startTime = Date.now();

  try {
    const fetchOptions: RequestInit = {
      method: request.method,
      headers: request.headers || {},
    };

    if (request.body !== undefined) {
      fetchOptions.body = request.body instanceof Buffer ? request.body.toString() : request.body;
    }

    if (request.timeout) {
      fetchOptions.signal = AbortSignal.timeout(request.timeout);
    }

    const response = await fetchFn(request.url, fetchOptions);

    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    // Handle binary responses
    const contentType = response.headers.get('content-type') || '';
    const isBinary =
      contentType.includes('image/') ||
      contentType.includes('application/pdf') ||
      contentType.includes('application/octet-stream');

    const body = isBinary ? Buffer.from(await response.arrayBuffer()) : await response.text();

    return {
      status: response.status,
      headers: responseHeaders,
      body,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    // Re-throw with duration for tracing
    const duration = Date.now() - startTime;
    if (error instanceof Error) {
      // Add duration to error for tracing purposes
      Object.defineProperty(error, 'duration', {
        value: duration,
        enumerable: true,
      });
    }
    throw error;
  }
}
