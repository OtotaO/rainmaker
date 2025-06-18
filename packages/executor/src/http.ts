import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import type {
  ErrorCategory,
  ErrorDetail,
  RetryPolicy,
  DurationMsSchema,
  ApiCatalogEntry,
} from './schemas';
import { z } from 'zod';
import {
  applyApiQuirks,
  checkQuirkySuccess,
  calculateCatalogBackoff,
  extractRateLimitInfo,
} from './catalog-integration';
import { globalCircuitBreaker, CircuitState } from './circuit-breaker';

// HTTP trace entry for debugging
export interface HttpTraceEntry {
  timestamp: string;
  request: {
    method: string;
    url: string;
    headers: Record<string, string>;
    body?: string;
  };
  response?: {
    status: number;
    headers: Record<string, string>;
    body: string;
    duration: number;
  };
  error?: ErrorDetail;
}

/**
 * Configuration for HTTP client with memory safety constraints.
 * 
 * Design rationale for memory limits:
 * - We enforce a default 50MB limit to prevent memory exhaustion attacks
 * - The streaming threshold (10MB) balances memory efficiency vs complexity
 * - These limits can be overridden per-API based on known requirements
 * 
 * Memory safety strategy:
 * 1. Responses under streamingThreshold are handled in memory (fast path)
 * 2. Responses above streamingThreshold use streaming (memory efficient)
 * 3. Responses above maxResponseSize are rejected (DoS protection)
 */
export interface HttpClientConfig {
  timeout: number;
  maxResponseSize?: number;  // Hard limit - reject responses larger than this (default: 50MB)
  streamingThreshold?: number; // Use streaming for responses above this size (default: 10MB)
  userAgent?: string;
}

// Constants for memory safety
const DEFAULT_MAX_RESPONSE_SIZE = 50 * 1024 * 1024; // 50MB
const DEFAULT_STREAMING_THRESHOLD = 10 * 1024 * 1024; // 10MB

/**
 * Categorizes network errors with granular detail.
 * 
 * Design rationale:
 * - While we have limited error categories, we use context fields for granularity
 * - This allows retry logic to make informed decisions
 * - DNS failures are distinguished from connection failures via context
 * - Timeout types are differentiated for proper retry strategies
 * 
 * Error code reference:
 * - ECONNABORTED: Request was aborted (usually client timeout)
 * - ETIMEDOUT: Socket timeout (connection or read timeout)  
 * - ECONNREFUSED: TCP connection refused (service down)
 * - ENOTFOUND: DNS resolution failed
 * - ECONNRESET: Connection reset by peer
 * - EPIPE: Broken pipe (connection closed during write)
 * - CERT_HAS_EXPIRED: TLS certificate expired
 * - DEPTH_ZERO_SELF_SIGNED_CERT: Self-signed certificate
 */
function categorizeNetworkError(error: AxiosError): {
  category: ErrorCategory;
  subtype: string;
  retryable: boolean;
  retryDelay?: number;
} {
  // Socket/network errors
  if (error.code === 'ECONNABORTED') {
    return {
      category: 'network_timeout',
      subtype: 'request_aborted',
      retryable: true,
      retryDelay: 1000, // Quick retry for aborted requests
    };
  }
  
  if (error.code === 'ETIMEDOUT') {
    // Could be connect timeout or read timeout
    const isConnectTimeout = !error.response;
    return {
      category: 'network_timeout',
      subtype: isConnectTimeout ? 'connect_timeout' : 'read_timeout',
      retryable: true,
      retryDelay: isConnectTimeout ? 5000 : 2000, // Longer delay for connect timeouts
    };
  }
  
  if (error.code === 'ECONNREFUSED') {
    return {
      category: 'network_connection_refused',
      subtype: 'tcp_connection_refused',
      retryable: true,
      retryDelay: 3000, // Service might be restarting
    };
  }
  
  if (error.code === 'ENOTFOUND') {
    // DNS resolution failed - could be permanent or temporary
    return {
      category: 'network_connection_refused',
      subtype: 'dns_resolution_failed',
      retryable: true, // Retry in case of temporary DNS issue
      retryDelay: 10000, // Longer delay for DNS issues
    };
  }
  
  if (error.code === 'ECONNRESET') {
    return {
      category: 'network_connection_refused',
      subtype: 'connection_reset',
      retryable: true,
      retryDelay: 2000,
    };
  }
  
  // TLS/SSL errors
  if (error.code?.startsWith('CERT_') || error.code?.includes('SSL')) {
    return {
      category: 'network_connection_refused',
      subtype: 'tls_error',
      retryable: false, // TLS errors usually require intervention
    };
  }
  
  // HTTP response errors
  if (error.response) {
    const status = error.response.status;
    
    if (status === 401) {
      return {
        category: 'auth_invalid',
        subtype: 'unauthorized',
        retryable: false, // Need new credentials
      };
    }
    
    if (status === 403) {
      return {
        category: 'auth_expired',
        subtype: 'forbidden',
        retryable: false, // Need to refresh auth
      };
    }
    
    if (status === 429) {
      // Extract retry-after if available
      const retryAfter = error.response.headers['retry-after'];
      const retryDelay = retryAfter 
        ? (isNaN(Number(retryAfter)) 
          ? new Date(retryAfter).getTime() - Date.now() 
          : Number(retryAfter) * 1000)
        : 60000; // Default to 1 minute
        
      return {
        category: 'rate_limit_burst',
        subtype: 'too_many_requests',
        retryable: true,
        retryDelay: Math.max(1000, Math.min(retryDelay, 300000)), // 1s to 5min
      };
    }
    
    if (status === 503) {
      return {
        category: 'api_unavailable',
        subtype: 'service_unavailable',
        retryable: true,
        retryDelay: 5000, // Service temporarily down
      };
    }
    
    if (status >= 500) {
      return {
        category: 'api_unexpected_status',
        subtype: 'server_error',
        retryable: status !== 501 && status !== 505, // 501 Not Implemented, 505 Version Not Supported
        retryDelay: 3000,
      };
    }
    
    if (status >= 400) {
      return {
        category: 'validation_failed',
        subtype: 'client_error',
        retryable: false, // Client errors usually need fixing
      };
    }
  }
  
  // Unknown error
  return {
    category: 'api_unexpected_status',
    subtype: 'unknown_error',
    retryable: true, // Optimistically retry unknown errors
    retryDelay: 5000,
  };
}

/**
 * Sanitizes URLs to remove sensitive information.
 * 
 * Security rationale:
 * - API keys often appear in query parameters (e.g., ?api_key=SECRET)
 * - Tokens might be in the path (e.g., /api/v1/users/TOKEN/profile)
 * - We preserve the base URL and path structure for debugging
 * - Query parameters are completely removed to prevent leaks
 * 
 * @param url - The URL to sanitize
 * @returns Sanitized URL safe for logging
 */
function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Remove all query parameters and fragments
    return `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
  } catch {
    // If URL parsing fails, return a generic message
    return '[invalid-url]';
  }
}

/**
 * Sanitizes request headers to remove sensitive information.
 * 
 * Security rationale:
 * - Authorization headers contain bearer tokens, API keys, basic auth
 * - Cookie headers may contain session tokens
 * - Custom headers often contain API keys (X-API-Key, X-Auth-Token, etc.)
 * - We preserve non-sensitive headers for debugging (Content-Type, Accept, etc.)
 * 
 * @param headers - Request headers to sanitize
 * @returns Sanitized headers safe for logging
 */
function sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
  if (!headers) return {};
  
  // Headers that should never be logged (case-insensitive)
  const sensitiveHeaders = new Set([
    'authorization',
    'cookie',
    'x-api-key',
    'x-auth-token',
    'x-access-token',
    'x-secret-key',
    'api-key',
    'auth',
    'token',
    'session',
  ]);
  
  // Headers safe to log
  const safeHeaders = new Set([
    'content-type',
    'accept',
    'user-agent',
    'content-length',
    'host',
    'connection',
    'cache-control',
  ]);
  
  const sanitized: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(headers)) {
    const lowerKey = key.toLowerCase();
    
    if (safeHeaders.has(lowerKey)) {
      // Explicitly safe headers
      sanitized[key] = value;
    } else if (sensitiveHeaders.has(lowerKey) || lowerKey.includes('key') || lowerKey.includes('token') || lowerKey.includes('secret')) {
      // Sensitive headers - log that they exist but not the value
      sanitized[key] = '[REDACTED]';
    } else {
      // Other headers - include but truncate long values
      sanitized[key] = value.length > 100 ? value.substring(0, 100) + '...' : value;
    }
  }
  
  return sanitized;
}

/**
 * Sanitizes response data to remove potentially sensitive information.
 * 
 * Security rationale:
 * - Error responses often contain internal details, stack traces, or credentials
 * - We only preserve the error type/code for debugging
 * - Full error details should be accessed through secure channels only
 * 
 * @param data - Response data to sanitize
 * @returns Sanitized data safe for logging
 */
function sanitizeResponseData(data: any): Record<string, any> {
  // Try to parse if it's a JSON string
  let parsedData = data;
  if (typeof data === 'string') {
    try {
      parsedData = JSON.parse(data);
    } catch {
      // If parsing fails, return the string type
      return { type: 'string', length: data.length };
    }
  }
  
  if (!parsedData || typeof parsedData !== 'object') {
    return { type: typeof parsedData };
  }
  
  // Whitelist of safe fields to include
  const safeFields = ['error', 'error_code', 'error_type', 'status', 'code'];
  const sanitized: Record<string, any> = {};
  
  for (const field of safeFields) {
    if (field in parsedData && typeof parsedData[field] === 'string') {
      sanitized[field] = parsedData[field].substring(0, 100); // Limit length
    }
  }
  
  return sanitized;
}

/**
 * Creates detailed error information from Axios errors.
 * 
 * Design decisions:
 * - Uses enhanced categorization for granular error details
 * - Includes retry hints based on error type
 * - Maintains security through sanitization
 * - Provides actionable suggestions
 */
function createErrorDetail(error: AxiosError, defaultRetryable: boolean): ErrorDetail {
  const categorization = categorizeNetworkError(error);
  const statusCode = error.response?.status;

  /**
   * SECURITY: Error contexts use a whitelist approach.
   * Only explicitly safe information is included to prevent:
   * - API key/token leakage in URLs
   * - Credential leakage in response bodies
   * - Internal system details exposure
   */
  const context: Record<string, any> = {
    url: sanitizeUrl(error.config?.url || ''),
    method: error.config?.method || '',
    errorSubtype: categorization.subtype,
    errorCode: error.code,
  };
  
  // Add retry hint if different from default
  if (categorization.retryDelay) {
    context.suggestedRetryDelay = categorization.retryDelay;
  }
  
  // Add retry-after header value for rate limits
  if (error.response?.status === 429 && error.response.headers['retry-after']) {
    const retryAfterValue = error.response.headers['retry-after'];
    context.retryAfter = isNaN(Number(retryAfterValue)) ? retryAfterValue : Number(retryAfterValue);
  }
  
  // Add response data if available (sanitized)
  if (error.response?.data) {
    context.responseData = sanitizeResponseData(error.response.data);
  }
  
  // For DNS errors, add hostname for debugging
  if (categorization.subtype === 'dns_resolution_failed' && error.config?.url) {
    try {
      const url = new URL(error.config.url);
      context.hostname = url.hostname;
    } catch {
      // Ignore URL parsing errors
    }
  }
  
  return {
    category: categorization.category,
    message: error.message || 'Unknown error occurred',
    code: error.code,
    statusCode,
    retryable: categorization.retryable ?? defaultRetryable,
    context,
    suggestion: getSuggestionForError(categorization.category, statusCode, categorization.subtype),
  };
}

/**
 * Provides actionable suggestions based on error details.
 * 
 * @param category - High-level error category
 * @param statusCode - HTTP status code if available
 * @param subtype - Granular error subtype for specific guidance
 */
function getSuggestionForError(category: ErrorCategory, statusCode?: number, subtype?: string): string {
  // Provide subtype-specific suggestions first
  if (subtype) {
    switch (subtype) {
      case 'dns_resolution_failed':
        return 'Check if the domain exists and DNS is configured correctly. This may be a temporary DNS issue.';
      case 'connect_timeout':
        return 'Connection timeout - the service may be down or network path is blocked. Check firewall rules.';
      case 'read_timeout':
        return 'Response timeout - the operation may be too slow. Consider increasing timeout or optimizing the request.';
      case 'tls_error':
        return 'TLS/SSL certificate issue. Verify certificate validity and trust chain.';
      case 'connection_reset':
        return 'Connection was reset. This often indicates a proxy or firewall issue.';
      case 'service_unavailable':
        return 'Service temporarily unavailable (503). Wait a moment and retry.';
      case 'too_many_requests':
        return 'Rate limit exceeded. Check Retry-After header or implement backoff.';
    }
  }
  
  // Fall back to category-based suggestions
  switch (category) {
    case 'auth_expired':
      return 'Authentication expired. Refresh token or re-authenticate.';
    case 'auth_invalid':
      return 'Invalid authentication credentials. Verify API key or token.';
    case 'rate_limit_burst':
    case 'rate_limit_daily':
      return 'Rate limit reached. Implement exponential backoff or check quota.';
    case 'network_timeout':
      return 'Request timed out. Check network latency and consider retry.';
    case 'network_connection_refused':
      return 'Connection refused. Verify endpoint URL and service availability.';
    case 'api_response_malformed':
      return 'Unexpected API response format. Check API version compatibility.';
    case 'api_endpoint_removed':
      return 'API endpoint not found. Consult latest API documentation.';
    case 'validation_failed':
      if (statusCode === 400) {
        return 'Bad request. Validate request parameters against API schema.';
      } else if (statusCode === 422) {
        return 'Unprocessable entity. Check data format and business rules.';
      }
      return 'Request validation failed. Review API requirements.';
    default:
      return 'Unexpected error. Check logs and API status page.';
  }
}

// Calculate delay with exponential backoff and optional jitter
function calculateBackoffDelay(
  attempt: number,
  policy: RetryPolicy,
  jitter: boolean = true,
): number {
  const baseDelay = Math.min(
    policy.initialDelay * Math.pow(policy.backoffMultiplier, attempt - 1),
    policy.maxDelay,
  );

  if (!jitter || !policy.jitter) {
    return baseDelay;
  }

  // Add jitter: ±25% of base delay
  const jitterRange = baseDelay * 0.25;
  const jitterValue = (Math.random() - 0.5) * 2 * jitterRange;
  return Math.round(baseDelay + jitterValue);
}

// Sleep for specified duration
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Stream response data with size enforcement.
 * 
 * This function handles large responses efficiently by:
 * 1. Streaming data in chunks to avoid memory exhaustion
 * 2. Enforcing size limits during streaming
 * 3. Providing progress tracking for observability
 * 
 * @param response - Axios response with stream data
 * @param maxSize - Maximum allowed response size
 * @returns Buffer containing the complete response
 */
async function streamResponseData(
  response: AxiosResponse<NodeJS.ReadableStream>,
  maxSize: number
): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let totalSize = 0;
  
  const stream = response.data as NodeJS.ReadableStream;
  
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk: Buffer) => {
      totalSize += chunk.length;
      
      // Enforce size limit during streaming
      if (totalSize > maxSize) {
        stream.destroy();
        reject(new Error(
          `Response size (${totalSize} bytes) exceeds maximum allowed size (${maxSize} bytes). ` +
          `This limit exists to prevent memory exhaustion.`
        ));
        return;
      }
      
      chunks.push(chunk);
    });
    
    stream.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
    
    stream.on('error', (error) => {
      reject(new Error(`Stream error: ${error.message}`));
    });
  });
}

export class HttpClient {
  private axios: AxiosInstance;
  private config: HttpClientConfig;
  private trace: HttpTraceEntry[] = [];
  private apiCatalogEntry?: ApiCatalogEntry;

  constructor(config: HttpClientConfig, apiCatalogEntry?: ApiCatalogEntry) {
    // Apply memory safety defaults
    this.config = {
      ...config,
      maxResponseSize: config.maxResponseSize ?? DEFAULT_MAX_RESPONSE_SIZE,
      streamingThreshold: config.streamingThreshold ?? DEFAULT_STREAMING_THRESHOLD,
    };
    this.apiCatalogEntry = apiCatalogEntry;

    /**
     * Axios configuration with memory safety constraints.
     * 
     * Critical safety measures:
     * - maxBodyLength/maxContentLength prevent loading huge responses
     * - These limits are enforced at the HTTP client level
     * - Responses exceeding limits throw an error before consuming memory
     * 
     * Note: We'll add streaming support for large but valid responses
     */
    this.axios = axios.create({
      timeout: config.timeout,
      maxBodyLength: this.config.maxResponseSize,
      maxContentLength: this.config.maxResponseSize,
      validateStatus: () => true, // Don't throw on any status code
      headers: {
        'User-Agent': config.userAgent || 'RainmakerExecutor/1.0',
      },
      // Disable automatic JSON parsing - we handle it explicitly
      transformResponse: [(data) => data],
    });

    // Add request/response interceptors for tracing
    this.axios.interceptors.request.use(
      (config) => {
        // Capture request start time
        const configWithMetadata = config as typeof config & { metadata?: { startTime: number } };
        configWithMetadata.metadata = { startTime: Date.now() };
        return configWithMetadata;
      },
      (error) => Promise.reject(error),
    );
  }

  /**
   * Determines if we should use streaming based on Content-Length header.
   * 
   * @param headers - Response headers
   * @returns Whether to use streaming for this response
   */
  private shouldUseStreaming(headers: Record<string, string>): boolean {
    const contentLength = parseInt(headers['content-length'] || '0', 10);
    return contentLength > (this.config.streamingThreshold || DEFAULT_STREAMING_THRESHOLD);
  }

  /**
   * Sanitizes and truncates data for trace logging.
   * 
   * Security rationale:
   * - Response/request bodies may contain passwords, tokens, or API keys
   * - We sanitize common patterns before truncation
   * - This prevents accidental credential exposure in logs
   * 
   * @param body - Response or request body (string or Buffer)
   * @param maxLength - Maximum length to include in trace
   * @returns Sanitized and truncated body string
   */
  private truncateForTrace(body: string | Buffer, maxLength: number = 1024): string {
    let bodyStr = typeof body === 'string' ? body : body.toString('utf8');
    
    // Sanitize common sensitive patterns
    // This is a defense-in-depth measure - ideally sensitive data shouldn't be here at all
    const sensitivePatterns = [
      // JSON key-value patterns
      /("(?:password|api_key|apiKey|token|secret|auth|authorization|session|.*_key|.*_token|.*_secret)"\s*:\s*)"[^"]+"/gi,
      // URL parameter patterns
      /((?:password|api_key|apiKey|token|secret|auth|key)=)[^&\s]+/gi,
      // Bearer token pattern
      /(Bearer\s+)[^\s,}"]+/gi,
      // Basic auth pattern
      /(Basic\s+)[^\s,}"]+/gi,
      // Any field containing SECRET, TOKEN, PASSWORD, KEY in the value
      /:\s*"[^"]*(?:SECRET|TOKEN|PASSWORD|KEY)[^"]*"/gi,
    ];
    
    // Apply each pattern with appropriate replacement
    for (let i = 0; i < sensitivePatterns.length; i++) {
      const pattern = sensitivePatterns[i];
      if (i === sensitivePatterns.length - 1) {
        // Last pattern doesn't have a capture group
        bodyStr = bodyStr.replace(pattern, ':"[REDACTED]"');
      } else {
        bodyStr = bodyStr.replace(pattern, '$1"[REDACTED]"');
      }
    }
    
    if (bodyStr.length <= maxLength) {
      return bodyStr;
    }
    return `${bodyStr.substring(0, maxLength)}... [truncated ${bodyStr.length - maxLength} bytes]`;
  }

  /**
   * Execute HTTP request with retry logic and circuit breaker protection.
   * 
   * Design decisions:
   * - Circuit breaker is applied per-host to isolate failures
   * - Open circuits fail fast with clear error messages
   * - Half-open state allows gradual recovery testing
   * - Circuit state is recorded in trace for debugging
   * 
   * The circuit breaker prevents:
   * 1. Wasting resources on dead services
   * 2. Cascade failures from dependent services
   * 3. Slow timeout accumulation
   * 4. Thundering herd after recovery
   */
  async executeWithRetry(
    config: AxiosRequestConfig,
    retryPolicy: RetryPolicy,
  ): Promise<{
    response?: AxiosResponse;
    error?: ErrorDetail;
    trace: HttpTraceEntry[];
  }> {
    this.trace = [];
    let lastError: ErrorDetail | undefined;
    
    // Extract hostname for circuit breaker
    let hostname: string;
    try {
      const url = new URL(config.url || '');
      hostname = url.hostname;
    } catch {
      // Invalid URL, proceed without circuit breaker
      hostname = 'unknown';
    }
    
    // Check circuit breaker before attempting request
    if (hostname !== 'unknown') {
      const circuitInfo = globalCircuitBreaker.getCircuitInfo(hostname);
      
      if (!globalCircuitBreaker.shouldAllowRequest(hostname)) {
        // Circuit is open, fail fast
        const error: ErrorDetail = {
          category: 'api_unavailable',
          message: `Circuit breaker OPEN for ${hostname}. Service has ${Math.round(circuitInfo.failureRate * 100)}% failure rate.`,
          code: 'CIRCUIT_BREAKER_OPEN',
          retryable: false, // Don't retry when circuit is open
          context: {
            hostname,
            circuitState: circuitInfo.state,
            failureRate: circuitInfo.failureRate,
            requestCount: circuitInfo.requestCount,
            nextRetryTime: circuitInfo.nextRetryTime?.toISOString(),
          },
          suggestion: `Service is experiencing high failure rate. Circuit will test recovery at ${circuitInfo.nextRetryTime?.toLocaleString()}.`,
        };
        
        // Add to trace
        const traceEntry: HttpTraceEntry = {
          timestamp: new Date().toISOString(),
          request: {
            method: config.method?.toUpperCase() || 'GET',
            url: sanitizeUrl(config.url || ''),
            headers: {},
          },
          error,
        };
        this.trace.push(traceEntry);
        
        return { error, trace: this.trace };
      }
      
      // Add circuit state to trace for debugging
      if (circuitInfo.state !== CircuitState.CLOSED) {
        console.info(`Circuit breaker ${circuitInfo.state} for ${hostname}`, circuitInfo);
      }
    }

    // Ensure headers are defined
    if (!config.headers) {
      config.headers = {};
    }

    // Apply API catalog quirks if available
    if (this.apiCatalogEntry) {
      applyApiQuirks(config, this.apiCatalogEntry);
    }

    for (let attempt = 1; attempt <= retryPolicy.maxAttempts; attempt++) {
      const traceEntry: HttpTraceEntry = {
        timestamp: new Date().toISOString(),
        request: {
          method: config.method?.toUpperCase() || 'GET',
          url: sanitizeUrl(config.url || ''),
          headers: sanitizeHeaders((config.headers as Record<string, string>) || {}),
          body: config.data ? this.truncateForTrace(JSON.stringify(config.data)) : undefined,
        },
      };

      try {
        const startTime = Date.now();
        const response = await this.axios.request(config);
        const duration = Date.now() - startTime;

        // Capture response in trace with memory safety
        // CRITICAL: Truncate response body to prevent memory issues in trace logs
        let bodyForTrace: string;
        if (Buffer.isBuffer(response.data)) {
          bodyForTrace = this.truncateForTrace(response.data);
        } else if (typeof response.data === 'string') {
          bodyForTrace = this.truncateForTrace(response.data);
        } else {
          // For objects, stringify with size limit
          const stringified = JSON.stringify(response.data);
          bodyForTrace = this.truncateForTrace(stringified);
        }
        
        traceEntry.response = {
          status: response.status,
          headers: response.headers as Record<string, string>,
          body: bodyForTrace,
          duration,
        };

        this.trace.push(traceEntry);
        
        // Record successful request in circuit breaker
        if (hostname !== 'unknown') {
          globalCircuitBreaker.recordRequest(hostname, true);
        }

        // Extract rate limit info if available
        if (this.apiCatalogEntry) {
          const rateLimitInfo = extractRateLimitInfo(
            response.headers as Record<string, string>,
            this.apiCatalogEntry,
          );

          // Add to trace entry if we got rate limit info
          if (rateLimitInfo.remaining !== undefined || rateLimitInfo.reset) {
            traceEntry.response!.headers['X-RateLimit-Info'] = JSON.stringify(rateLimitInfo);
          }
        }

        // Check if response indicates an error despite 2xx status
        if (response.status >= 200 && response.status < 300) {
          // Check for quirky success responses
          if (this.apiCatalogEntry) {
            const quirkyCheck = checkQuirkySuccess(response, this.apiCatalogEntry);
            if (quirkyCheck.isError && quirkyCheck.errorDetail) {
              lastError = quirkyCheck.errorDetail;
              traceEntry.error = lastError;

              // Check if we should retry
              if (!lastError.retryable || attempt === retryPolicy.maxAttempts) {
                return { error: lastError, trace: this.trace };
              }
              // Continue to next attempt
            } else {
              return { response, trace: this.trace };
            }
          } else {
            return { response, trace: this.trace };
          }
        } else {
          // Create error for non-2xx responses
          const error = new AxiosError(
            `Request failed with status ${response.status}`,
            'ERR_BAD_RESPONSE',
            config as InternalAxiosRequestConfig,
            null,
            response,
          );

          lastError = createErrorDetail(
            error,
            retryPolicy.retryableErrors.includes(categorizeNetworkError(error).category),
          );

          traceEntry.error = lastError;
          this.trace.push(traceEntry);
          
          // Record failure in circuit breaker
          if (hostname !== 'unknown') {
            globalCircuitBreaker.recordRequest(hostname, false, lastError.category);
          }

          // Check if we should retry
          if (!lastError.retryable || attempt === retryPolicy.maxAttempts) {
            return { error: lastError, trace: this.trace };
          }
        }
      } catch (error) {
        const axiosError = error as AxiosError;
        const configWithMetadata = config as typeof config & { metadata?: { startTime: number } };
        const duration = Date.now() - (configWithMetadata.metadata?.startTime || Date.now());

        // Network error - no response received
        lastError = createErrorDetail(
          axiosError,
          retryPolicy.retryableErrors.includes(categorizeNetworkError(axiosError).category),
        );

        traceEntry.error = lastError;

        // Try to capture partial response if connection dropped
        if (axiosError.response) {
          // Use truncation for error responses too
          let errorBodyForTrace = '';
          if (axiosError.response.data) {
            if (typeof axiosError.response.data === 'string') {
              errorBodyForTrace = this.truncateForTrace(axiosError.response.data);
            } else {
              errorBodyForTrace = this.truncateForTrace(JSON.stringify(axiosError.response.data));
            }
          }
          
          traceEntry.response = {
            status: axiosError.response.status,
            headers: axiosError.response.headers as Record<string, string>,
            body: errorBodyForTrace,
            duration,
          };
        }

        this.trace.push(traceEntry);
        
        // Record failure in circuit breaker
        if (hostname !== 'unknown') {
          const errorCategory = lastError?.category || 'unknown';
          globalCircuitBreaker.recordRequest(hostname, false, errorCategory);
        }

        // Check if we should retry
        if (!lastError.retryable || attempt === retryPolicy.maxAttempts) {
          return { error: lastError, trace: this.trace };
        }
      }

      // Calculate backoff delay if not last attempt
      if (attempt < retryPolicy.maxAttempts) {
        let delay: number;

        // Use catalog-aware backoff if available
        if (this.apiCatalogEntry && lastError) {
          delay = calculateCatalogBackoff(
            attempt,
            lastError,
            this.apiCatalogEntry,
            calculateBackoffDelay(attempt, retryPolicy),
          );
        } else {
          delay = calculateBackoffDelay(attempt, retryPolicy);
        }

        await sleep(delay);
      }
    }

    return { error: lastError, trace: this.trace };
  }

  // Get the accumulated trace
  getTrace(): HttpTraceEntry[] {
    return [...this.trace];
  }

  // Clear trace history
  clearTrace(): void {
    this.trace = [];
  }

  // Create a configured axios instance for streaming large responses
  createStreamingClient(): AxiosInstance {
    return axios.create({
      ...this.axios.defaults,
      responseType: 'stream',
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });
  }
}
