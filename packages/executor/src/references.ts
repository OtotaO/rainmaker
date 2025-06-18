import type { ActionId, JsonValue } from './schemas';

// Reference pattern: ${actionId.output.path}
// Supports hyphens in action IDs (e.g., action-1, step-2-process)
const REFERENCE_PATTERN = /\$\{([a-zA-Z0-9_-]+)\.([a-zA-Z0-9_.[\]]+)\}/;

// Type for input values that might contain references
type InputValue = string | number | boolean | ReferenceString;
type ReferenceString = string & { __brand: 'ActionReference' };

// Result of reference resolution
export interface ResolveResult {
  resolvedValue: JsonValue;
  referencedActions: Set<string>;
}

/**
 * Resolves all references in action inputs to actual values from previous results.
 * 
 * This function handles the complex task of resolving ${actionId.output.path} references
 * in action inputs. It supports:
 * - Simple references: ${action1.output}
 * - Nested paths: ${action1.output.data.users[0].name}
 * - Array indices: ${action1.output.items[2]}
 * - Deep nesting: ${action1.output.a.b.c.d}
 * 
 * Circular reference detection:
 * - Tracks all visited references to detect cycles
 * - Provides clear error messages showing the complete cycle path
 * - Helps developers understand exactly where the cycle occurs
 * 
 * Example circular reference error:
 * ```
 * Circular reference detected in action inputs:
 *   → action1.output.data (starting point)
 *   → action2.output.result  
 *   → action3.output.value
 *   → action1.output.data (cycle completes here)
 * ```
 * 
 * @param inputs - Input configuration with potential references
 * @param previousResults - Results from completed actions (JSON strings)
 * @param dependencies - List of actions this action depends on
 * @returns Resolved input values with all references replaced
 * @throws Error if circular references detected or referenced actions not found
 */
export async function resolveReferences(
  inputs: Record<string, InputValue>,
  previousResults: Record<string, string>,
  dependencies: ActionId[],
): Promise<Record<string, JsonValue>> {
  const resolved: Record<string, JsonValue> = {};
  const visitedRefs = new Set<string>();
  const dependencySet = new Set(dependencies);

  for (const [key, value] of Object.entries(inputs)) {
    resolved[key] = await resolveValue(value, previousResults, dependencySet, visitedRefs, []);
  }

  return resolved;
}

// Resolve a single value (which might contain references)
async function resolveValue(
  value: InputValue,
  previousResults: Record<string, string>,
  dependencies: Set<ActionId>,
  visitedRefs: Set<string>,
  refPath: string[],
): Promise<JsonValue> {
  // Handle non-string values directly
  if (typeof value !== 'string') {
    return value;
  }

  // Check if the entire value is a reference
  const match = value.match(REFERENCE_PATTERN);
  if (!match || match[0] !== value) {
    // Not a reference or contains partial reference (not supported)
    return value;
  }

  const [fullMatch, actionId, outputPath] = match;

  // Check for circular references
  const refKey = `${actionId}.${outputPath}`;
  if (visitedRefs.has(refKey)) {
    /**
     * Circular reference detected. Show the complete cycle clearly.
     * 
     * Example error message:
     * "Circular reference detected in action inputs:
     *  → action1.output.data (starting point)
     *  → action2.output.result  
     *  → action3.output.value
     *  → action1.output.data (cycle completes here)
     * 
     * The cycle shows that action1 depends on action3, which depends on action2,
     * which depends on action1, creating an infinite loop."
     */
    const cyclePath = [...refPath, refKey];
    const cycleStartIndex = cyclePath.indexOf(refKey);
    const cycleMembers = cyclePath.slice(cycleStartIndex);
    
    throw new Error(
      `Circular reference detected in action inputs:\n` +
      `${cyclePath.map((ref, idx) => {
        if (idx === 0) return `  → ${ref} (starting point)`;
        if (idx === cyclePath.length - 1) return `  → ${ref} (cycle completes here)`;
        return `  → ${ref}`;
      }).join('\n')}\n\n` +
      `The reference '${refKey}' creates a dependency cycle that cannot be resolved. ` +
      `Each action must complete before its outputs can be used by dependent actions.`
    );
  }

  // Check if action is in dependencies
  if (!dependencies.has(actionId as ActionId)) {
    throw new Error(
      `Reference to action '${actionId}' not found in dependencies. ` +
        `Available actions: ${Array.from(dependencies).join(', ')}`,
    );
  }

  // Check if we have results for this action
  const actionResult = previousResults[actionId];
  if (!actionResult) {
    throw new Error(
      `No results found for action '${actionId}'. ` + `Action may not have completed yet.`,
    );
  }

  // Parse the action result
  let resultData: JsonValue;
  try {
    resultData = JSON.parse(actionResult);
  } catch (error) {
    throw new Error(`Failed to parse results from action '${actionId}': ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Add to visited refs to detect cycles
  visitedRefs.add(refKey);

  try {
    // Resolve the path within the result
    const resolvedValue = resolvePath(resultData, outputPath, actionId);

    // If the resolved value is another reference, resolve it recursively
    if (typeof resolvedValue === 'string' && REFERENCE_PATTERN.test(resolvedValue)) {
      return await resolveValue(resolvedValue, previousResults, dependencies, visitedRefs, [
        ...refPath,
        refKey,
      ]);
    }

    return resolvedValue;
  } finally {
    // Remove from visited refs when done
    visitedRefs.delete(refKey);
  }
}

// Resolve a path within an object (supports dot notation and array access)
function resolvePath(obj: JsonValue, path: string, actionId: string): JsonValue {
  const segments = parsePath(path);
  let current: JsonValue = obj;

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];

    if (current === null || current === undefined) {
      throw new Error(
        `Cannot access '${segment}' on null/undefined value at path ` +
          `'${segments.slice(0, i).join('.')}' in action '${actionId}' output`,
      );
    }

    if (segment.type === 'property') {
      if (typeof current !== 'object') {
        throw new Error(
          `Cannot access property '${segment.name}' on non-object value ` +
            `at path '${segments.slice(0, i).join('.')}' in action '${actionId}' output`,
        );
      }

      current = (current as Record<string, JsonValue>)[segment.name];
    } else if (segment.type === 'array') {
      if (!Array.isArray(current)) {
        throw new Error(
          `Cannot access array index on non-array value at path ` +
            `'${segments.slice(0, i).join('.')}' in action '${actionId}' output`,
        );
      }

      const index = segment.index;
      if (index < 0 || index >= current.length) {
        throw new Error(
          `Array index ${index} out of bounds (length: ${current.length}) ` +
            `at path '${segments.slice(0, i).join('.')}' in action '${actionId}' output`,
        );
      }

      current = (current as JsonValue[])[index];
    }
  }

  return current;
}

// Path segment types
interface PropertySegment {
  type: 'property';
  name: string;
}

interface ArraySegment {
  type: 'array';
  name: string;
  index: number;
}

type PathSegment = PropertySegment | ArraySegment;

// Parse a path into segments (e.g., "output.users[0].name" -> segments)
function parsePath(path: string): PathSegment[] {
  const segments: PathSegment[] = [];
  const parts = path.split('.');

  for (const part of parts) {
    // Check for array access notation
    const arrayMatch = part.match(/^([a-zA-Z0-9_]+)\[(\d+)\]$/);

    if (arrayMatch) {
      segments.push({
        type: 'property',
        name: arrayMatch[1],
      });
      segments.push({
        type: 'array',
        name: arrayMatch[1],
        index: parseInt(arrayMatch[2], 10),
      });
    } else {
      // Regular property access
      segments.push({
        type: 'property',
        name: part,
      });
    }
  }

  return segments;
}

// Validate that a string is a valid reference
export function isValidReference(value: string): boolean {
  const match = value.match(REFERENCE_PATTERN);
  return match !== null && match[0] === value;
}

// Extract action ID from a reference
export function extractActionId(reference: string): string | null {
  const match = reference.match(REFERENCE_PATTERN);
  return match ? match[1] : null;
}

// Extract all references from an object
export function extractAllReferences(inputs: Record<string, InputValue>): Set<string> {
  const references = new Set<string>();

  function traverse(value: JsonValue | InputValue): void {
    if (typeof value === 'string' && isValidReference(value)) {
      references.add(value);
    } else if (Array.isArray(value)) {
      value.forEach(traverse);
    } else if (value && typeof value === 'object') {
      Object.values(value).forEach(traverse);
    }
  }

  Object.values(inputs).forEach(traverse);
  return references;
}

// Check if there are any circular dependencies in references
export function detectCircularReferences(
  actions: Array<{ id: string; inputs: Record<string, InputValue> }>,
): string[] {
  const errors: string[] = [];
  const graph = new Map<string, Set<string>>();

  // Build dependency graph
  for (const action of actions) {
    const deps = new Set<string>();
    const refs = extractAllReferences(action.inputs);

    for (const ref of refs) {
      const actionId = extractActionId(ref);
      if (actionId && actionId !== action.id) {
        deps.add(actionId);
      }
    }

    graph.set(action.id, deps);
  }

  // Check for cycles using DFS
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function hasCycle(nodeId: string, path: string[]): boolean {
    visited.add(nodeId);
    recursionStack.add(nodeId);

    const dependencies = graph.get(nodeId) || new Set();
    for (const dep of dependencies) {
      if (!visited.has(dep)) {
        if (hasCycle(dep, [...path, nodeId])) {
          return true;
        }
      } else if (recursionStack.has(dep)) {
        // Found a cycle - show it clearly
        const cycleStart = path.indexOf(dep);
        const cyclePath = [...path.slice(cycleStart), nodeId, dep];
        
        errors.push(
          `Circular dependency detected:\n` +
          `${cyclePath.map((action, idx) => {
            if (idx === 0) return `  → ${action} (cycle starts here)`;
            if (idx === cyclePath.length - 1) return `  → ${action} (returns to start)`;
            return `  → ${action}`;
          }).join('\n')}\n` +
          `This creates an infinite dependency loop where actions cannot complete.`
        );
        return true;
      }
    }

    recursionStack.delete(nodeId);
    return false;
  }

  // Check each component
  for (const actionId of graph.keys()) {
    if (!visited.has(actionId)) {
      hasCycle(actionId, []);
    }
  }

  return errors;
}
