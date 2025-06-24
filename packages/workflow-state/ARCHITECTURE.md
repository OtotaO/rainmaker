# Workflow State Architecture

## Core Principle: Direct Function Calls

Modules are **interface boundaries, not server boundaries**. This fundamental principle drives all architectural decisions.

## Module Structure

```
@rainmaker/workflow-state
├── src/
│   ├── executor.ts         # Trigger.dev task for plan execution
│   ├── validation.ts       # Plan validation logic
│   ├── patterns.ts         # Workflow patterns and helpers
│   ├── reference-parser.ts # Action input reference parsing
│   ├── logger.ts          # Structured logging
│   └── index.ts           # Direct exports
```

## Integration Points

### Exports (What Other Modules Use)

```typescript
// Main functionality
export { executePlan } from './executor';

// Utilities
export { validateExecutionPlan, validatePlanLogic } from './validation';
export { parseReference, resolveReference } from './reference-parser';
export { WorkflowLogger } from './logger';

// Patterns
export { createFanOutFanInPattern, /* ... */ } from './patterns';
```

### Imports (What We Need)

```typescript
// From Module 2 (when it exists)
import { executeHttpAction } from '@rainmaker/action-executor';

// From shared schemas
import type { ExecutionPlan, PlannedAction } from '@rainmaker/schema';
```

## How It Works

### 1. Plan Execution Flow

```typescript
// Module 3 calls us
const handle = await executePlan.trigger({ plan });

// Inside executePlan task:
1. Validate plan structure
2. Group actions by dependency level
3. For each level:
   - Execute actions in parallel
   - Wait for all to complete
4. Return final execution state
```

### 2. Action Execution

```typescript
// Direct call to Module 2
const result = await executeHttpAction({
  actionDefinitionId: action.actionDefinitionId,
  inputs: resolvedInputs,
  context: { executionId, planId, actionId }
});
```

### 3. State Management

State is managed by trigger.dev automatically:
- No manual persistence needed
- Automatic recovery on failure
- Built-in versioning

## Design Decisions

### Why Direct Function Calls?

1. **Type Safety**: TypeScript catches integration errors at compile time
2. **Performance**: No serialization overhead
3. **Debugging**: Full stack traces across modules
4. **Simplicity**: No complex abstractions

### Why Trigger.dev?

Used **only** for:
- Background execution (don't block API)
- Automatic retries
- Durability (survive restarts)
- Observability (dashboard)

**Not** used for:
- Module communication
- State storage interface
- Event bus

### What We Don't Have (On Purpose)

1. **No StateManager Interface**: Direct task exports instead
2. **No Event System**: Direct function calls instead
3. **No Abstract Classes**: Just functions
4. **No Dependency Injection**: Direct imports

## Testing Strategy

### Unit Tests
- Test pure functions (patterns, parsing)
- Mock direct imports
- Fast, synchronous

### Integration Tests
- When trigger.dev provides test utilities
- Test full workflow execution
- Verify Module 2 integration

## Error Handling

1. **Validation Errors**: Thrown synchronously, caught by caller
2. **Execution Errors**: Handled by trigger.dev retry logic
3. **Action Failures**: Recorded in state with full context

## Performance Characteristics

- **Dependency Resolution**: O(n²) but fine for 20 actions
- **Parallel Execution**: Limited by trigger.dev concurrency
- **Memory**: Minimal - trigger.dev handles state

## Future Considerations

1. **When Module 2 Exists**: Update imports, remove mocks
2. **If Scale Changes**: Revisit O(n²) algorithm
3. **If Network Boundary Needed**: Add API layer on top

## Integration Examples

### Module 3 → Module 4
```typescript
import { executePlan, validateExecutionPlan } from '@rainmaker/workflow-state';

export async function orchestratePlan(plan: ExecutionPlan) {
  const validPlan = validateExecutionPlan(plan);
  const handle = await executePlan.trigger({ plan: validPlan });
  return { executionId: handle.id };
}
```

### Module 4 → Module 2
```typescript
import { executeHttpAction } from '@rainmaker/action-executor';

// Inside executePlan task
const result = await executeHttpAction({
  actionDefinitionId: action.actionDefinitionId,
  inputs: action.inputs,
  context: { executionId: ctx.run.id }
});
```

## Anti-Patterns to Avoid

### ❌ Don't create unnecessary interfaces
```typescript
// BAD
interface ActionExecutor {
  execute(action: Action): Promise<Result>;
}

// GOOD
export async function executeHttpAction(action: Action): Promise<Result> { }
```

### ❌ Don't use events for synchronous operations
```typescript
// BAD
await ctx.sendEvent({ name: 'storage.save', data });

// GOOD
const location = await saveData(data);
```

### ❌ Don't hide direct calls behind abstractions
```typescript
// BAD
class ModuleProxy {
  async callModule2(method: string, args: any[]) { }
}

// GOOD
import { specificFunction } from '@rainmaker/module2';
await specificFunction(typedArgs);
```

## Summary

This architecture prioritizes:
- **Simplicity** over flexibility
- **Direct calls** over abstractions
- **Type safety** over runtime configuration
- **Trigger.dev features** over custom implementation

The result is a focused module that does one thing well: execute workflow plans with automatic state management.