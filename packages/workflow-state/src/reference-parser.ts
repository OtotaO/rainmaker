/**
 * Parser for action reference strings
 * Handles ${actionId.output.field} syntax properly
 */

export interface ParsedReference {
  type: 'action-output';
  actionId: string;
  path: string[];
}

export class ReferenceParseError extends Error {
  constructor(reference: string, reason: string) {
    super(`Invalid reference "${reference}": ${reason}`);
    this.name = 'ReferenceParseError';
  }
}

/**
 * Parse an action reference string
 * @example parseReference("${fetch-user.output.data.id}")
 * @returns Parsed reference or null if not a reference
 */
export function parseReference(value: string): ParsedReference | null {
  if (typeof value !== 'string' || !value.startsWith('${') || !value.endsWith('}')) {
    return null;
  }

  const inner = value.slice(2, -1); // Remove ${ and }
  const parts = inner.split('.');

  if (parts.length < 3) {
    throw new ReferenceParseError(value, 'Expected format: ${actionId.output.field}');
  }

  const [actionId, outputKeyword, ...pathParts] = parts;

  if (outputKeyword !== 'output') {
    throw new ReferenceParseError(value, 'Only .output references are supported');
  }

  if (!actionId || pathParts.length === 0) {
    throw new ReferenceParseError(value, 'Missing action ID or field path');
  }

  return {
    type: 'action-output',
    actionId,
    path: pathParts,
  };
}

/**
 * Resolve a parsed reference against action results
 */
export function resolveReference(
  ref: ParsedReference,
  results: Record<
    string,
    {
      result?:
        | { status: 'success'; output?: Record<string, unknown> }
        | { status: 'failure' | 'skipped' };
    }
  >,
): unknown {
  const actionResult = results[ref.actionId];

  if (
    !actionResult?.result ||
    actionResult.result.status !== 'success' ||
    !actionResult.result.output
  ) {
    return undefined;
  }

  // Navigate the path
  let value: unknown = actionResult.result.output;
  for (const key of ref.path) {
    if (value && typeof value === 'object' && key in (value as Record<string, unknown>)) {
      value = (value as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }

  return value;
}

/**
 * Check if a value contains any action references
 */
export function containsReferences(value: unknown): boolean {
  if (typeof value === 'string') {
    return value.includes('${') && value.includes('}');
  }

  if (Array.isArray(value)) {
    return value.some(containsReferences);
  }

  if (value && typeof value === 'object') {
    return Object.values(value).some(containsReferences);
  }

  return false;
}
