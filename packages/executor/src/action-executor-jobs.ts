import { TriggerClient, eventTrigger } from '@trigger.dev/sdk';
import { z } from 'zod';
import {
  PlannedActionSchema,
  UUIDSchema,
  ActionExecutionStateSchema,
  ActionDefinitionSchema,
  ErrorDetailSchema,
  type PlannedAction,
  type ActionExecutionState,
  type ActionDefinition,
  type ErrorDetail,
  type ApiCatalogEntry,
  ResolvedInputsSchema,
  type ResolvedInputs,
  HttpRequestBodySchema,
  type HttpRequestBody,
  JsonValueSchema,
  ActionOutputSchema,
  type JsonValue,
} from './schemas';
import type { StorageProvider, ApiCatalog } from './interfaces';
import { HttpClient } from './http';
import { applyAuthentication } from './auth';
import { resolveReferences } from './references';
import { validateAgainstSchema } from './validation';
import { categorizeApiError } from './catalog-integration';
import crypto from 'node:crypto';
import { 
  checkDuplication, 
  markExecutionStarted, 
  markExecutionCompleted, 
  markExecutionFailed,
  waitForPendingExecution 
} from './deduplication';
import { convertToBinary, createBinaryOutput } from './binary-handler';

// Initialize Trigger.dev client
const client = new TriggerClient({
  id: 'rainmaker-executor',
  apiKey: process.env.TRIGGER_API_KEY,
  apiUrl: process.env.TRIGGER_API_URL,
});

// Job payload schema
const ExecuteActionPayloadSchema = z.object({
  executionId: UUIDSchema,
  action: PlannedActionSchema,
  context: z.object({
    credentials: z.record(z.string(), z.string()),
    previousResults: z.record(z.string(), z.string()),
  }),
});

export type ExecuteActionPayload = z.infer<typeof ExecuteActionPayloadSchema>;

// Injected dependencies (provided at runtime)
let storageProvider: StorageProvider;
let apiCatalog: ApiCatalog;
const actionDefinitions: Map<string, ActionDefinition> = new Map();

// Dependency injection functions
export function injectStorageProvider(provider: StorageProvider): void {
  storageProvider = provider;
}

export function injectApiCatalog(catalog: ApiCatalog): void {
  apiCatalog = catalog;
}

export function registerActionDefinition(definition: ActionDefinition): void {
  actionDefinitions.set(definition.id, definition);
}

// Helper to build full URL with parameter substitution
function buildUrl(urlTemplate: string, params: ResolvedInputs): string {
  let url = urlTemplate;

  // Replace {param} placeholders
  for (const [key, value] of Object.entries(params)) {
    url = url.replace(`{${key}}`, encodeURIComponent(String(value)));
  }

  return url;
}

// Type for the IO object used in Trigger.dev jobs
interface JobIO {
  logger: {
    info: (message: string, metadata?: Record<string, unknown>) => Promise<void>;
    error: (message: string, metadata?: Record<string, unknown>) => Promise<void>;
    warn: (message: string, metadata?: Record<string, unknown>) => Promise<void>;
  };
  sendEvent: (
    name: string, 
    event: { name: string; payload: Record<string, unknown> }
  ) => Promise<void>;
}

// Export the run function for testing
export async function executeActionRun(
  payload: ExecuteActionPayload,
  io: JobIO = { 
    logger: { 
      info: async () => {}, 
      error: async () => {},
      warn: async () => {}
    }, 
    sendEvent: async (name, event) => {}  // Fixed signature
  },
  ctx: Record<string, never> = {}
): Promise<ActionExecutionState> {
    const { executionId, action, context } = payload;
    const startTime = Date.now();

    /**
     * Step 0: Check for duplicate requests
     * 
     * Deduplication prevents:
     * 1. Multiple identical API calls (saves resources, prevents rate limits)
     * 2. Race conditions in workflows (ensures deterministic execution)
     * 3. Duplicate charges for paid APIs
     * 4. Inconsistent state from parallel mutations
     * 
     * The deduplication key is based on:
     * - Action type (what API/operation)
     * - Input parameters (the specific request)
     * - Dependencies (context from previous actions)
     */
    const dedupeResult = checkDuplication(action);
    
    if (dedupeResult.type === 'duplicate_completed') {
      // Return cached result immediately
      await io.logger.info('Returning cached result for duplicate action', {
        actionId: action.id,
        deduplicationKey: dedupeResult.key,
      });
      return dedupeResult.result;
    }
    
    if (dedupeResult.type === 'duplicate_pending') {
      // Another execution is in progress, wait for it
      await io.logger.info('Duplicate action detected, waiting for pending execution', {
        actionId: action.id,
        deduplicationKey: dedupeResult.key,
        startedAt: dedupeResult.startedAt,
      });
      
      const pendingResult = await waitForPendingExecution(dedupeResult.key);
      if (pendingResult) {
        return pendingResult;
      }
      
      // If we couldn't get the pending result, proceed with execution
      // This can happen if the pending execution failed or timed out
      await io.logger.warn('Could not retrieve pending execution result, proceeding with new execution', {
        actionId: action.id,
        deduplicationKey: dedupeResult.key,
      });
    }
    
    // Mark this execution as started to prevent duplicates
    markExecutionStarted(dedupeResult.key);

    // Initialize execution state
    let executionState: ActionExecutionState = {
      actionId: action.id,
      status: 'running',
      startedAt: new Date().toISOString(),
      attempts: 0,
      httpTrace: [],
    };

    try {
      // Step 1: Get action definition
      const actionDef = actionDefinitions.get(action.actionDefinitionId);
      if (!actionDef) {
        throw new Error(`Action definition not found: ${action.actionDefinitionId}`);
      }

      await io.logger.info('Starting action execution', {
        actionId: action.id,
        actionType: actionDef.id,
        dependencies: action.dependencies,
      });

      // Step 2: Resolve input references
      let resolvedInputs: ResolvedInputs;
      try {
        const resolved = await resolveReferences(
          action.inputs,
          context.previousResults,
          action.dependencies,
        );
        // Validate the resolved inputs match our schema
        const parsed = ResolvedInputsSchema.safeParse(resolved);
        if (!parsed.success) {
          throw new Error(`Invalid resolved inputs: ${parsed.error.message}`);
        }
        resolvedInputs = parsed.data;
      } catch (error) {
        const errorMessage = `Failed to resolve input references: ${error instanceof Error ? error.message : 'Unknown error'}`;
        await io.logger.error('Reference resolution failed', {
          actionId: action.id,
          inputs: action.inputs,
          dependencies: action.dependencies,
          previousResultsKeys: Object.keys(context.previousResults),
          error: errorMessage,
        });
        throw new Error(errorMessage);
      }

      // Step 3: Validate inputs against schema
      if (actionDef.inputSchema) {
        const validation = await validateAgainstSchema(resolvedInputs, actionDef.inputSchema);

        if (!validation.valid) {
          throw new Error(`Input validation failed: ${validation.errors.join(', ')}`);
        }
      }

      // Step 4: Get API catalog entry if available
      const apiCatalogEntry = await apiCatalog.getApiEntry(
        new URL(actionDef.endpoint.url).hostname,
      );

      // Step 5: Build request configuration
      const url = buildUrl(actionDef.endpoint.url, resolvedInputs);
      const headers = { ...actionDef.endpoint.headers };

      // Apply authentication
      if (actionDef.authentication) {
        await applyAuthentication(headers, actionDef.authentication, context.credentials);
      }

      // Apply API catalog quirks if available
      if (apiCatalogEntry?.quirks.requiresUserAgent) {
        headers['User-Agent'] = apiCatalogEntry.quirks.requiresUserAgent;
      }

      /**
       * Step 6: Create HTTP client with memory safety configuration.
       * 
       * Memory safety strategy:
       * 1. Default max response size is 50MB (prevents memory bombs)
       * 2. API catalog can override for known large-response APIs
       * 3. Streaming is used automatically for responses > 10MB
       * 4. Response bodies are truncated in trace logs (1KB max)
       * 
       * This prevents three types of memory issues:
       * - Malicious APIs sending gigabytes of data
       * - Legitimate APIs with unexpectedly large responses
       * - Memory leaks from accumulating trace data
       */
      const httpClient = new HttpClient(
        {
          timeout: actionDef.endpoint.timeout,
          maxResponseSize: apiCatalogEntry?.quirks.maxResponseSize,
          userAgent: headers['User-Agent'],
        },
        apiCatalogEntry || undefined,
      );

      // Prepare request body for POST/PUT/PATCH
      let requestBody: HttpRequestBody;
      if (['POST', 'PUT', 'PATCH'].includes(actionDef.endpoint.method)) {
        requestBody = resolvedInputs;
      }

      // Step 7: Execute HTTP request with retries
      executionState.attempts = 1;
      const result = await httpClient.executeWithRetry(
        {
          method: actionDef.endpoint.method,
          url,
          headers,
          data: requestBody,
        },
        actionDef.retryPolicy,
      );

      // Update execution state with HTTP trace
      executionState.httpTrace = result.trace;
      executionState.attempts = result.trace.length;

      // Step 8: Handle response or error
      if (result.error) {
        // Apply API catalog error mappings if available
        const mappedError = apiCatalogEntry
          ? await categorizeApiError(result.error, apiCatalogEntry)
          : result.error;

        executionState.status = 'failed';
        executionState.result = {
          status: 'failure',
          error: mappedError,
        };

        // Store partial output if available
        if (result.response?.data) {
          try {
            const partialOutput =
              typeof result.response.data === 'string'
                ? { raw: result.response.data }
                : result.response.data;

            executionState.result.partialOutput = partialOutput;
          } catch (e) {
            // Ignore parsing errors for partial output
          }
        }

        await io.logger.error('Action execution failed', {
          actionId: action.id,
          error: mappedError,
          attempts: executionState.attempts,
        });
      } else if (result.response) {
        // Step 9: Process successful response
        const response = result.response;

        // Check for API quirks - success with error body
        if (apiCatalogEntry?.quirks.successWithErrorBody && response.status === 200) {
          // Additional validation needed
          const bodyStr =
            typeof response.data === 'string' ? response.data : JSON.stringify(response.data);

          // Check if response indicates an error
          for (const errorMapping of apiCatalogEntry.errorMappings) {
            if (errorMapping.pattern && new RegExp(errorMapping.pattern).test(bodyStr)) {
              const error: ErrorDetail = {
                category: errorMapping.category,
                message: 'API returned success status with error content',
                statusCode: 200,
                retryable: errorMapping.retryable,
                context: { 
                  // SECURITY: Don't log full response body - it may contain sensitive data
                  responseBodyLength: bodyStr.length,
                  matchedPattern: errorMapping.pattern || 'unknown',
                },
                suggestion: 'Check API response body for error details',
              };

              executionState.status = 'failed';
              executionState.result = {
                status: 'failure',
                error,
              };

              break;
            }
          }
        }

        // If not an error, process as success
        if (executionState.status !== 'failed') {
          // Parse response data
          let outputData: JsonValue | undefined;
          const contentType = response.headers['content-type']?.toLowerCase() || '';

          if (
            contentType.includes('application/json') ||
            (apiCatalogEntry?.quirks.nonStandardJsonContentType &&
              contentType.includes(apiCatalogEntry.quirks.nonStandardJsonContentType))
          ) {
            // JSON response
            let jsonData: unknown;
            try {
              jsonData = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
            } catch (parseError) {
              // JSON parse error - set proper error category
              executionState.status = 'failed';
              executionState.result = {
                status: 'failure',
                error: {
                  category: 'api_response_malformed',
                  message: `Invalid JSON in response: ${parseError instanceof Error ? parseError.message : 'Parse error'}`,
                  retryable: false,
                  context: {
                    actionId: action.id,
                    contentType,
                    responseSnippet: typeof response.data === 'string' ? response.data.slice(0, 100) : undefined,
                  },
                  suggestion: 'API returned malformed JSON - check API response format',
                },
              };
              // Skip further processing
            }
            
            if (executionState.status !== 'failed') {
              const parsed = JsonValueSchema.safeParse(jsonData);
              if (!parsed.success) {
                throw new Error(`Invalid JSON response: ${parsed.error.message}`);
              }
              outputData = parsed.data;
            }
          } else if (contentType.includes('text/')) {
            // Text response
            outputData = { text: String(response.data) };
          } else {
            /**
             * Binary response handling using dedicated handler.
             * 
             * The binary handler provides robust conversion of any data type
             * to a base64-encoded string, handling all edge cases and preventing
             * common errors like double-encoding or type mismatches.
             */
            try {
              const binaryResult = convertToBinary(response.data);
              
              if (binaryResult.error) {
                // Log warning but continue with converted data
                await io.logger.error('Binary response conversion warning', {
                  actionId: action.id,
                  contentType,
                  dataType: typeof response.data,
                  error: binaryResult.error,
                });
              }
              
              outputData = createBinaryOutput(binaryResult.buffer, contentType);
            } catch (error) {
              // Size limit exceeded or other fatal error
              throw error;
            }
          }

          // Step 10: Validate output against schema
          if (actionDef.outputSchema && outputData !== undefined) {
            const validation = await validateAgainstSchema(outputData, actionDef.outputSchema);

            if (!validation.valid) {
              throw new Error(`Output validation failed: ${validation.errors.join(', ')}`);
            }
          }

          // Step 11: Store output using storage provider
          if (outputData !== undefined) {
            const outputBuffer = Buffer.from(JSON.stringify(outputData));
            const outputId = `${executionId}-${action.id}-output`;

          /**
           * Storage operation with error handling.
           * 
           * The storage provider interface assumes always-available storage,
           * but we need to handle transient failures gracefully.
           * Common failure modes:
           * - Network errors (S3/GCS connectivity)
           * - Rate limiting
           * - Quota exceeded
           * - Permission errors
           */
          let storageResult;
          let storageFailed = false;
          try {
            storageResult = await storageProvider.save(
              'action-outputs',
              outputId,
              outputBuffer,
            );
          } catch (storageError) {
            storageFailed = true;
            await io.logger.error('Failed to store action output', {
              actionId: action.id,
              outputId,
              error: storageError,
              outputSize: outputBuffer.length,
            });
            
            // Determine if storage error is transient
            const isTransient = 
              storageError.code === 'ECONNREFUSED' ||
              storageError.code === 'ETIMEDOUT' ||
              storageError.code === 'ENOTFOUND' ||
              storageError.message?.includes('rate limit') ||
              storageError.message?.includes('temporarily') ||
              storageError.statusCode === 429 || // Rate limited
              storageError.statusCode === 503 || // Service unavailable
              storageError.statusCode === 504;   // Gateway timeout
            
            // ENOSPC (disk full) and quota errors are NOT transient
            const isPermanent = 
              storageError.code === 'ENOSPC' ||
              storageError.code === 'EDQUOT' ||
              storageError.message?.toLowerCase().includes('quota');
            
            // Storage failure doesn't fail the action - output is still valid
            // But we need to indicate storage wasn't successful
            executionState.status = 'completed';
            const outputParsed = ActionOutputSchema.safeParse(outputData);
            if (!outputParsed.success) {
              throw new Error(`Invalid output format: ${outputParsed.error.message}`);
            }
            
            executionState.result = {
              status: 'success',
              output: outputParsed.data,
              // No outputLocation since storage failed
              // Add storage failure to output metadata so consumers know it wasn't persisted
              outputLocation: {
                provider: 'ephemeral',
                path: 'memory://transient',
                size: outputBuffer.length,
                checksum: crypto.createHash('sha256').update(outputBuffer).digest('hex'),
                contentType: 'application/json',
                metadata: {
                  actionId: action.id,
                  executionId,
                  timestamp: new Date().toISOString(),
                  storageFailure: true,
                  storageError: storageError.message,
                  storageErrorRetryable: isTransient,
                  warning: 'Output computed successfully but could not be persisted to storage',
                },
              },
            };
            
            await io.logger.warn('Action completed but storage failed', {
              actionId: action.id,
              storageError: storageError.message,
              isTransient,
            });
            
            // Continue execution - storage failure is not fatal
            // Skip the normal storage success handling
          }
          
          if (!storageFailed) {
            // Storage succeeded - use the normal storage location
            executionState.status = 'completed';
            // Convert to proper output format
            const outputParsed = ActionOutputSchema.safeParse(outputData);
            if (!outputParsed.success) {
              throw new Error(`Invalid output format: ${outputParsed.error.message}`);
            }
            executionState.result = {
              status: 'success',
              output: outputParsed.data,
              outputLocation: {
                provider: 'local',
                path: storageResult.path,
                size: storageResult.size,
                checksum: storageResult.checksum,
                contentType: 'application/json',
                metadata: {
                  actionId: action.id,
                  executionId,
                  timestamp: new Date().toISOString(),
                },
              },
            };

            await io.logger.info('Action execution completed', {
              actionId: action.id,
              outputSize: storageResult.size,
              duration: Date.now() - startTime,
            });
          }
          } // Close the outputData !== undefined check
        }
      }

      // Update completion time and duration
      executionState.completedAt = new Date().toISOString();
      executionState.duration = Date.now() - startTime;

      // Emit completion or failure event
      if (executionState.status === 'completed') {
        await io.sendEvent('action-completed', {
          name: 'action.execute.completed',
          payload: {
            executionId,
            actionId: action.id,
            state: executionState,
          },
        });
      } else {
        await io.sendEvent('action-failed', {
          name: 'action.execute.failed',
          payload: {
            executionId,
            actionId: action.id,
            state: executionState,
            error:
              executionState.result?.status === 'failure' ? executionState.result.error : undefined,
          },
        });
      }

      // Mark execution as completed in deduplication cache
      markExecutionCompleted(dedupeResult.key, executionState);
      
      return executionState;
    } catch (error) {
      // Mark execution as failed in deduplication cache
      markExecutionFailed(dedupeResult.key);
      
      // Handle unexpected errors
      const errorDetail: ErrorDetail = {
        category: 'state_inconsistent',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        retryable: false,
        context: {
          actionId: action.id,
          executionId,
        },
        suggestion: 'Check action configuration and inputs',
      };

      executionState.status = 'failed';
      executionState.completedAt = new Date().toISOString();
      executionState.duration = Date.now() - startTime;
      executionState.result = {
        status: 'failure',
        error: errorDetail,
      };

      await io.logger.error('Unexpected error during action execution', {
        actionId: action.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      await io.sendEvent('action-failed-unexpected', {
        name: 'action.execute.failed',
        payload: {
          executionId,
          actionId: action.id,
          state: executionState,
          error: errorDetail,
        },
      });

      return executionState;
    }
}

// Main action execution job
export const executeActionJob = client.defineJob({
  id: 'action-execute',
  name: 'Execute Single Action',
  version: '1.0.0',
  trigger: eventTrigger({
    name: 'action.execute.requested',
    schema: ExecuteActionPayloadSchema,
  }),
  run: async (payload, io, ctx) => {
    // Adapt Trigger.dev's IO to our JobIO interface
    const jobIO: JobIO = {
      logger: {
        info: async (message, metadata) => {
          await io.logger.info(message, metadata as Record<string, unknown>);
        },
        error: async (message, metadata) => {
          await io.logger.error(message, metadata as Record<string, unknown>);
        },
        warn: async (message, metadata) => {
          await io.logger.warn(message, metadata as Record<string, unknown>);
        },
      },
      sendEvent: async (name, event) => {
        await io.sendEvent(name, event);
      },
    };
    return executeActionRun(payload, jobIO, {});
  },
});

// Export the client for use in other modules
export { client };
