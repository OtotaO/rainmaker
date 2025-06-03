import { z } from 'zod';

// Define SchemaValidationError locally since import path is causing issues
class SchemaValidationError extends Error {
  constructor(message: string, public field?: string, public model?: string) {
    super(message);
    this.name = 'SchemaValidationError';
  }
}

const PRISMA_RESERVED_WORDS = new Set([
  'select', 'where', 'order', 'and', 'or', 'not', 'if', 'else',
  'for', 'while', 'do', 'return', 'function', 'var', 'let', 'const',
  'enum', 'class', 'interface', 'extends', 'implements', 'public',
  'private', 'protected', 'static', 'import', 'export', 'default',
  'new', 'delete', 'model', 'enum', 'type', 'interface', 'implements',
  'extends', 'true', 'false', 'null', 'undefined'
]);

export function validateFieldName(name: string, model?: string): void {
  if (PRISMA_RESERVED_WORDS.has(name.toLowerCase())) {
    throw new SchemaValidationError(
      `Field name '${name}' is a reserved word in Prisma`,
      name,
      model
    );
  }

  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    throw new SchemaValidationError(
      `Field name '${name}' must start with a letter or underscore and contain only alphanumeric characters and underscores`,
      name,
      model
    );
  }
}

export function validateSchema(schema: z.ZodType, model?: string): void {
  if (!(schema instanceof z.ZodObject)) {
    throw new SchemaValidationError(
      'Schema must be a ZodObject',
      undefined,
      model
    );
  }

  const shape = schema.shape;
  for (const [key, field] of Object.entries(shape)) {
    validateFieldName(key, model);
    validateFieldType(field as z.ZodType, key, model);
  }
}

function validateFieldType(field: z.ZodType, fieldName: string, model?: string): void {
  if (
    field instanceof z.ZodString ||
    field instanceof z.ZodNumber ||
    field instanceof z.ZodBoolean ||
    field instanceof z.ZodDate ||
    field instanceof z.ZodEnum ||
    field instanceof z.ZodObject ||
    field instanceof z.ZodArray ||
    field instanceof z.ZodOptional ||
    field instanceof z.ZodNullable ||
    field instanceof z.ZodLazy
  ) {
    // Valid types
    return;
  }

  throw new SchemaValidationError(
    `Unsupported Zod type '${field.constructor.name}' for field '${fieldName}'`,
    fieldName,
    model
  );
}

function checkFieldForRelations(
  field: z.ZodType,
  fieldName: string,
  schemaMap: Map<string, z.ZodSchema<any>>,
  model?: string
): void {
  // Check if field has a relation description
  if (field.description) {
    try {
      const meta = JSON.parse(field.description);
      if (meta.relation) {
        const [targetModel] = meta.relation.split('.');
        if (!schemaMap.has(targetModel)) {
          throw new SchemaValidationError(
            `Relation target model '${targetModel}' not found in schema map`,
            fieldName,
            model
          );
        }
      }
    } catch (e) {
      // Only ignore JSON parse errors, not our validation errors
      if (!(e instanceof SchemaValidationError)) {
        // Ignore JSON parse errors
      } else {
        throw e;
      }
    }
  }

  // Recursively check array elements
  if (field instanceof z.ZodArray) {
    checkFieldForRelations(field.element, fieldName, schemaMap, model);
  }

  // Recursively check object fields
  if (field instanceof z.ZodObject) {
    const shape = field.shape;
    for (const [key, nestedField] of Object.entries(shape)) {
      checkFieldForRelations(nestedField as z.ZodType, `${fieldName}.${key}`, schemaMap, model);
    }
  }

  // Check optional and nullable wrappers
  if (field instanceof z.ZodOptional || field instanceof z.ZodNullable) {
    checkFieldForRelations((field as any)._def.innerType, fieldName, schemaMap, model);
  }
}

export function validateRelations(
  schema: z.ZodObject<any>,
  schemaMap: Map<string, z.ZodSchema<any>>,
  model?: string
): void {
  const shape = schema.shape;
  for (const [key, field] of Object.entries(shape)) {
    checkFieldForRelations(field as z.ZodType, key, schemaMap, model);
  }
}

// Export the error class as well
export { SchemaValidationError };
