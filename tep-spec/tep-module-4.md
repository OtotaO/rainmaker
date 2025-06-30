## 1. Your Role and Mission

You are an expert TypeScript developer with a strong background in data structures and algorithms. Your mission is to implement the **State Manager** module. This module is the authoritative source of truth for the state of any given plan execution. It is responsible for initializing state, tracking the status of every action, analyzing dependencies, and persisting all changes for durability.

### Product Context: The "Why" Behind Your Work

Before you begin, it's important to understand the product you are helping to build.

You are contributing to an advanced, resilient automation platform. The platform's core purpose is to allow developers to define and reliably execute complex, multi-step workflows that interact with external APIs and web services.

Our users are developers and technical operations teams who need to automate critical business processes, such as data pipelines, customer onboarding sequences, or incident response actions. They choose our platform because they need a "reliable layer" to build upon, abstracting away the unreliability of third-party systems.

Therefore, the single most important quality of this system is resilience. Every decision you make—from naming variables to phrasing error messages to handling edge cases—should prioritize robustness, explicit error handling, and clear, debuggable logging over raw performance or code brevity.

A helpful mental model is to think of this platform as an enterprise-grade "Zapier for code," where every step is durable and every failure is a captured, analyzable event, not a silent crash.

Your module is a critical component in this chain of reliability. Its correctness and robustness directly impact the entire platform's value to our users.

## 2. Core Architectural Principles

*   **Delegated Persistence**: You will manage the in-memory representation of the `ExecutionStateSchema` but will delegate all disk I/O to the `StorageProvider` interface.
*   **Consistency is Key**: Your implementation must enforce valid state transitions and ensure that the persisted state is always consistent.
*   **Schema-Driven**: All state you manage must strictly conform to the `ExecutionStateSchema` and its sub-schemas.

## 3. Your Complete Work Package: State Manager Specifications

Implement your module according to these exact specifications. The package name for this module is `state-manager`.

### 3.1. Purpose & Responsibilities
*   Manage the `ExecutionStateSchema` for a running plan.
*   Ensure consistency and atomicity of state updates.
*   Provide query capabilities for the orchestrator (e.g., finding actions ready to run).
*   Analyze dependencies to detect cycles and determine execution order.

### 3.2. Public Interface
You must create a class that implements this exact `StateManager` interface.

```tsx
// This interface should be in packages/state-manager/interface.ts
interface StateManager {
  initializeState(plan: ExecutionPlan): Promise<ExecutionState>;
  updateActionStatus(executionId: string, actionId: string, status: ActionStatus): Promise<void>;
  recordActionResult(executionId: string, actionId: string, result: any): Promise<void>;
  getAvailableActions(executionId: string): Promise<string[]>;
  getActionResult(executionId: string, actionId: string): Promise<any | null>;
  getFullState(executionId: string): Promise<ExecutionState>;
}
```

### 3.3. Acceptance Criteria
*   **STATE-001**: `initializeState` creates a new execution state object with all actions in 'pending' status and persists it using the `StorageProvider`.
*   **STATE-002**: `updateActionStatus` validates status transitions (e.g., pending→running→completed is valid; completed→running is not).
*   **STATE-003**: Invalid status transitions must be rejected with a clear error.
*   **STATE-004**: All updates must be atomic. Load the state, apply the change, and save the entire state back in a single logical operation.
*   **STATE-005**: `recordActionResult` stores the action's result and updates its status atomically.
*   **STATE-006**: `getAvailableActions` correctly returns only actions whose dependencies (as defined in the `dependencies` array) have a status of 'completed'.
*   **STATE-007**: `initializeState` must perform a check for circular dependencies in the plan and throw an error if a cycle is detected.
*   **STATE-008**: `getAvailableActions` must correctly handle conditional actions and `continueOnFailure` flags when determining if a dependent action can run.
*   **STATE-009**: The module must be able to recover state by loading it from the `StorageProvider`.

## 4. Required Global Dependencies: Schemas & Interfaces

Your implementation MUST use these exact Zod schemas and TypeScript interfaces.

### 4.1. Global Schemas
```tsx
// (The same complete Zod schema block from Prompt 1 is inserted here)
import { z } from 'zod';
// ... all schemas ...
const ExecutionStateSchema = z.object({ ... });
```

### 4.2. Service Interfaces
Your `StateManager` implementation will depend on the `StorageProvider`. Your code must be written against this interface.

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
```

## 5. Your Final Deliverable

Produce the following files as your complete implementation within the `packages/state-manager/` directory.

*   `packages/state-manager/interface.ts`: Contains only the `StateManager` TypeScript interface definition.
*   `packages/state-manager/manager.ts`: Contains the `StateManagerImpl` class that implements the interface. It will take a `StorageProvider` in its constructor.
*   `packages/state-manager/dependencies.ts`: Contains the dependency analysis logic, including graph building and cycle detection.
*   `packages/state-manager/__tests__/manager.test.ts`: Contains unit tests for state transitions and logic.
*   `packages/state-manager/__tests__/dependencies.test.ts`: Contains unit tests specifically for the cycle detection and dependency analysis.
