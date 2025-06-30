// Module 4: Workflow State
// Direct exports for other modules to import

// Main functionality - trigger.dev task for background execution
export { executePlan } from './executor';

// Validation utilities for plan checking
export { validateExecutionPlan, validatePlanLogic, PlanValidationError } from './validation';

// Reference parsing for action inputs
export { parseReference, resolveReference, ReferenceParseError } from './reference-parser';

// Structured logging
export { WorkflowLogger } from './logger';

// Export workflow patterns and helpers
export {
  createFanOutFanInPattern,
  createSequentialPipeline,
  createConditionalBranch,
  createRetryWithFallback,
  createBatchProcessing,
  areDependenciesSatisfied,
  extractSuccessfulResults,
  calculateExecutionMetrics,
  findCircularDependencies,
} from './patterns';

// Re-export types from schema for convenience
export type {
  ExecutionPlan,
  ExecutionState,
  PlannedAction,
  ActionExecutionState,
  ActionStatus,
  ErrorDetail,
} from '@rainmaker/schema';
