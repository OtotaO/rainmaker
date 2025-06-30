## 1. Your Role and Mission

You are an expert software architect specializing in workflow and orchestration engines. Your mission is to implement the **Plan Orchestrator** module. This module is the "brain" of the system, responsible for taking a complete execution plan and coordinating its execution from start to finish. Your implementation will focus purely on control flow logic: managing dependencies, executing actions in parallel batches, handling user confirmations, and applying error handling policies.

### Product Context: The "Why" Behind Your Work

Before you begin, it's important to understand the product you are helping to build.

You are contributing to an advanced, resilient automation platform. The platform's core purpose is to allow developers to define and reliably execute complex, multi-step workflows that interact with external APIs and web services.

Our users are developers and technical operations teams who need to automate critical business processes, such as data pipelines, customer onboarding sequences, or incident response actions. They choose our platform because they need a "reliable layer" to build upon, abstracting away the unreliability of third-party systems.

Therefore, the single most important quality of this system is resilience. Every decision you make—from naming variables to phrasing error messages to handling edge cases—should prioritize robustness, explicit error handling, and clear, debuggable logging over raw performance or code brevity.

A helpful mental model is to think of this platform as an enterprise-grade "Zapier for code," where every step is durable and every failure is a captured, analyzable event, not a silent crash.

Your module is a critical component in this chain of reliability. Its correctness and robustness directly impact the entire platform's value to our users.

## 2. Core Architectural Principles

You must adhere to these system-wide principles in your implementation:
1.  **Trigger.dev as the Backbone**: Your module is a single, long-running, resumable Trigger.dev job.
2.  **Zod Schemas for Everything**: You will receive a plan conforming to `ExecutionPlanSchema` and must interact with other modules using the provided event schemas.
3.  **Defensive Programming**: Your orchestrator must be able to recover from crashes and handle partial failures within a batch of actions.
4.  **Integration-First Testing**: Focus on testing the orchestration logic across various plan structures (sequential, parallel, conditional).

## 3. Your Complete Work Package: Plan Orchestrator Specifications

Implement your module according to these exact specifications. Do not add, remove, or change any functionality.

### 3.1. Purpose & Responsibilities
*   Take an `ExecutionPlanSchema` and manage its end-to-end execution.
*   Build a dependency graph and execute actions in parallel batches where possible.
*   Handle control flow logic like conditions, user confirmations, and error handling policies (`continueOnFailure`, etc.).
*   Communicate with the State Manager and Action Executor to drive the plan forward.

### 3.2. Trigger.dev Job Definition
```tsx
const executePlanJob = client.defineJob({
  id: "plan-execute",
  name: "Execute Complete Plan",
  version: "1.0.0",
  trigger: eventTrigger({
    name: "plan.execute.requested",
    schema: z.object({
      plan: ExecutionPlanSchema,
      userId: z.string().optional()
    })
  }),
  run: async (payload, io, ctx) => {
    // 1. Initialize execution state via State Manager.
    // 2. Loop until plan is complete or failed.
    // 3. Get next available actions from State Manager.
    // 4. If no actions, break loop and finalize.
    // 5. Execute batch of available actions in parallel by sending `action.execute.requested` events.
    // 6. Wait for completion events for this batch.
    // 7. Handle failures according to errorHandling config.
    // 8. Finalize execution: validate outcomes, calculate metrics, emit completion event.
  }
});
```

### 3.3. Acceptance Criteria
*   **ORCH-001**: `executePlanJob` creates a unique execution ID and correctly initializes state via the State Manager.
*   **ORCH-002**: The dependency graph is built correctly from action dependencies.
*   **ORCH-003**: Actions with no dependencies or met dependencies are grouped into parallel execution batches.
*   **ORCH-004**: Each batch triggers `action.execute.requested` events in parallel.
*   **ORCH-005**: User confirmation requests pause execution and emit a `user.confirmation.requested` event.
*   **ORCH-006**: Execution correctly resumes after a `user.confirmation.received` event with `confirmed: true`.
*   **ORCH-007**: Execution is cancelled if a user confirmation is rejected.
*   **ORCH-008**: A confirmation timeout triggers the default action (reject).
*   **ORCH-009**: A failed action triggers its configured `errorHandling` logic.
*   **ORCH-010**: `continueOnFailure` allows dependent actions to run even if the parent action fails.
*   **ORCH-011**: `alternativeActionId` triggers the execution of a fallback action.
*   **ORCH-012**: The plan execution can be cleanly cancelled.
*   **ORCH-013**: `expectedOutcome` validations are run after a successful plan completion.
*   **ORCH-014**: The final plan status (`completed`, `failed`, `cancelled`) is set correctly.

### 3.4. Integration Edge Cases to Test
1.  **Action output type mismatch**: Action A returns a number, but Action B expects a string.
2.  **Missing required dependency**: A plan references a non-existent action ID.
3.  **Partial batch failure**: In a parallel batch of 3, 2 actions fail.
4.  **User confirmation timeout**: The user doesn't respond in the allotted time.
5.  **State corruption during execution**: The process crashes mid-update.
6.  **Dependency resolution with conditions**: A conditional action changes the dependency graph dynamically.
7.  **Race conditions in parallel execution**: Two actions attempt to write to the same external resource.

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
You will need to interact with the `StateManager`. Your code must be written against this interface, which will be provided by another module at runtime.

```tsx
// State Manager Interface
interface StateManager {
  initializeState(plan: ExecutionPlan): Promise<ExecutionState>;
  updateActionStatus(executionId: string, actionId: string, status: ActionStatus): Promise<void>;
  recordActionResult(executionId: string, actionId: string, result: any): Promise<void>;
  getAvailableActions(executionId: string): Promise<string[]>;
  getActionResult(executionId: string, actionId: string): Promise<any | null>;
  getFullState(executionId: string): Promise<ExecutionState>;
}
```

## 5. Implementation Constraints and Quality Standards

*   **Statelessness:** The orchestrator job itself should be as stateless as possible. All state must be read from and written to the `StateManager`. This is critical for resumability.
*   **Idempotency:** The logic should be idempotent. If the job restarts, it should be able to pick up where it left off by querying the `StateManager`.
*   **Testing:** Write tests that provide various `ExecutionPlanSchema` objects as input and assert that the correct sequence of events is emitted and the correct `StateManager` methods are called. You will need to mock the `StateManager` interface and the Trigger.dev `io` object.

## 6. Your Final Deliverable

Produce the following files as your complete implementation.

*   `packages/orchestrator/plan-orchestrator-jobs.ts`: Contains the main `executePlanJob` Trigger.dev definition.
*   `packages/orchestrator/graph.ts`: Contains helper functions for dependency analysis and execution batching.
*   `packages/orchestrator/confirmation.ts`: Contains the logic for handling the user confirmation flow.
*   `packages/orchestrator/error-handler.ts`: Contains the logic for interpreting the `errorHandling` configuration on a failed action.
*   `packages/orchestrator/__tests__/orchestrator.test.ts`: Contains integration tests for various plan structures and failure modes.
