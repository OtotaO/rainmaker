import { z } from '../zod';

// Base types with rich descriptions
const ISODateTimeSchema = z.dateString()
  .describe('ISO 8601 datetime string with timezone information');

const UUIDSchema = z.uuid()
  .describe('RFC 4122 UUID v4 for unique identification');

const URLSchema = z.url()
  .describe('Fully qualified URL including protocol');

const DurationMsSchema = z.int()
  .min(0)
  .describe('Duration in milliseconds');

// Branded ID types for type safety
const UserIdSchema = z.uuid();
const ExecutionIdSchema = z.uuid();
const ActionIdSchema = z.string();

// Error modeling - explicit failure types
const ErrorCategorySchema = z.union([
  z.literal('auth_expired'),
  z.literal('auth_invalid'),
  z.literal('rate_limit_daily'),
  z.literal('rate_limit_burst'),
  z.literal('network_timeout'),
  z.literal('network_connection_refused'),
  z.literal('api_response_malformed'),
  z.literal('api_endpoint_removed'),
  z.literal('api_unexpected_status'),
  z.literal('validation_failed'),
  z.literal('state_inconsistent'),
  z.literal('user_cancelled')
]).describe('Categorization of error types for proper handling and retry logic');

const ErrorDetailSchema = z.object({
  category: ErrorCategorySchema,
  message: z.string().describe('Human-readable error description'),
  code: z.string().optional().describe('API-specific error code if available'),
  statusCode: z.int().optional().describe('HTTP status code if applicable'),
  retryable: z.boolean().describe('Whether this error type should trigger automatic retry'),
  retryAfter: ISODateTimeSchema.optional().describe('Earliest time to retry if rate limited'),
  context: z.record(z.string(), z.string()).describe('Additional error context for debugging'),
  suggestion: z.string().optional().describe('Suggested remediation for the error')
}).describe('Comprehensive error information for debugging and recovery');

// Storage schemas - local filesystem only
const StorageLocationSchema = z.object({
  provider: z.literal('local').describe('Storage backend type - local filesystem only'),
  path: z.string().describe('Filesystem path to the stored data'),
  size: z.int().min(0).describe('Size in bytes'),
  checksum: z.string().describe('SHA-256 checksum of content'),
  contentType: z.string().describe('MIME type of stored content'),
  metadata: z.record(z.string(), z.string()).describe('Additional metadata')
}).describe('Location and metadata for stored data');

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
    else: z.union([z.literal('skip'), z.literal('fail')]).describe('Action if condition is false')
  }).optional().describe('Conditional execution based on previous results'),

  errorHandling: z.object({
    continueOnFailure: z.boolean().describe('Continue plan if this action fails'),
    fallbackValue: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional().describe('Use if action fails'),
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
      operator: z.union([z.literal('exists'), z.literal('equals'), z.literal('contains'), z.literal('matches')]).describe('Check type'),
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
  status: z.union([z.literal('pending'), z.literal('running'), z.literal('completed'), z.literal('failed'), z.literal('skipped')]).describe('Current status'),

  startedAt: ISODateTimeSchema.optional().describe('When execution started'),
  completedAt: ISODateTimeSchema.optional().describe('When execution finished'),
  duration: DurationMsSchema.optional().describe('Execution time in ms'),

  attempts: z.int().describe('Number of execution attempts'),

  result: z.discriminatedUnion('status', [
    z.object({
      status: z.literal('success').describe('Action completed successfully'),
      output: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).describe('Action output data'),
      outputLocation: StorageLocationSchema.describe('Where output is stored')
    }),
    z.object({
      status: z.literal('failure').describe('Action failed'),
      error: ErrorDetailSchema.describe('Failure details'),
      partialOutput: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional().describe('Any partial results')
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
      status: z.int().describe('HTTP status code'),
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

  status: z.union([z.literal('initializing'), z.literal('running'), z.literal('paused_for_confirmation'), z.literal('completed'), z.literal('failed'), z.literal('cancelled')])
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
    totalActions: z.int().describe('Total actions in plan'),
    completedActions: z.int().describe('Successfully completed actions'),
    failedActions: z.int().describe('Failed actions'),
    skippedActions: z.int().describe('Conditionally skipped actions'),
    totalDuration: DurationMsSchema.optional().describe('Total execution time')
  }).describe('Execution metrics'),

  version: z.int().min(0)
    .describe('Optimistic locking version - incremented on every state update')
}).describe('Complete execution state for monitoring and recovery');

// Action definition schemas - simplified for our use case
const AuthenticationSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('bearer'),
    token: z.string(),
  }),
  z.object({
    type: z.literal('api_key'),
    header: z.string(),
    value: z.string(),
  }),
  z.object({
    type: z.literal('basic'),
    username: z.string(),
    password: z.string(),
  }),
  z.object({
    type: z.literal('oauth2_client_credentials'),
    clientId: z.string(),
    clientSecret: z.string(),
    tokenUrl: z.url(),
    scope: z.array(z.string()).optional(),
  }),
]).describe('Authentication configuration for API calls');

const ActionDefinitionSchema = z.object({
  id: z.string().describe('Unique identifier for this action type'),
  name: z.string().describe('Human-readable action name'),
  description: z.string().describe('What this action does'),
  
  endpoint: z.object({
    url: z.string().describe('URL with {param} placeholders'),
    method: z.union([
      z.literal('GET'),
      z.literal('POST'),
      z.literal('PUT'),
      z.literal('PATCH'),
      z.literal('DELETE')
    ]).describe('HTTP method'),
    headers: z.record(z.string(), z.string()).optional().describe('Static headers'),
    timeout: DurationMsSchema.optional().describe('Request timeout in ms'),
  }).describe('HTTP endpoint configuration'),
  
  authentication: AuthenticationSchema.optional().describe('Auth configuration'),
  
  retryPolicy: z.object({
    maxAttempts: z.int().min(1).max(5),
    initialDelayMs: z.int(),
    maxDelayMs: z.int(),
    backoffMultiplier: z.number(),
  }).optional().describe('Retry configuration'),
  
}).describe('Simplified action definition for HTTP requests');

// Type exports
export type ISODateTime = z.infer<typeof ISODateTimeSchema>;
export type UUID = z.infer<typeof UUIDSchema>;
export type URL = z.infer<typeof URLSchema>;
export type DurationMs = z.infer<typeof DurationMsSchema>;
export type UserId = z.infer<typeof UserIdSchema>;
export type ExecutionId = z.infer<typeof ExecutionIdSchema>;
export type ActionId = z.infer<typeof ActionIdSchema>;
export type ErrorCategory = z.infer<typeof ErrorCategorySchema>;
export type ErrorDetail = z.infer<typeof ErrorDetailSchema>;
export type StorageLocation = z.infer<typeof StorageLocationSchema>;
export type ActionReference = z.infer<typeof ActionReferenceSchema>;
export type PlannedAction = z.infer<typeof PlannedActionSchema>;
export type ExecutionPlan = z.infer<typeof ExecutionPlanSchema>;
export type ActionExecutionState = z.infer<typeof ActionExecutionStateSchema>;
export type ExecutionState = z.infer<typeof ExecutionStateSchema>;
export type ActionStatus = ActionExecutionState['status'];
export type Authentication = z.infer<typeof AuthenticationSchema>;
export type ActionDefinition = z.infer<typeof ActionDefinitionSchema>;

// Schema exports
export {
  ISODateTimeSchema,
  UUIDSchema,
  URLSchema,
  DurationMsSchema,
  UserIdSchema,
  ExecutionIdSchema,
  ActionIdSchema,
  ErrorCategorySchema,
  ErrorDetailSchema,
  StorageLocationSchema,
  ActionReferenceSchema,
  PlannedActionSchema,
  ExecutionPlanSchema,
  ActionExecutionStateSchema,
  ExecutionStateSchema,
  AuthenticationSchema,
  ActionDefinitionSchema
};