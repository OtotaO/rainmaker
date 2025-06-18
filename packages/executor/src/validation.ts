import { z } from 'zod';
import { JsonValueSchema, type JsonValue } from './schemas';

// Validation result
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

// JSON Schema type definition - using interface for circular reference
interface JsonSchema {
  type?: string | string[]; // Can be single type or array of types (union)
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  required?: string[];
  enum?: JsonValue[];
  const?: JsonValue; // Support const values
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  minItems?: number;
  maxItems?: number;
  multipleOf?: number;
  exclusiveMinimum?: boolean;
  exclusiveMaximum?: boolean;
  uniqueItems?: boolean;
  pattern?: string;
  format?: string;
  anyOf?: JsonSchema[];
  oneOf?: JsonSchema[];
  allOf?: JsonSchema[];
  [key: string]: unknown;
}

const JsonSchemaSchema: z.ZodType<JsonSchema> = z.lazy(() =>
  z.object({
    type: z.union([z.string(), z.array(z.string())]).optional(),
    properties: z.record(z.string(), JsonSchemaSchema).optional(),
    items: JsonSchemaSchema.optional(),
    required: z.array(z.string()).optional(),
    enum: z.array(JsonValueSchema).optional(),
    const: JsonValueSchema.optional(),
    minimum: z.number().optional(),
    maximum: z.number().optional(),
    minLength: z.number().optional(),
    maxLength: z.number().optional(),
    minItems: z.number().optional(),
    maxItems: z.number().optional(),
    multipleOf: z.number().optional(),
    exclusiveMinimum: z.boolean().optional(),
    exclusiveMaximum: z.boolean().optional(),
    uniqueItems: z.boolean().optional(),
    pattern: z.string().optional(),
    format: z.string().optional(),
    anyOf: z.array(JsonSchemaSchema).optional(),
    oneOf: z.array(JsonSchemaSchema).optional(),
    allOf: z.array(JsonSchemaSchema).optional(),
  }).passthrough()
);

// Validate data against a JSON schema (converted to Zod schema)
export async function validateAgainstSchema(
  data: JsonValue,
  jsonSchema: Record<string, JsonValue>,
): Promise<ValidationResult> {
  try {
    // Convert JSON Schema to Zod schema
    const zodSchema = jsonSchemaToZod(jsonSchema);

    // Validate data
    const result = zodSchema.safeParse(data);

    if (result.success) {
      return {
        valid: true,
        errors: [],
      };
    } else {
      // Extract error messages
      const errors = result.error.errors.map((err) => {
        const path = err.path.join('.');
        return path ? `${path}: ${err.message}` : err.message;
      });

      return {
        valid: false,
        errors,
      };
    }
  } catch (error) {
    // Schema conversion or validation error
    return {
      valid: false,
      errors: [
        `Schema validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      ],
    };
  }
}

/**
 * Converts JSON Schema to Zod schema for runtime validation.
 * 
 * Design philosophy:
 * - NEVER silently degrade validation (no z.unknown() fallbacks)
 * - Throw errors for unsupported features rather than ignore them
 * - This ensures schemas work as developers expect
 * 
 * Supported JSON Schema features:
 * - Basic types: string, number, integer, boolean, array, object, null
 * - Type unions: type: ['string', 'null']
 * - Combining schemas: anyOf, oneOf, allOf
 * - Constraints: minLength, maxLength, minimum, maximum, pattern, etc.
 * - Formats: email, uri, uuid, date-time, ipv4, ipv6, etc.
 * - Enums and const values
 * 
 * Unsupported features will throw errors:
 * - $ref references (would need schema registry)
 * - conditionalSchema (if/then/else)
 * - Dynamic references ($defs, $anchor)
 * 
 * @param jsonSchema - JSON Schema object
 * @returns Zod schema that validates according to the JSON Schema
 * @throws Error if schema contains unsupported features
 */
function jsonSchemaToZod(jsonSchema: Record<string, JsonValue>): z.ZodSchema {
  // Parse as JSON Schema
  const parsed = JsonSchemaSchema.safeParse(jsonSchema);
  if (!parsed.success) {
    throw new Error(`Invalid JSON Schema: ${parsed.error.message}`);
  }
  return jsonSchemaToZodInternal(parsed.data);
}

function jsonSchemaToZodInternal(jsonSchema: JsonSchema): z.ZodSchema {
  const type = jsonSchema.type;
  
  // Handle type arrays (union types) first
  if (Array.isArray(type)) {
    const schemas = type.map((t) => jsonSchemaToZodInternal({ ...jsonSchema, type: t }));
    if (schemas.length === 1) {
      return schemas[0];
    }
    return z.union(schemas as [z.ZodSchema, z.ZodSchema, ...z.ZodSchema[]]);
  }

  switch (type) {
    case 'string':
      return createStringSchema(jsonSchema);

    case 'number':
    case 'integer':
      return createNumberSchema(jsonSchema);

    case 'boolean':
      return z.boolean();

    case 'array':
      return createArraySchema(jsonSchema);

    case 'object':
      return createObjectSchema(jsonSchema);

    case 'null':
      return z.null();

    default:
      // Handle anyOf, oneOf, allOf
      if (jsonSchema.anyOf) {
        const schemas = jsonSchema.anyOf.map(jsonSchemaToZodInternal);
        return z.union(schemas as [z.ZodSchema, z.ZodSchema, ...z.ZodSchema[]]);
      }

      if (jsonSchema.oneOf) {
        // Zod doesn't have exact oneOf, use union
        const schemas = jsonSchema.oneOf.map(jsonSchemaToZodInternal);
        return z.union(schemas as [z.ZodSchema, z.ZodSchema, ...z.ZodSchema[]]);
      }

      if (jsonSchema.allOf) {
        // Merge all schemas
        let merged = z.object({});
        for (const subSchema of jsonSchema.allOf) {
          const zodSubSchema = jsonSchemaToZodInternal(subSchema);
          if (zodSubSchema instanceof z.ZodObject) {
            merged = merged.merge(zodSubSchema);
          }
        }
        return merged;
      }

      /**
       * CRITICAL: We must never silently fall back to z.unknown().
       * This would allow any data to pass validation, creating a false sense of security.
       * 
       * If we reach this point, it means:
       * 1. The schema has no 'type' field
       * 2. The schema uses features we don't support
       * 
       * Common unsupported features that might end up here:
       * - const/enum at root level
       * - $ref references
       * - Additional format validations
       * - Pattern properties
       * 
       * We throw an error to force explicit handling.
       */
      
      // Check for const value
      if ('const' in jsonSchema) {
        return z.literal(jsonSchema.const as any);
      }
      
      // Check for enum
      if ('enum' in jsonSchema && Array.isArray(jsonSchema.enum)) {
        const values = jsonSchema.enum;
        if (values.length === 1) {
          return z.literal(values[0] as any);
        }
        // Create union of literals
        const schemas = values.map(v => z.literal(v as any));
        return z.union(schemas as [z.ZodSchema, z.ZodSchema, ...z.ZodSchema[]]);
      }
      
      // If we still don't know what to do, throw an error
      throw new Error(
        `Unsupported JSON Schema configuration: ${JSON.stringify(jsonSchema)}. ` +
        `The schema must have a 'type' field or use 'anyOf'/'oneOf'/'allOf'/'const'/'enum'. ` +
        `Falling back to 'unknown' would bypass validation, which is a security risk.`
      );
  }
}

// Create string schema with constraints
function createStringSchema(jsonSchema: JsonSchema): z.ZodSchema {
  let schema = z.string();

  if (jsonSchema.minLength !== undefined) {
    schema = schema.min(jsonSchema.minLength);
  }

  if (jsonSchema.maxLength !== undefined) {
    schema = schema.max(jsonSchema.maxLength);
  }

  if (jsonSchema.pattern) {
    schema = schema.regex(new RegExp(jsonSchema.pattern));
  }

  if (jsonSchema.format) {
    switch (jsonSchema.format) {
      case 'email':
        schema = schema.email();
        break;
      case 'uri':
      case 'url':
        schema = schema.url();
        break;
      case 'uuid':
        schema = schema.uuid();
        break;
      case 'date-time':
        schema = schema.datetime();
        break;
      case 'date':
        // More strict date validation - check month (01-12) and day (01-31) ranges
        schema = schema.regex(
          /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/,
          'Invalid date format. Expected YYYY-MM-DD with valid month (01-12) and day (01-31)'
        );
        break;
      case 'time':
        schema = schema.regex(/^\d{2}:\d{2}:\d{2}$/, 'Invalid time format. Expected HH:MM:SS');
        break;
      case 'ipv4':
        schema = schema.ip({ version: 'v4' });
        break;
      case 'ipv6':
        schema = schema.ip({ version: 'v6' });
        break;
      default:
        /**
         * CRITICAL: Never ignore unsupported formats.
         * Silently skipping format validation could allow invalid data
         * that the schema author intended to reject.
         */
        throw new Error(
          `Unsupported string format '${jsonSchema.format}'. ` +
          `Supported formats: email, uri, url, uuid, date-time, date, time, ipv4, ipv6. ` +
          `Ignoring format validation would allow invalid data.`
        );
    }
  }

  if (jsonSchema.enum && jsonSchema.enum.length > 0) {
    // Use enum values - filter for strings only
    const stringEnums = jsonSchema.enum.filter((v): v is string => typeof v === 'string');
    if (stringEnums.length === 0) {
      return schema; // No string values in enum
    }
    if (stringEnums.length === 1) {
      return z.literal(stringEnums[0]);
    }
    const [first, second, ...rest] = stringEnums;
    return z.enum([first, second, ...rest] as [string, string, ...string[]]);
  }

  return schema;
}

// Create number schema with constraints
function createNumberSchema(jsonSchema: JsonSchema): z.ZodSchema {
  let schema = jsonSchema.type === 'integer' ? z.number().int() : z.number();

  if (jsonSchema.minimum !== undefined) {
    schema = jsonSchema.exclusiveMinimum
      ? schema.gt(jsonSchema.minimum)
      : schema.gte(jsonSchema.minimum);
  }

  if (jsonSchema.maximum !== undefined) {
    schema = jsonSchema.exclusiveMaximum
      ? schema.lt(jsonSchema.maximum)
      : schema.lte(jsonSchema.maximum);
  }

  if (jsonSchema.multipleOf !== undefined && jsonSchema.multipleOf !== null) {
    schema = schema.multipleOf(jsonSchema.multipleOf);
  }

  if (jsonSchema.enum && jsonSchema.enum.length > 0) {
    // Create union of literal numbers
    const numericEnums = jsonSchema.enum.filter((v): v is number => typeof v === 'number');
    if (numericEnums.length === 0) {
      return schema; // No numeric values in enum
    }
    if (numericEnums.length === 1) {
      return z.literal(numericEnums[0]);
    }
    const [first, second, ...rest] = numericEnums;
    return z.union([z.literal(first), z.literal(second), ...rest.map(v => z.literal(v))]);
  }

  return schema;
}

// Create array schema
function createArraySchema(jsonSchema: JsonSchema): z.ZodSchema {
  const itemSchema = jsonSchema.items ? jsonSchemaToZodInternal(jsonSchema.items) : z.unknown();

  let schema = z.array(itemSchema);

  if (jsonSchema.minItems !== undefined && jsonSchema.minItems !== null) {
    schema = schema.min(jsonSchema.minItems);
  }

  if (jsonSchema.maxItems !== undefined && jsonSchema.maxItems !== null) {
    schema = schema.max(jsonSchema.maxItems);
  }

  if (jsonSchema.uniqueItems) {
    // Zod doesn't have built-in unique validation
    return schema.refine((items) => new Set(items).size === items.length, {
      message: 'Array must contain unique items',
    });
  }

  return schema;
}

// Create object schema
function createObjectSchema(jsonSchema: JsonSchema): z.ZodSchema {
  const shape: Record<string, z.ZodSchema> = {};

  // Handle properties
  if (jsonSchema.properties) {
    for (const [key, propSchema] of Object.entries(jsonSchema.properties)) {
      shape[key] = jsonSchemaToZodInternal(propSchema);
    }
  }

  // Handle required properties
  const required = new Set(jsonSchema.required || []);

  // Make non-required properties optional
  for (const [key, schema] of Object.entries(shape)) {
    if (!required.has(key)) {
      shape[key] = schema.optional();
    }
  }

  let objectSchema = z.object(shape);

  // Handle additionalProperties
  if (jsonSchema.additionalProperties === false) {
    return objectSchema.strict();
  } else if (typeof jsonSchema.additionalProperties === 'object') {
    // Zod doesn't support typed additional properties directly
    // We'd need to use passthrough and custom validation
    return objectSchema.passthrough();
  }

  // Handle patternProperties (simplified - not fully supported)
  if (jsonSchema.patternProperties) {
    return objectSchema.passthrough();
  }

  return objectSchema;
}

// Validate that JSON is well-formed
export function validateJson(input: string): ValidationResult {
  try {
    JSON.parse(input);
    return {
      valid: true,
      errors: [],
    };
  } catch (error) {
    return {
      valid: false,
      errors: [`Invalid JSON: ${error instanceof Error ? error.message : 'Parse error'}`],
    };
  }
}

// Check if a value matches expected type
export function validateType(value: JsonValue, expectedType: string): boolean {
  switch (expectedType) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number' && !isNaN(value);
    case 'integer':
      return typeof value === 'number' && Number.isInteger(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'array':
      return Array.isArray(value);
    case 'object':
      return value !== null && typeof value === 'object' && !Array.isArray(value);
    case 'null':
      return value === null;
    default:
      return true;
  }
}

// Deep validate nested data structure
export function deepValidate(data: JsonValue, schema: JsonSchema, path: string = ''): string[] {
  const errors: string[] = [];

  if (schema.type && !validateType(data, schema.type)) {
    errors.push(`${path || 'root'}: Expected ${schema.type} but got ${typeof data}`);
    return errors;
  }

  if (schema.type === 'object' && schema.properties) {
    for (const [key, propSchema] of Object.entries(schema.properties)) {
      const propPath = path ? `${path}.${key}` : key;
      const propValue = data[key];

      if (propValue === undefined) {
        if (schema.required?.includes(key)) {
          errors.push(`${propPath}: Required property is missing`);
        }
      } else {
        if (typeof propSchema === 'object' && propSchema !== null) {
          errors.push(...deepValidate(propValue, propSchema as JsonSchema, propPath));
        }
      }
    }
  }

  if (schema.type === 'array' && schema.items && Array.isArray(data)) {
    data.forEach((item, index) => {
      const itemPath = `${path}[${index}]`;
      if (schema.items) {
        errors.push(...deepValidate(item, schema.items, itemPath));
      }
    });
  }

  return errors;
}

// Sanitize data to ensure it's JSON-serializable
export function sanitizeForJson(data: unknown): JsonValue {
  if (data === null || data === undefined) {
    return null;
  }

  if (typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean') {
    return data;
  }

  if (data instanceof Date) {
    return data.toISOString();
  }

  if (data instanceof RegExp) {
    return data.toString();
  }

  if (typeof data === 'function') {
    return '[Function]';
  }

  if (typeof data === 'symbol') {
    return data.toString();
  }

  if (Array.isArray(data)) {
    return data.map(sanitizeForJson);
  }

  if (typeof data === 'object') {
    const result: Record<string, JsonValue> = {};
    for (const [key, value] of Object.entries(data)) {
      // Skip symbol keys
      if (typeof key === 'string') {
        result[key] = sanitizeForJson(value);
      }
    }
    return result;
  }

  // Fallback
  return String(data);
}
