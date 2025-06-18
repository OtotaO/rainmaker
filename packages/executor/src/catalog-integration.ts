import type {
  ApiCatalogEntry,
  ErrorDetail,
  ErrorCategory,
  ApiErrorMapping,
  ApiRateLimitConfig,
  JsonValue,
} from './schemas';
import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import type { ApiCatalog } from './interfaces';

// Apply API catalog rules to enhance error handling
export async function categorizeApiError(
  error: ErrorDetail,
  catalogEntry: ApiCatalogEntry,
): Promise<ErrorDetail> {
  // Check each error mapping rule
  for (const mapping of catalogEntry.errorMappings) {
    if (matchesErrorMapping(error, mapping)) {
      return {
        ...error,
        category: mapping.category,
        retryable: mapping.retryable,
        suggestion: error.suggestion || getDefaultSuggestion(mapping.category),
      };
    }
  }

  // Check rate limiting patterns
  if (catalogEntry.rateLimiting && isRateLimitError(error, catalogEntry.rateLimiting)) {
    const resetTime = extractRateLimitReset(error, catalogEntry.rateLimiting);

    return {
      ...error,
      category: 'rate_limit_burst',
      retryable: true,
      retryAfter: resetTime,
      suggestion: resetTime
        ? `Rate limited. Retry after ${new Date(resetTime).toISOString()}`
        : 'Rate limited. Implement exponential backoff',
    };
  }

  // Return original error if no mapping found
  return error;
}

// Check if error matches a mapping rule
function matchesErrorMapping(error: ErrorDetail, mapping: ApiErrorMapping): boolean {
  // Check status code
  if (mapping.status !== undefined && error.statusCode !== mapping.status) {
    return false;
  }

  // Check error message pattern
  if (mapping.pattern) {
    const pattern = new RegExp(mapping.pattern, 'i');
    if (!pattern.test(error.message)) {
      // Also check in context
      const contextStr = JSON.stringify(error.context);
      if (!pattern.test(contextStr)) {
        return false;
      }
    }
  }

  // Check header pattern
  if (mapping.header) {
    const headerValue = error.context[`header_${mapping.header.name}`];
    if (!headerValue) {
      return false;
    }

    const headerPattern = new RegExp(mapping.header.pattern, 'i');
    if (!headerPattern.test(headerValue)) {
      return false;
    }
  }

  return true;
}

// Check if error is a rate limit error
function isRateLimitError(error: ErrorDetail, config: ApiRateLimitConfig): boolean {
  // Check status codes
  if (error.statusCode && config.detection.statusCodes.includes(error.statusCode)) {
    return true;
  }

  // Check headers
  for (const headerName of config.detection.headers) {
    if (error.context[`header_${headerName}`]) {
      return true;
    }
  }

  // Check body patterns
  if (config.detection.bodyPatterns) {
    const bodyStr = error.context.responseData || error.message;
    for (const pattern of config.detection.bodyPatterns) {
      if (new RegExp(pattern, 'i').test(bodyStr)) {
        return true;
      }
    }
  }

  return false;
}

// Extract rate limit reset time
function extractRateLimitReset(error: ErrorDetail, config: ApiRateLimitConfig): string | undefined {
  if (!config.extraction.resetHeader) {
    return undefined;
  }

  const resetValue = error.context[`header_${config.extraction.resetHeader}`];
  if (!resetValue) {
    return undefined;
  }

  // Parse based on format
  switch (config.extraction.resetFormat) {
    case 'unix_seconds':
      return new Date(parseInt(resetValue, 10) * 1000).toISOString();

    case 'unix_ms':
      return new Date(parseInt(resetValue, 10)).toISOString();

    case 'iso8601':
      return resetValue;

    default:
      // Try to parse as number (assume unix seconds)
      const parsed = parseInt(resetValue, 10);
      if (!isNaN(parsed)) {
        // If it's a large number, assume milliseconds
        if (parsed > 10000000000) {
          return new Date(parsed).toISOString();
        } else {
          return new Date(parsed * 1000).toISOString();
        }
      }
      return undefined;
  }
}

// Get default suggestion for error category
function getDefaultSuggestion(category: ErrorCategory): string {
  switch (category) {
    case 'auth_expired':
      return 'Authentication has expired. Refresh credentials and retry.';
    case 'auth_invalid':
      return 'Authentication failed. Check your API credentials.';
    case 'rate_limit_daily':
      return 'Daily rate limit reached. Wait until limit resets.';
    case 'rate_limit_burst':
      return 'Request rate too high. Slow down requests.';
    case 'network_timeout':
      return 'Request timed out. Check network connectivity or increase timeout.';
    case 'network_connection_refused':
      return 'Connection refused. Verify API endpoint is correct.';
    case 'api_response_malformed':
      return 'Invalid API response format. API may have changed.';
    case 'api_endpoint_removed':
      return 'API endpoint no longer exists. Update to new endpoint.';
    case 'api_unexpected_status':
      return 'Unexpected API response. Check API documentation.';
    case 'validation_failed':
      return 'Request validation failed. Check input parameters.';
    case 'state_inconsistent':
      return 'System state is inconsistent. Verify preconditions.';
    case 'user_cancelled':
      return 'Operation cancelled by user.';
    default:
      return 'An error occurred. Check logs for details.';
  }
}

// Apply API quirks to request configuration
export function applyApiQuirks(config: AxiosRequestConfig, catalogEntry: ApiCatalogEntry): void {
  const quirks = catalogEntry.quirks;

  // Apply custom user agent
  if (quirks.requiresUserAgent) {
    config.headers = config.headers || {};
    config.headers['User-Agent'] = quirks.requiresUserAgent;
  }

  // Handle non-standard JSON content type
  if (quirks.nonStandardJsonContentType) {
    config.headers = config.headers || {};
    config.headers['Accept'] = quirks.nonStandardJsonContentType;
  }

  // Set max response size if specified
  if (quirks.maxResponseSize) {
    config.maxContentLength = quirks.maxResponseSize;
    config.maxBodyLength = quirks.maxResponseSize;
  }
}

// Check if response indicates success despite error-like content
export function checkQuirkySuccess(
  response: AxiosResponse,
  catalogEntry: ApiCatalogEntry,
): { isError: boolean; errorDetail?: ErrorDetail } {
  if (!catalogEntry.quirks.successWithErrorBody || response.status !== 200) {
    return { isError: false };
  }

  // Check response body for error patterns
  const bodyStr = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);

  for (const errorMapping of catalogEntry.errorMappings) {
    if (errorMapping.pattern && new RegExp(errorMapping.pattern).test(bodyStr)) {
      return {
        isError: true,
        errorDetail: {
          category: errorMapping.category,
          message: `API returned success status with error: ${bodyStr.substring(0, 200)}`,
          statusCode: 200,
          retryable: errorMapping.retryable,
          context: {
            fullResponse: bodyStr,
            matchedPattern: errorMapping.pattern,
          },
          suggestion: getDefaultSuggestion(errorMapping.category),
        },
      };
    }
  }

  return { isError: false };
}

// Calculate backoff delay based on API catalog configuration
export function calculateCatalogBackoff(
  attempt: number,
  error: ErrorDetail,
  catalogEntry: ApiCatalogEntry,
  defaultDelay: number,
): number {
  // Check if we have rate limit info with reset time
  if (error.retryAfter) {
    const resetTime = new Date(error.retryAfter).getTime();
    const now = Date.now();
    if (resetTime > now) {
      // Add small buffer to avoid hitting limit immediately
      return resetTime - now + 1000;
    }
  }

  // Check for specific backoff strategy in error mappings
  const mapping = catalogEntry.errorMappings.find(
    (m) => m.category === error.category && m.backoffStrategy,
  );

  if (mapping?.backoffStrategy) {
    const rateLimitConfig = catalogEntry.rateLimiting;
    const initialDelay = rateLimitConfig?.backoffStrategy.initialDelay || defaultDelay;
    const maxDelay = rateLimitConfig?.backoffStrategy.maxDelay || 60000;

    switch (mapping.backoffStrategy) {
      case 'linear':
        return Math.min(initialDelay * attempt, maxDelay);

      case 'exponential':
        return Math.min(initialDelay * Math.pow(2, attempt - 1), maxDelay);

      case 'custom':
        // Would need custom implementation
        return defaultDelay;
    }
  }

  // Use rate limit config if available
  if (catalogEntry.rateLimiting?.backoffStrategy) {
    const strategy = catalogEntry.rateLimiting.backoffStrategy;
    const initialDelay = strategy.initialDelay || defaultDelay;
    const maxDelay = strategy.maxDelay || 60000;

    switch (strategy.type) {
      case 'linear':
        return Math.min(initialDelay * attempt, maxDelay);

      case 'exponential':
        return Math.min(initialDelay * Math.pow(2, attempt - 1), maxDelay);

      case 'respect_reset':
        // Already handled above with retryAfter
        return defaultDelay;
    }
  }

  return defaultDelay;
}

// Extract rate limit information from response headers
export function extractRateLimitInfo(
  headers: Record<string, string>,
  catalogEntry: ApiCatalogEntry,
): {
  limit?: number;
  remaining?: number;
  reset?: string;
} {
  const config = catalogEntry.rateLimiting?.extraction;
  if (!config) {
    return {};
  }

  const result: {
    limit?: number;
    remaining?: number;
    reset?: string;
  } = {};

  if (config.limitHeader && headers[config.limitHeader]) {
    result.limit = parseInt(headers[config.limitHeader], 10);
  }

  if (config.remainingHeader && headers[config.remainingHeader]) {
    result.remaining = parseInt(headers[config.remainingHeader], 10);
  }

  if (config.resetHeader && headers[config.resetHeader]) {
    const resetValue = headers[config.resetHeader];

    switch (config.resetFormat) {
      case 'unix_seconds':
        result.reset = new Date(parseInt(resetValue, 10) * 1000).toISOString();
        break;

      case 'unix_ms':
        result.reset = new Date(parseInt(resetValue, 10)).toISOString();
        break;

      case 'iso8601':
        result.reset = resetValue;
        break;
    }
  }

  return result;
}
