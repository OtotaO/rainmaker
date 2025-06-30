import { ExecutionPlanSchema } from '@rainmaker/schema';
import type { ExecutionPlan, PlannedAction } from '@rainmaker/schema';

/**
 * Validation utilities for workflow execution
 *
 * Since we accept external plans, we need to validate them
 * to prevent malformed data from crashing our executor
 */

export class PlanValidationError extends Error {
  constructor(
    message: string,
    public readonly errors: unknown,
  ) {
    super(message);
    this.name = 'PlanValidationError';
  }
}

/**
 * Validate an execution plan before processing
 */
export function validateExecutionPlan(plan: unknown): ExecutionPlan {
  try {
    return ExecutionPlanSchema.parse(plan);
  } catch (error) {
    // Check if it's a Zod validation error
    if (
      error &&
      typeof error === 'object' &&
      'errors' in error &&
      Array.isArray((error as { errors: unknown[] }).errors)
    ) {
      const zodError = error as { errors: Array<{ message: string }> };
      throw new PlanValidationError(
        `Invalid execution plan: ${zodError.errors.map((e) => e.message).join(', ')}`,
        error,
      );
    }
    throw error;
  }
}

/**
 * Additional validation beyond schema
 */
export function validatePlanLogic(plan: ExecutionPlan): void {
  // Check for circular dependencies
  const cycles = findCircularDependencies(plan.actions);
  if (cycles.length > 0) {
    throw new Error(
      `Circular dependencies detected: ${cycles.map((c) => c.join(' → ')).join(', ')}`,
    );
  }

  // Check all dependencies reference existing actions
  const actionIds = new Set(plan.actions.map((a: PlannedAction) => a.id));
  for (const action of plan.actions) {
    for (const dep of action.dependencies) {
      if (!actionIds.has(dep)) {
        throw new Error(`Action ${action.id} depends on non-existent action ${dep}`);
      }
    }
  }

  // Validate action references in inputs
  for (const action of plan.actions) {
    validateActionReferences(action, actionIds);
  }
}

function validateActionReferences(action: PlannedAction, validActionIds: Set<string>): void {
  for (const [key, value] of Object.entries(action.inputs)) {
    if (typeof value === 'string' && value.startsWith('${')) {
      const match = value.match(/\$\{([^.]+)\./);
      if (match?.[1]) {
        const referencedAction = match[1];
        if (!validActionIds.has(referencedAction)) {
          throw new Error(
            `Action ${action.id} input ${key} references non-existent action ${referencedAction}`,
          );
        }

        // Must depend on referenced action
        if (!action.dependencies.includes(referencedAction)) {
          throw new Error(
            `Action ${action.id} references ${referencedAction} in inputs but doesn't depend on it`,
          );
        }
      }
    }
  }
}

// Direct import - no duplication
import { findCircularDependencies } from './patterns';
