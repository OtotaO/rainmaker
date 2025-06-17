## 1. Your Role and Mission

You are a senior TypeScript developer specializing in building resilient, API-driven systems. Your mission is to implement the **Action Executor** module. 

This is the core execution engine of the system, responsible for making HTTP requests to external APIs. 

Your implementation must be extremely robust, with comprehensive error handling, retry logic, and the ability to adapt to vendor-specific API quirks via a catalog.

### Product Context: The "Why" Behind Your Work

Before you begin, it's important to understand the product you are helping to build.

You are contributing to an advanced, resilient automation platform. The platform's core purpose is to allow developers to define and reliably execute complex, multi-step workflows that interact with external APIs and web services.

Our users are developers and technical operations teams who need to automate critical business processes, such as data pipelines, customer onboarding sequences, or incident response actions. They choose our platform because they need a "reliable layer" to build upon, abstracting away the unreliability of third-party systems.

Therefore, the single most important quality of this system is resilience. Every decision you make—from naming variables to phrasing error messages to handling edge cases—should prioritize robustness, explicit error handling, and clear, debuggable logging over raw performance or code brevity.

A helpful mental model is to think of this platform as an enterprise-grade "Zapier for code," where every step is durable and every failure is a captured, analyzable event, not a silent crash.

Your module is a critical component in this chain of reliability. Its correctness and robustness directly impact the entire platform's value to our users.

## 2. Core Architectural Principles

You must adhere to these system-wide principles in your implementation:
1.  **Trigger.dev as the Backbone**: Your module will be a single Trigger.dev job that listens for execution requests.
2.  **Zod Schemas for Everything**: All inputs, outputs, and intermediate states must conform to the provided schemas.
3.  **Defensive Programming**: Assume all external APIs will fail in unexpected ways. Your code must handle this gracefully.
4.  **Integration-First Testing**: Focus on testing interactions with external systems (mocked) and handling their failure modes.

## 3. Your Complete Work Package: Action Executor Specifications

Implement your module according to these exact specifications. Do not add, remove, or change any functionality.

### 3.1. Purpose & Responsibilities
*   Execute individual actions with comprehensive error handling and retry logic.
*   Resolve input references from the execution context.
*   Interface with the API Catalog to handle vendor-specific behavior.
*   Validate inputs and outputs against their schemas.
*   Produce detailed execution state and traces.

### 3.2. Trigger.dev Job Definition
```tsx
const executeActionJob = client.defineJob({
  id: "action-execute",
  name: "Execute Single Action",
  version: "1.0.0",
  trigger: eventTrigger({
    name: "action.execute.requested",
    schema: z.object({
      executionId: UUIDSchema,
      action: PlannedActionSchema,
      context: z.object({
        credentials: z.record(z.string(), z.string()),
        previousResults: z.record(z.string(), z.string())
      })
    })
  }),
  run: async (payload, io, ctx) => {
    // Defensive implementation:
    // 1. Resolve all input references from context.
    // 2. Validate against action definition schema.
    // 3. Consult API Catalog for quirks and error mappings.
    // 4. Build HTTP request with auth.
    // 5. Execute with retries based on RetryPolicy and API Catalog info.
    // 6. Validate response against output schema.
    // 7. Store result using Storage Provider.
    // 8. Emit action.execute.completed or action.execute.failed event.
    // Returns ActionExecutionStateSchema.
  }
});
```

### 3.3. Acceptance Criteria
*   **EXEC-001**: `action-execute` job validates inputs against the action definition schema.
*   **EXEC-002**: Input references like `${actionId.output.path}` are resolved correctly.
*   **EXEC-003**: Nested references like `${actionId.output.users[0].name}` work.
*   **EXEC-004**: Circular references are detected and produce clear errors.
*   **EXEC-005**: HTTP requests include all required headers from the action definition.
*   **EXEC-006**: Authentication headers are injected based on auth configuration.
*   **EXEC-007**: Request timeout is enforced with proper request abortion.
*   **EXEC-008**: Retry logic follows `RetryPolicySchema` with exponential backoff.
*   **EXEC-009**: Jitter is added to retries to prevent thundering herd.
*   **EXEC-010**: HTTP responses are validated against the output schema.
*   **EXEC-011**: Malformed JSON responses produce helpful error messages.
*   **EXEC-012**: Binary responses are base64 encoded for storage.
*   **EXEC-013**: Response headers are captured in the execution trace.
*   **EXEC-014**: Each retry attempt is logged with full request/response.
*   **EXEC-015**: API catalog is consulted for vendor-specific error handling.
*   **EXEC-016**: Standard HTTP errors (4xx, 5xx) are handled when no catalog entry exists.
*   **EXEC-017**: Network errors are categorized correctly (timeout vs connection refused vs DNS).
*   **EXEC-018**: Partial responses due to connection drops are detected and handled.
*   **EXEC-019**: All execution results are stored via the Storage Provider.
*   **EXEC-020**: Memory usage is bounded even for large responses using streams.

### 3.4. Critical Edge Cases to Test
1.  **Malformed API responses**: API returns HTML instead of JSON.
2.  **Partial responses**: Connection drops mid-response.
3.  **Authentication token expires mid-execution**: Need to handle refresh logic.
4.  **Undocumented rate limits**: Receiving a 429 after N requests/minute.
5.  **API version changes**: A field is renamed without notice, causing schema validation failure.
6.  **Timeout during request vs. response**: Different error handling paths.
7.  **Non-UTF8 response encoding**: Binary data in a field expected to be text.
8.  **Circular input references**: `${a.output}` references `${b.output}` which references `${a.output}`.

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
You will need to interact with the `StorageProvider` and `ApiCatalog`. Your code must be written against these interfaces, which will be provided by other modules at runtime.

```tsx
// Storage Provider Interface
interface StorageProvider {
  save(collection: string, id: string, data: Buffer): Promise<SaveResult>;
  load(collection: string, id: string): Promise<{ data: Buffer; metadata: Record<string, string> } | null>;
  exists(collection: string, id: string): Promise<boolean>;
  list(collection: string, prefix?: string): Promise<string[]>;
  delete(collection: string, id: string): Promise<boolean>;
  saveBatch(operations: SaveOperation[]): Promise<SaveResult[]>;
  loadBatch(operations: LoadOperation[]): Promise<(LoadResult | null)[]>;
}

// API Catalog Interface (Stub)
interface ApiCatalog {
  getApiEntry(apiId: string): Promise<ApiCatalogEntry | null>;
  getAllApis(): Promise<string[]>;
  // Note: Real implementation injected at runtime
}
```

## 5. Implementation Constraints and Quality Standards

*   **HTTP Client:** Use a robust HTTP client library like `axios` or `node-fetch`. Your implementation should wrap it to handle the specific logic required by this module.
*   **Immutability:** Treat all inputs (`payload`) as immutable.
*   **Testing:** Write comprehensive tests using a mocking library like `msw` (Mock Service Worker) or `nock` to simulate the API behaviors outlined in the edge cases.
*   **No Barrel Exports:** Do not use `index.ts` files to re-export. All imports should be direct.

## 6. Your Final Deliverable

Produce the following files as your complete implementation.

*   `packages/executor/action-executor-jobs.ts`: Contains the main `executeActionJob` Trigger.dev definition and its top-level `run` function.
*   `packages/executor/http.ts`: Contains the wrapped HTTP client, including retry logic and timeout handling.
*   `packages/executor/auth.ts`: Contains handlers for the different authentication schemes (`bearer`, `api_key`, etc.).
*   `packages/executor/references.ts`: Contains the logic for resolving `${...}` input references.
*   `packages/executor/validation.ts`: Contains helper functions for validating inputs and outputs against schemas.
*   `packages/executor/catalog-integration.ts`: Contains the logic for fetching and applying rules from the `ApiCatalog`.
*   `packages/executor/__tests__/executor.test.ts`: Contains integration tests for the job.
*   `packages/executor/__tests__/references.test.ts`: Contains unit tests specifically for the reference resolution logic.
