## 1. Your Role and Mission

You are a senior systems engineer specializing in reliability and resilience. Your mission is to implement the **Error Recovery Manager**. This module acts as a centralized brain for handling complex failures that go beyond simple retries. When an action fails in a specific, recoverable way, your module will be triggered to orchestrate the recovery process, such as refreshing an expired token and then retrying the action.

### Product Context: The "Why" Behind Your Work

Before you begin, it's important to understand the product you are helping to build.

You are contributing to an advanced, resilient automation platform. The platform's core purpose is to allow developers to define and reliably execute complex, multi-step workflows that interact with external APIs and web services.

Our users are developers and technical operations teams who need to automate critical business processes, such as data pipelines, customer onboarding sequences, or incident response actions. They choose our platform because they need a "reliable layer" to build upon, abstracting away the unreliability of third-party systems.

Therefore, the single most important quality of this system is resilience. Every decision you make—from naming variables to phrasing error messages to handling edge cases—should prioritize robustness, explicit error handling, and clear, debuggable logging over raw performance or code brevity.

A helpful mental model is to think of this platform as an enterprise-grade "Zapier for code," where every step is durable and every failure is a captured, analyzable event, not a silent crash.

Your module is a critical component in this chain of reliability. Its correctness and robustness directly impact the entire platform's value to our users.

## 2. Core Architectural Principles

*   **Reactive and Event-Driven**: Your module is a Trigger.dev job that listens for `error.occurred` events. It does not run unless there is a failure.
*   **Rule-Based**: Your core logic will be a set of rules that map specific error categories to specific recovery strategies.
*   **Orchestrator of Recovery**: You will not execute recovery steps directly but will orchestrate them by emitting events (e.g., triggering another action) to other system modules.

## 3. Your Complete Work Package: Error Recovery Manager Specifications

Implement your module according to these exact specifications. The package name for this module is `error-recovery-manager`.

### 3.1. Purpose & Responsibilities
*   Implement sophisticated error recovery strategies beyond simple retries.
*   Handle complex recovery flows, such as refreshing an expired auth token.
*   Act as the "last resort" for errors that the Action Executor's basic retry policy cannot handle.

### 3.2. Trigger.dev Job Definition
```tsx
// This job should be in packages/error-recovery-manager/error-recovery-manager-jobs.ts
const handleErrorJob = client.defineJob({
  id: "error-handle",
  name: "Handle Execution Error",
  version: "1.0.0",
  trigger: eventTrigger({
    name: "error.occurred",
    schema: z.object({
      executionId: UUIDSchema,
      actionId: z.string(),
      error: ErrorDetailSchema,
      attemptNumber: z.number()
    })
  }),
  run: async (payload, io, ctx) => {
    // 1. Inspect payload.error.category.
    // 2. Based on the category, select a recovery strategy.
    // 3. Consult the ApiCatalog for any vendor-specific overrides for this error.
    // 4. Execute the strategy (e.g., for 'auth_expired', find the token refresh action and emit an `action.execute.requested` event for it).
    // 5. If recovery is successful, you may re-trigger the original failed action.
    // 6. If recovery is not possible or fails, emit a definitive `plan.execute.failed` event.
  }
});
```

### 3.3. Acceptance Criteria
*   **RECOVERY-001**: The `handleErrorJob` correctly routes logic based on the `ErrorCategorySchema` from the incoming event.
*   **RECOVERY-002**: For an `auth_expired` error, the manager attempts to trigger a defined token-refresh action and, upon its success, retries the original failed action.
*   **RECOVERY-003**: For a `rate_limit_burst` error, the manager schedules a delayed retry using `io.sleep()`, respecting the `retryAfter` timestamp if provided in the error details.
*   **RECOVERY-004**: For a `network_timeout` error, the manager can retry the action, potentially with an increased timeout override.
*   **RECOVERY-005**: The manager must track recovery attempts to prevent infinite loops (e.g., if the recovery action itself fails). After a configured number of attempts, it must give up.
*   **RECOVERY-006**: The manager can consult the `ApiCatalog` to see if a vendor-specific recovery strategy exists for a given error code or message.
*   **RECOVERY-007**: If recovery is successful, the manager ensures the overall plan state is updated to reflect the success.
*   **RECOVERY-008**: If recovery fails, the manager is responsible for transitioning the entire plan to a 'failed' state.

## 4. Required Global Dependencies: Schemas & Interfaces

Your implementation MUST use these exact Zod schemas and TypeScript interfaces.

### 4.1. Global Schemas
```tsx
import { z } from 'zod';

// Branded types for type-safe IDs
const UserIdSchema = z.string().uuid().brand('UserId')
  .describe('Unique identifier for a user in the system');

const CustomerIdSchema = z.string().uuid().brand('CustomerId')
  .describe('Unique identifier for a customer account');

const ExecutionIdSchema = z.string().uuid().brand('ExecutionId')
  .describe('Unique identifier for a plan execution instance');

const ActionIdSchema = z.string().brand('ActionId')
  .describe('Unique identifier for an action within a plan');

const PatternIdSchema = z.string().uuid().brand('PatternId')
  .describe('Unique identifier for a learned execution pattern');

// Base types with rich descriptions
const ISODateTimeSchema = z.string()
  .datetime()
  .describe('ISO 8601 datetime string with timezone information');

const UUIDSchema = z.string()
  .uuid()
  .describe('RFC 4122 UUID v4 for unique identification');

const URLSchema = z.string()
  .url()
  .describe('Fully qualified URL including protocol');

const DurationMsSchema = z.number()
  .int()
  .nonnegative()
  .describe('Duration in milliseconds');

// Error modeling - explicit failure types
const ErrorCategorySchema = z.enum([
  'auth_expired',
  'auth_invalid',
  'rate_limit_daily',
  'rate_limit_burst',
  'network_timeout',
  'network_connection_refused',
  'api_response_malformed',
  'api_endpoint_removed',
  'api_unexpected_status',
  'validation_failed',
  'state_inconsistent',
  'user_cancelled'
]).describe('Categorization of error types for proper handling and retry logic');

const ErrorDetailSchema = z.object({
  category: ErrorCategorySchema,
  message: z.string().describe('Human-readable error description'),
  code: z.string().optional().describe('API-specific error code if available'),
  statusCode: z.number().int().optional().describe('HTTP status code if applicable'),
  retryable: z.boolean().describe('Whether this error type should trigger automatic retry'),
  retryAfter: ISODateTimeSchema.optional().describe('Earliest time to retry if rate limited'),
  context: z.record(z.string(), z.string()).describe('Additional error context for debugging'),
  suggestion: z.string().optional().describe('Suggested remediation for the error')
}).describe('Comprehensive error information for debugging and recovery');

// Storage schemas - local filesystem only
const StorageLocationSchema = z.object({
  provider: z.literal('local').describe('Storage backend type - local filesystem only'),
  path: z.string().describe('Filesystem path to the stored data'),
  size: z.number().int().nonnegative().describe('Size in bytes'),
  checksum: z.string().describe('SHA-256 checksum of content'),
  contentType: z.string().describe('MIME type of stored content'),
  metadata: z.record(z.string(), z.string()).describe('Additional metadata')
}).describe('Location and metadata for stored data');

// API Catalog interface - defines vendor-specific behavior
const ApiErrorMappingSchema = z.object({
  pattern: z.string().optional().describe('Regex pattern to match error message'),
  status: z.number().int().optional().describe('HTTP status code to match'),
  header: z.object({
    name: z.string().describe('Header name to check'),
    pattern: z.string().describe('Regex pattern for header value')
  }).optional().describe('Header-based error detection'),
  category: ErrorCategorySchema.describe('How to categorize this error'),
  retryable: z.boolean().describe('Whether this error should be retried'),
  backoffStrategy: z.enum(['exponential', 'linear', 'custom']).optional()
    .describe('Specific backoff strategy for this error')
}).describe('Rule for mapping API-specific errors to standard categories');

const ApiRateLimitConfigSchema = z.object({
  detection: z.object({
    statusCodes: z.array(z.number().int()).describe('Status codes indicating rate limit'),
    headers: z.array(z.string()).describe('Headers that indicate rate limiting'),
    bodyPatterns: z.array(z.string()).optional().describe('Response body patterns')
  }).describe('How to detect rate limiting'),
  extraction: z.object({
    limitHeader: z.string().optional().describe('Header containing request limit'),
    remainingHeader: z.string().optional().describe('Header with remaining requests'),
    resetHeader: z.string().optional().describe('Header with reset timestamp'),
    resetFormat: z.enum(['unix_seconds', 'unix_ms', 'iso8601']).optional()
      .describe('Format of reset timestamp')
  }).describe('How to extract rate limit information'),
  backoffStrategy: z.object({
    type: z.enum(['exponential', 'linear', 'respect_reset']).describe('Backoff algorithm'),
    initialDelay: DurationMsSchema.optional().describe('Initial retry delay'),
    maxDelay: DurationMsSchema.optional().describe('Maximum retry delay')
  }).describe('How to handle rate limit backoff')
}).describe('API-specific rate limiting behavior');

const ApiQuirksSchema = z.object({
  successWithErrorBody: z.boolean().default(false)
    .describe('API returns 200 OK with error details in response body'),
  errorContentType: z.string().optional()
    .describe('Content-Type used for error responses (if different from success)'),
  emptyResponseOn204: z.boolean().default(true)
    .describe('API returns empty body on 204 No Content'),
  binaryErrorResponses: z.boolean().default(false)
    .describe('API might return binary data on errors'),
  nonStandardJsonContentType: z.string().optional()
    .describe('API uses non-standard Content-Type for JSON (e.g., text/json)'),
  requiresUserAgent: z.string().optional()
    .describe('Specific User-Agent required by API'),
  maxResponseSize: z.number().int().positive().optional()
    .describe('Maximum expected response size in bytes')
}).describe('API-specific quirks and non-standard behaviors');

const ApiCatalogEntrySchema = z.object({
  apiId: z.string().describe('Unique identifier for this API'),
  name: z.string().describe('Human-readable API name'),
  version: z.string().describe('API version this entry applies to'),
  baseUrl: URLSchema.describe('Base URL for the API'),

  errorMappings: z.array(ApiErrorMappingSchema)
    .describe('Rules for categorizing API-specific errors'),

  rateLimiting: ApiRateLimitConfigSchema.optional()
    .describe('API-specific rate limiting configuration'),

  quirks: ApiQuirksSchema
    .describe('Non-standard behaviors of this API'),

  healthCheck: z.object({
    endpoint: z.string().describe('Endpoint to verify API availability'),
    expectedStatus: z.number().int().describe('Expected HTTP status'),
    timeout: DurationMsSchema.describe('Health check timeout')
  }).optional().describe('How to check if API is available'),

  notes: z.string().optional()
    .describe('Human-readable notes about this API')
}).describe('Complete behavioral definition for a specific API');
const AuthenticationSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('bearer').describe('Bearer token in Authorization header'),
    token: z.string().describe('The bearer token value'),
    tokenFrom: z.enum(['env', 'user_input', 'oauth_flow']).describe('Source of the token')
  }),
  z.object({
    type: z.literal('api_key').describe('API key authentication'),
    header: z.string().describe('Header name for the API key'),
    value: z.string().describe('The API key value'),
    valueFrom: z.enum(['env', 'user_input']).describe('Source of the API key')
  }),
  z.object({
    type: z.literal('oauth2').describe('OAuth 2.0 authentication flow'),
    clientId: z.string().describe('OAuth client ID'),
    clientSecret: z.string().describe('OAuth client secret'),
    tokenUrl: URLSchema.describe('Token endpoint URL'),
    scope: z.array(z.string()).describe('Required OAuth scopes'),
    refreshToken: z.string().optional().describe('Refresh token if available')
  }),
  z.object({
    type: z.literal('custom').describe('Custom authentication logic'),
    handler: z.string().describe('Name of custom auth handler function')
  })
]).describe('Authentication configuration for API calls');

const RetryPolicySchema = z.object({
  maxAttempts: z.number().int().min(1).max(10).describe('Maximum retry attempts including initial'),
  initialDelay: DurationMsSchema.describe('Initial backoff delay in ms'),
  maxDelay: DurationMsSchema.describe('Maximum backoff delay in ms'),
  backoffMultiplier: z.number().min(1).max(5).describe('Exponential backoff multiplier'),
  retryableErrors: z.array(ErrorCategorySchema).describe('Error categories that trigger retry'),
  jitter: z.boolean().describe('Add randomness to prevent thundering herd')
}).describe('Retry policy configuration for handling transient failures');

const ActionDefinitionSchema = z.object({
  id: z.string().describe('Unique identifier for this action type'),
  name: z.string().describe('Human-readable action name'),
  description: z.string().describe('Detailed description of what this action does'),
  version: z.string().regex(/^\d+\.\d+\.\d+$/).describe('Semantic version of action definition'),

  endpoint: z.object({
    url: URLSchema.describe('Base URL with {param} placeholders for substitution'),
    method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).describe('HTTP method'),
    headers: z.record(z.string(), z.string()).describe('Static headers to include'),
    timeout: DurationMsSchema.describe('Request timeout in milliseconds')
  }).describe('HTTP endpoint configuration'),

  authentication: AuthenticationSchema.optional().describe('Authentication requirements'),

  inputSchema: z.record(z.string(), z.string()).describe('JSON schema for input validation'),
  outputSchema: z.record(z.string(), z.string()).describe('JSON schema for output parsing'),

  retryPolicy: RetryPolicySchema.describe('How to handle failures'),

  knownErrors: z.array(z.object({
    pattern: z.string().describe('Regex to match error message'),
    category: ErrorCategorySchema.describe('Error categorization'),
    suggestion: z.string().describe('How to fix this error')
  })).describe('Known error patterns for better error handling'),

  rateLimit: z.object({
    requests: z.number().int().positive().describe('Number of requests allowed'),
    window: DurationMsSchema.describe('Time window in milliseconds'),
    scope: z.enum(['global', 'per_user', 'per_ip']).describe('Rate limit scope')
  }).optional().describe('Rate limiting configuration'),

  examples: z.array(z.object({
    name: z.string().describe('Example scenario name'),
    input: z.record(z.string(), z.string()).describe('Example input data'),
    output: z.record(z.string(), z.string()).describe('Expected output')
  })).describe('Example usage for testing and documentation')
}).describe('Complete definition of an executable action');

// Execution plan schemas
const ActionReferenceSchema = z.string()
  .regex(/^\$\{[a-zA-Z0-9_]+\.[a-zA-Z0-9_.[\]]+\}$/)
  .describe('Reference to another action output like ${actionId.output.field}');

const PlannedActionSchema = z.object({
  id: ActionIdSchema.describe('Unique ID within the execution plan'),
  actionDefinitionId: z.string().describe('References ActionDefinition.id'),

  inputs: z.record(
    z.string(),
    z.union([
      z.string().describe('Literal string value'),
      z.number().describe('Literal number value'),
      z.boolean().describe('Literal boolean value'),
      ActionReferenceSchema.describe('Reference to another action output')
    ])
  ).describe('Input values with possible references to other actions'),

  dependencies: z.array(ActionIdSchema).describe('Action IDs that must complete first'),

  condition: z.object({
    if: ActionReferenceSchema.describe('Reference to boolean value'),
    then: z.literal('execute').describe('Execute if condition is true'),
    else: z.enum(['skip', 'fail']).describe('Action if condition is false')
  }).optional().describe('Conditional execution based on previous results'),

  errorHandling: z.object({
    continueOnFailure: z.boolean().describe('Continue plan if this action fails'),
    fallbackValue: z.record(z.string(), z.string()).optional().describe('Use if action fails'),
    alternativeActionId: ActionIdSchema.optional().describe('Try this action if primary fails')
  }).describe('How to handle action failures'),

  userConfirmation: z.object({
    required: z.boolean().describe('Pause execution for user confirmation'),
    title: z.string().describe('Confirmation dialog title'),
    message: z.string().describe('What user is confirming'),
    timeout: DurationMsSchema.optional().describe('Auto-reject after timeout')
  }).optional().describe('User confirmation requirements')
}).describe('A single action within an execution plan');

const ExecutionPlanSchema = z.object({
  id: ExecutionIdSchema.describe('Unique plan identifier'),
  name: z.string().describe('Human-readable plan name'),
  description: z.string().describe('What this plan accomplishes'),

  intent: z.object({
    original: z.string().describe('Original user request in natural language'),
    interpreted: z.string().describe('System interpretation of the request'),
    confidence: z.number().min(0).max(1).describe('Confidence in interpretation')
  }).describe('User intent and interpretation'),

  actions: z.array(PlannedActionSchema).describe('Ordered list of actions to execute'),

  expectedOutcome: z.object({
    description: z.string().describe('What success looks like'),
    validations: z.array(z.object({
      name: z.string().describe('Validation check name'),
      reference: ActionReferenceSchema.describe('Value to check'),
      operator: z.enum(['exists', 'equals', 'contains', 'matches']).describe('Check type'),
      value: z.string().optional().describe('Expected value for comparison')
    })).describe('Automated success criteria')
  }).describe('How to verify plan succeeded'),

  metadata: z.object({
    createdAt: ISODateTimeSchema.describe('When plan was created'),
    createdBy: UserIdSchema.optional().describe('User who created the plan'),
    estimatedDuration: DurationMsSchema.describe('Expected execution time'),
    tags: z.array(z.string()).describe('Categorization tags')
  }).describe('Plan metadata')
}).describe('Complete execution plan with all actions and dependencies');

// Execution state schemas
const ActionExecutionStateSchema = z.object({
  actionId: z.string().describe('ID from PlannedAction'),
  status: z.enum(['pending', 'running', 'completed', 'failed', 'skipped']).describe('Current status'),

  startedAt: ISODateTimeSchema.optional().describe('When execution started'),
  completedAt: ISODateTimeSchema.optional().describe('When execution finished'),
  duration: DurationMsSchema.optional().describe('Execution time in ms'),

  attempts: z.number().int().describe('Number of execution attempts'),

  result: z.discriminatedUnion('status', [
    z.object({
      status: z.literal('success').describe('Action completed successfully'),
      output: z.record(z.string(), z.string()).describe('Action output data'),
      outputLocation: StorageLocationSchema.describe('Where output is stored')
    }),
    z.object({
      status: z.literal('failure').describe('Action failed'),
      error: ErrorDetailSchema.describe('Failure details'),
      partialOutput: z.record(z.string(), z.string()).optional().describe('Any partial results')
    }),
    z.object({
      status: z.literal('skipped').describe('Action skipped due to condition'),
      reason: z.string().describe('Why action was skipped')
    })
  ]).optional().describe('Execution result details'),

  httpTrace: z.array(z.object({
    timestamp: ISODateTimeSchema.describe('When request was made'),
    request: z.object({
      method: z.string().describe('HTTP method'),
      url: URLSchema.describe('Full URL including query params'),
      headers: z.record(z.string(), z.string()).describe('Request headers'),
      body: z.string().optional().describe('Request body if applicable')
    }).describe('HTTP request details'),
    response: z.object({
      status: z.number().int().describe('HTTP status code'),
      headers: z.record(z.string(), z.string()).describe('Response headers'),
      body: z.string().describe('Response body'),
      duration: DurationMsSchema.describe('Request duration')
    }).optional().describe('HTTP response if received'),
    error: ErrorDetailSchema.optional().describe('Network or protocol error')
  })).describe('Detailed HTTP trace for debugging')
}).describe('Complete execution state for a single action');

const ExecutionStateSchema = z.object({
  id: UUIDSchema.describe('Execution instance ID'),
  planId: UUIDSchema.describe('References ExecutionPlan.id'),

  status: z.enum(['initializing', 'running', 'paused_for_confirmation', 'completed', 'failed', 'cancelled'])
    .describe('Overall execution status'),

  startedAt: ISODateTimeSchema.describe('Execution start time'),
  completedAt: ISODateTimeSchema.optional().describe('Execution end time'),

  actionStates: z.record(z.string(), ActionExecutionStateSchema)
    .describe('State of each action keyed by action ID'),

  confirmations: z.array(z.object({
    actionId: z.string().describe('Action requiring confirmation'),
    requestedAt: ISODateTimeSchema.describe('When confirmation requested'),
    respondedAt: ISODateTimeSchema.optional().describe('When user responded'),
    confirmed: z.boolean().optional().describe('User decision'),
    userId: z.string().optional().describe('Who confirmed')
  })).describe('User confirmation history'),

  error: ErrorDetailSchema.optional().describe('Fatal error that stopped execution'),

  metrics: z.object({
    totalActions: z.number().int().describe('Total actions in plan'),
    completedActions: z.number().int().describe('Successfully completed actions'),
    failedActions: z.number().int().describe('Failed actions'),
    skippedActions: z.number().int().describe('Conditionally skipped actions'),
    totalDuration: DurationMsSchema.optional().describe('Total execution time')
  }).describe('Execution metrics')
}).describe('Complete execution state for monitoring and recovery');
```

### 4.2. Service Interfaces
Your `ErrorRecoveryManager` job will depend on the `ApiCatalog` to look up custom strategies.

```tsx
// API Catalog Interface
interface ApiCatalog {
  getApiEntry(apiId: string): Promise<ApiCatalogEntry | null>;
  getAllApis(): Promise<string[]>;
}
```

## 5. Your Final Deliverable

Produce the following files as your complete implementation within the `packages/error-recovery-manager/` directory.

*   `packages/error-recovery-manager/error-recovery-manager-jobs.ts`: Contains the main `handleErrorJob` Trigger.dev definition.
*   `packages/error-recovery-manager/strategies.ts`: Contains the specific implementation for each recovery strategy (e.g., `handleAuthExpired`, `handleRateLimit`, etc.).
*   `packages/error-recovery-manager/__tests__/strategies.test.ts`: Contains unit tests for each recovery strategy, mocking dependencies like the `ApiCatalog` and the `io` object.
