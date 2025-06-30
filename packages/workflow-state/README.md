# @rainmaker/workflow-state

Workflow state management built on trigger.dev v3, providing the StateManager interface expected by TEP modules while leveraging trigger.dev's native capabilities.

## Overview

This package provides workflow state management for executing plans with multiple actions. It uses trigger.dev for background execution and durability, while exposing simple functions for other modules to import.

Key features:
- Direct function exports (no complex interfaces)
- Trigger.dev tasks for background execution
- Automatic dependency resolution
- Built-in retry logic and error handling

## Installation

```bash
bun add @rainmaker/workflow-state
```

## Usage

### Basic Setup

```typescript
import { executePlan } from '@rainmaker/workflow-state';
import type { ExecutionPlan } from '@rainmaker/schema';

// Direct trigger.dev integration - no adapters needed
const handle = await executePlan.trigger({ plan: myPlan });

// Get execution ID
const executionId = handle.id;
```

### Monitoring Execution

```typescript
import { runs } from '@trigger.dev/sdk/v3';

// Query execution state
const run = await runs.get(executionId);

if (run.status === 'COMPLETED') {
  const finalState = run.output as ExecutionState;
  console.log('Execution completed:', finalState);
} else if (run.status === 'FAILED') {
  console.error('Execution failed:', run.error);
}
```

### Error Handling

Common failure scenarios and how to handle them:

```typescript
// 1. Invalid plan structure
try {
  const validPlan = validateExecutionPlan(unknownPlan);
  validatePlanLogic(validPlan);
} catch (error) {
  if (error instanceof PlanValidationError) {
    console.error('Invalid plan:', error.errors);
  }
}

// 2. Circular dependencies
const cycles = findCircularDependencies(plan.actions);
if (cycles.length > 0) {
  throw new Error(`Circular dependencies: ${cycles}`);
}

// 3. Action execution failures
// These are handled automatically by trigger.dev's retry logic
// Configure retries in the task definition:
export const executeAction = task({
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 1000
  }
});
```

### Workflow Patterns

The package includes helper functions for common workflow patterns:

```typescript
import {
  createSequentialPipeline,
  createFanOutFanInPattern,
  createConditionalBranch
} from '@rainmaker/workflow-state';

// Sequential pipeline: A → B → C
const pipelineActions = createSequentialPipeline(
  ['validate', 'transform', 'save'],
  actions
);

// Fan-out/fan-in: A → [B, C, D] → E
const fanOutActions = createFanOutFanInPattern(
  ['fetch-1', 'fetch-2', 'fetch-3'],  // Parallel actions
  'combine-results',                    // Combiner action
  actions
);

// Conditional branching
const branchedActions = createConditionalBranch(
  'check-user-type',
  'userType',
  [
    { value: 'premium', actionIds: ['premium-flow'] },
    { value: 'basic', actionIds: ['basic-flow'] }
  ],
  actions
);
```

## Architecture

### Components

1. **Workflow Tasks** (`executor.ts`)
   - `executePlan` task orchestrates entire plan execution
   - `executeAction` task handles individual action execution
   - Automatic dependency resolution and parallel execution

2. **Module Interface** (`interface-v2.ts`)
   - Event-based contracts for module communication
   - Type-safe event payloads
   - No manual state management needed

3. **Validation** (`validation.ts`)
   - Plan structure validation
   - Logical constraint checking
   - Reference validation

4. **Patterns** (`patterns.ts`)
   - Common workflow patterns and helpers
   - Dependency analysis utilities

5. **Logging** (`logger.ts`)
   - Structured logging for observability
   - Metrics and error tracking

### How It Works

1. **Plan Execution**:
   ```
   initializeState(plan) → triggers executePlan task
                         → groups actions by dependency level
                         → executes each level in parallel
                         → returns final state
   ```

2. **State Management**:
   - State persisted automatically by trigger.dev
   - Checkpoint/resume for long-running tasks
   - Automatic retry with exponential backoff

3. **Dependency Resolution**:
   - Actions grouped into dependency levels
   - Each level executes in parallel
   - Next level starts after previous completes

## Integration with TEP Modules

### Module 2 (Action Executor)
The `executeAction` task emits events that Module 2 listens for:
```typescript
// Module 2 would implement:
task({
  id: 'http-action-executor',
  trigger: eventTrigger({ name: 'action.execute.requested' }),
  run: async ({ action, inputs }) => {
    // Execute HTTP call
    // Return result
  }
});
```

### Module 3 (Plan Orchestrator)
Module 3 uses the StateManager interface:
```typescript
const stateManager = createStateManager();
const state = await stateManager.initializeState(plan);
// Trigger.dev handles orchestration automatically
```

## API Reference

### StateManager Interface

```typescript
interface StateManager {
  initializeState(plan: ExecutionPlan): Promise<ExecutionState>;
  updateActionStatus(executionId: string, actionId: string, status: ActionStatus): Promise<void>;
  recordActionResult(executionId: string, actionId: string, result: any): Promise<void>;
  getAvailableActions(executionId: string): Promise<string[]>;
  getActionResult(executionId: string, actionId: string): Promise<any | null>;
  getFullState(executionId: string): Promise<ExecutionState>;
}
```

### Pattern Helpers

- `createSequentialPipeline()` - Chain actions in sequence
- `createFanOutFanInPattern()` - Parallel execution with synchronization
- `createConditionalBranch()` - Conditional execution paths
- `createRetryWithFallback()` - Retry failed actions with alternatives
- `createBatchProcessing()` - Process items in batches
- `findCircularDependencies()` - Detect dependency cycles
- `calculateExecutionMetrics()` - Analyze execution performance

## Testing

Since trigger.dev v3 doesn't have official unit testing utilities yet, we use a multi-layered approach:

1. **Pure Function Tests** - Test helper functions and patterns
2. **Logic Extraction Tests** - Test core task logic separately
3. **Adapter Tests** - Test expected behavior and structure
4. **Manual Integration Tests** - Use trigger.dev dashboard

See [TESTING-APPROACH.md](./TESTING-APPROACH.md) for detailed testing strategy.

```bash
# Run tests
bun test

# Run specific test file
bun test src/__tests__/executor-logic.test.ts

# Type check
bun run typecheck
```

Current test coverage: **21 tests passing** across 4 test files.

## Migration

See [migration.md](./migration.md) for migrating from the custom StateManager.

## Benefits

1. **Automatic State Management** - No manual persistence needed
2. **Built-in Resilience** - Checkpoint/resume, retries, idempotency
3. **Native Orchestration** - Parallel execution, dependency resolution
4. **Observable** - Monitor via trigger.dev dashboard
5. **Scalable** - Serverless execution with automatic scaling

## Limitations

- State updates within running executions are managed by trigger.dev
- External state modifications not recommended
- Requires trigger.dev account and API key

## License

See LICENSE in repository root.