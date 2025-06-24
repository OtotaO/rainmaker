/**
 * JSON-Safe Zod
 * 
 * This module provides a constrained version of Zod that only allows
 * JSON-serializable schemas. All schemas created with this module are
 * guaranteed to be serializable to JSON without loss of information.
 * 
 * @module
 */

// Import from our base module to avoid circular dependency with path mapping
import { z as zOriginal } from './zod-base';

// Type for our custom error messages that will appear in IDE tooltips
type JsonSerializableOnlyError = 
  "This codebase only supports JSON-serializable Zod schemas. Use z.string() for dates, z.record() for maps, and avoid transforms/lazy/custom types.";

// Helper type to make error functions that return never but show our error message
type ErrorFunction = (..._args: unknown[]) => JsonSerializableOnlyError;

/**
 * Interface for our JSON-safe Zod subset
 * Preserves original types for better IDE support
 */
export interface JsonSafeZod {
  // Primitives
  string: typeof zOriginal.string;
  number: typeof zOriginal.number;
  boolean: typeof zOriginal.boolean;
  null: typeof zOriginal.null;
  literal: typeof zOriginal.literal;
  
  // Composite types
  object: typeof zOriginal.object;
  array: typeof zOriginal.array;
  record: typeof zOriginal.record;
  union: typeof zOriginal.union;
  discriminatedUnion: typeof zOriginal.discriminatedUnion;
  
  // Modifiers
  optional: typeof zOriginal.optional;
  nullable: typeof zOriginal.nullable;
  
  // Helper patterns for common JSON-safe alternatives
  dateString: () => ReturnType<typeof zOriginal.string>;
  numberString: () => ReturnType<typeof zOriginal.string>;
  uuid: () => ReturnType<typeof zOriginal.string>;
  url: () => ReturnType<typeof zOriginal.string>;
  email: () => ReturnType<typeof zOriginal.string>;
  int: () => ReturnType<typeof zOriginal.number>;
  
  // Forbidden types - these will show errors
  date: ErrorFunction;
  bigint: ErrorFunction;
  symbol: ErrorFunction;
  undefined: ErrorFunction;
  void: ErrorFunction;
  any: ErrorFunction;
  unknown: ErrorFunction;
  never: ErrorFunction;
  map: ErrorFunction;
  set: ErrorFunction;
  function: ErrorFunction;
  lazy: ErrorFunction;
  transform: ErrorFunction;
  promise: ErrorFunction;
  effect: ErrorFunction;
  custom: ErrorFunction;
  nan: ErrorFunction;
  enum: ErrorFunction;
}


/**
 * JSON-safe version of Zod
 * 
 * Only includes methods that produce JSON-serializable schemas.
 * Attempting to use non-JSON-serializable methods will result in
 * compile-time errors with helpful guidance.
 */
export const z: JsonSafeZod = {
  // ============================================================
  // JSON-Safe Primitives
  // ============================================================
  
  /**
   * String schema - JSON serializable
   * @example z.string().min(1).max(100)
   */
  string: zOriginal.string,
  
  /**
   * Number schema - JSON serializable
   * @example z.number().int().positive()
   */
  number: zOriginal.number,
  
  /**
   * Boolean schema - JSON serializable
   * @example z.boolean()
   */
  boolean: zOriginal.boolean,
  
  /**
   * Null schema - JSON serializable
   * @example z.null()
   */
  null: zOriginal.null,
  
  /**
   * Literal schema - JSON serializable for string/number/boolean/null
   * @example z.literal('active')
   */
  literal: zOriginal.literal,
  
  // ============================================================
  // JSON-Safe Composite Types
  // ============================================================
  
  /**
   * Object schema - JSON serializable
   * @example z.object({ name: z.string() })
   */
  object: zOriginal.object,
  
  /**
   * Array schema - JSON serializable
   * @example z.array(z.string())
   */
  array: zOriginal.array,
  
  /**
   * Record schema - JSON serializable (string keys only)
   * @example z.record(z.string(), z.number())
   */
  record: zOriginal.record,
  
  /**
   * Union schema - JSON serializable
   * @example z.union([z.string(), z.number()])
   */
  union: zOriginal.union,
  
  /**
   * Discriminated union - JSON serializable
   * @example z.discriminatedUnion('type', [
   *   z.object({ type: z.literal('a'), data: z.string() }),
   *   z.object({ type: z.literal('b'), data: z.number() })
   * ])
   */
  discriminatedUnion: zOriginal.discriminatedUnion,
  
  // ============================================================
  // JSON-Safe Modifiers
  // ============================================================
  
  /**
   * Optional modifier - wraps schema in ZodOptional
   * @example z.optional(z.string())
   */
  optional: zOriginal.optional,
  
  /**
   * Nullable modifier - wraps schema in ZodNullable
   * @example z.nullable(z.string())
   */
  nullable: zOriginal.nullable,
  
  // ============================================================
  // Utility Types (not schemas, but needed)
  // ============================================================
  
  // Note: z.infer is a type, not a value - use it as z.infer<typeof schema>
  
  // ============================================================
  // Helper Patterns for Common JSON-Safe Alternatives
  // ============================================================
  
  /**
   * ISO date string validation - best practice for JSON date handling
   * Uses Zod's built-in ISO datetime validator
   * @example z.dateString() // matches "2023-12-25T10:30:00.000Z"
   */
  dateString: () => zOriginal.string().datetime({ message: 'Invalid ISO datetime format' }),
  
  /**
   * Numeric string pattern - validates digit-only strings
   * Best practice: Keep as string to preserve leading zeros
   * @example z.numberString() // matches "123", "0", "00042"
   * @example z.numberString().transform(Number) // if you need a number
   */
  numberString: () => zOriginal.string().regex(
    /^\d+$/,
    { message: 'Must contain only digits' }
  ),
  
  /**
   * UUID validation - uses Zod's built-in UUID validator
   * @example z.uuid() // matches "550e8400-e29b-41d4-a716-446655440000"
   */
  uuid: () => zOriginal.string().uuid(),
  
  /**
   * URL validation - uses Zod's built-in URL validator
   * @example z.url() // matches "https://example.com"
   */
  url: () => zOriginal.string().url(),
  
  /**
   * Email validation - uses Zod's built-in email validator
   * @example z.email() // matches "user@example.com"
   */
  email: () => zOriginal.string().email(),
  
  /**
   * Integer validation - validates whole numbers only
   * Convenience method that combines z.number().int()
   * @example z.int() // only accepts integers like 1, -5, 1000
   * @example z.int().min(1).max(100) // with additional constraints
   * Note: JSON represents all numbers the same way, but this adds runtime validation
   */
  int: () => zOriginal.number().int(),
  
  
  // ============================================================
  // Forbidden Types - These will cause compile-time errors
  // ============================================================
  
  date: ((...__args: unknown[]): JsonSerializableOnlyError => {
    throw new Error("JSON-serializable schemas only. Use z.string() with ISO date format instead of z.date()");
  }) as ErrorFunction,
  
  bigint: ((..._args: unknown[]): JsonSerializableOnlyError => {
    throw new Error("JSON-serializable schemas only. Use z.number() or z.string() instead of z.bigint()");
  }) as ErrorFunction,
  
  symbol: ((..._args: unknown[]): JsonSerializableOnlyError => {
    throw new Error("JSON-serializable schemas only. Symbols are not JSON-serializable");
  }) as ErrorFunction,
  
  undefined: ((..._args: unknown[]): JsonSerializableOnlyError => {
    throw new Error("JSON-serializable schemas only. Use z.null() or z.optional() instead of z.undefined()");
  }) as ErrorFunction,
  
  void: ((..._args: unknown[]): JsonSerializableOnlyError => {
    throw new Error("JSON-serializable schemas only. Void is not JSON-serializable");
  }) as ErrorFunction,
  
  any: ((..._args: unknown[]): JsonSerializableOnlyError => {
    throw new Error("JSON-serializable schemas only. Define explicit schema instead of z.any()");
  }) as ErrorFunction,
  
  unknown: ((..._args: unknown[]): JsonSerializableOnlyError => {
    throw new Error("JSON-serializable schemas only. Define explicit schema instead of z.unknown()");
  }) as ErrorFunction,
  
  never: ((..._args: unknown[]): JsonSerializableOnlyError => {
    throw new Error("JSON-serializable schemas only. Never type is not JSON-serializable");
  }) as ErrorFunction,
  
  map: ((..._args: unknown[]): JsonSerializableOnlyError => {
    throw new Error("JSON-serializable schemas only. Use z.record() instead of z.map()");
  }) as ErrorFunction,
  
  set: ((..._args: unknown[]): JsonSerializableOnlyError => {
    throw new Error("JSON-serializable schemas only. Use z.array() instead of z.set()");
  }) as ErrorFunction,
  
  function: ((..._args: unknown[]): JsonSerializableOnlyError => {
    throw new Error("JSON-serializable schemas only. Functions are not JSON-serializable");
  }) as ErrorFunction,
  
  lazy: ((..._args: unknown[]): JsonSerializableOnlyError => {
    throw new Error("JSON-serializable schemas only. Use explicit recursive types instead of z.lazy()");
  }) as ErrorFunction,
  
  transform: ((..._args: unknown[]): JsonSerializableOnlyError => {
    throw new Error("JSON-serializable schemas only. Transforms are not allowed - handle transformations outside the schema");
  }) as ErrorFunction,
  
  promise: ((..._args: unknown[]): JsonSerializableOnlyError => {
    throw new Error("JSON-serializable schemas only. Promises are not JSON-serializable");
  }) as ErrorFunction,
  
  effect: ((..._args: unknown[]): JsonSerializableOnlyError => {
    throw new Error("JSON-serializable schemas only. Effects are not allowed - handle side effects outside the schema");
  }) as ErrorFunction,
  
  custom: ((..._args: unknown[]): JsonSerializableOnlyError => {
    throw new Error("JSON-serializable schemas only. Custom types are not allowed");
  }) as ErrorFunction,
  
  nan: ((..._args: unknown[]): JsonSerializableOnlyError => {
    throw new Error("JSON-serializable schemas only. NaN is not reliably JSON-serializable");
  }) as ErrorFunction,
  
  // Special handling for enum since it's commonly used
  enum: ((..._args: unknown[]): JsonSerializableOnlyError => {
    throw new Error("JSON-serializable schemas only. Use z.union([z.literal('a'), z.literal('b')]) instead of z.enum()");
  }) as ErrorFunction,
} as const;

// ============================================================
// Type Exports
// ============================================================

// Re-export all Zod types so they're available when importing from our module
export type * from './zod-base';

// Add namespace augmentation for z to support z.infer
export namespace z {
  export type infer<T extends zOriginal.ZodType> = T['_output'];
  export type input<T extends zOriginal.ZodType> = T['_input'];
  export type output<T extends zOriginal.ZodType> = T['_output'];
  export type ZodType = zOriginal.ZodType;
}


// Helper type to extract JSON-safe schemas
export type JsonSafeSchema = 
  | ReturnType<typeof z.string>
  | ReturnType<typeof z.number>
  | ReturnType<typeof z.boolean>
  | ReturnType<typeof z.null>
  | ReturnType<typeof z.literal>
  | ReturnType<typeof z.array>
  | ReturnType<typeof z.object>
  | ReturnType<typeof z.record>
  | ReturnType<typeof z.union>
  | ReturnType<typeof z.discriminatedUnion>
  | ReturnType<typeof z.optional>
  | ReturnType<typeof z.nullable>;


// ============================================================
// Runtime Validation Helpers
// ============================================================

/**
 * Validates that a value is JSON-serializable at runtime
 * Throws a descriptive error if the value contains non-serializable types
 * 
 * @example
 * const data = { name: "John", created: new Date() };
 * assertJsonSerializable(data); // Throws: "Value contains non-JSON-serializable type: Date"
 */
export function assertJsonSerializable<T>(value: T, path: string = 'root'): T {
  const seen = new WeakSet();
  
  function check(val: unknown, currentPath: string): void {
    // Handle primitives
    if (val === null || val === undefined) return;
    if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') return;
    
    // Check for non-JSON types
    if (typeof val === 'function') {
      throw new Error(`Value contains non-JSON-serializable type at ${currentPath}: function`);
    }
    if (typeof val === 'symbol') {
      throw new Error(`Value contains non-JSON-serializable type at ${currentPath}: symbol`);
    }
    if (typeof val === 'bigint') {
      throw new Error(`Value contains non-JSON-serializable type at ${currentPath}: bigint`);
    }
    if (val instanceof Date) {
      throw new Error(`Value contains non-JSON-serializable type at ${currentPath}: Date (use ISO string instead)`);
    }
    if (val instanceof RegExp) {
      throw new Error(`Value contains non-JSON-serializable type at ${currentPath}: RegExp`);
    }
    if (val instanceof Map) {
      throw new Error(`Value contains non-JSON-serializable type at ${currentPath}: Map (use object instead)`);
    }
    if (val instanceof Set) {
      throw new Error(`Value contains non-JSON-serializable type at ${currentPath}: Set (use array instead)`);
    }
    
    // Handle objects and arrays
    if (typeof val === 'object') {
      // Check for circular references
      if (seen.has(val)) {
        throw new Error(`Value contains circular reference at ${currentPath}`);
      }
      seen.add(val);
      
      if (Array.isArray(val)) {
        val.forEach((item, index) => check(item, `${currentPath}[${index}]`));
      } else {
        Object.entries(val).forEach(([key, value]) => {
          check(value, `${currentPath}.${key}`);
        });
      }
    }
  }
  
  check(value, path);
  return value;
}

/**
 * Attempts to make a value JSON-safe by converting known types
 * Returns a new object with Date -> ISO string, undefined removed, etc.
 * 
 * @example
 * const data = { name: "John", created: new Date() };
 * const safe = makeJsonSafe(data); // { name: "John", created: "2023-12-25T10:30:00.000Z" }
 */
export function makeJsonSafe<T>(value: T): unknown {
  const seen = new WeakMap();
  
  function convert(val: unknown): unknown {
    // Handle primitives
    if (val === null) return null;
    if (val === undefined) return undefined; // Will be removed by JSON.stringify
    if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') return val;
    
    // Convert non-JSON types
    if (typeof val === 'bigint') return val.toString();
    if (val instanceof Date) return val.toISOString();
    if (val instanceof Map) return convert(Object.fromEntries(val));
    if (val instanceof Set) return convert(Array.from(val));
    
    // Throw on unconvertible types
    if (typeof val === 'function') throw new Error('Cannot convert function to JSON');
    if (typeof val === 'symbol') throw new Error('Cannot convert symbol to JSON');
    if (val instanceof RegExp) return val.toString();
    
    // Handle objects and arrays
    if (typeof val === 'object') {
      // Handle circular references
      if (seen.has(val)) {
        return seen.get(val);
      }
      
      if (Array.isArray(val)) {
        const result: unknown[] = [];
        seen.set(val, result);
        val.forEach(item => result.push(convert(item)));
        return result;
      } else {
        const result: Record<string, unknown> = {};
        seen.set(val, result);
        Object.entries(val).forEach(([key, value]) => {
          const converted = convert(value);
          if (converted !== undefined) {
            result[key] = converted;
          }
        });
        return result;
      }
    }
    
    return val;
  }
  
  return convert(value);
}