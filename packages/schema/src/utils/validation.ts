import { z } from '../zod';
import { z as zRaw } from '../zod-base';
import { SchemaValidationError } from '../types/prisma';

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
  if (!(schema instanceof zRaw.ZodObject)) {
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
    field instanceof zRaw.ZodString ||
    field instanceof zRaw.ZodNumber ||
    field instanceof zRaw.ZodBoolean ||
    field instanceof zRaw.ZodDate ||
    field instanceof zRaw.ZodEnum ||
    (field instanceof zRaw.ZodUnion &&
      (
        field as zRaw.ZodUnion<[
          zRaw.ZodLiteral<string>,
          zRaw.ZodLiteral<string>,
          ...zRaw.ZodLiteral<string>[]
        ]>
      )._def.options.every(
        (opt: zRaw.ZodLiteral<string>) => opt instanceof zRaw.ZodLiteral
      )) ||
    field instanceof zRaw.ZodObject ||
    field instanceof zRaw.ZodArray ||
    field instanceof zRaw.ZodOptional ||
    field instanceof zRaw.ZodNullable ||
    field instanceof zRaw.ZodLazy
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

export function validateRelations(
  schema: zRaw.ZodObject<zRaw.ZodRawShape>,
  schemaMap: Map<string, zRaw.ZodSchema>,
  model?: string
): void {
  const shape = schema.shape;
  for (const [key, field] of Object.entries(shape)) {
    if (field instanceof zRaw.ZodObject) {
      const meta = field.description ? JSON.parse(field.description) : {};
      if (meta.relation) {
        const [targetModel] = meta.relation.split('.');
        if (!schemaMap.has(targetModel)) {
          throw new SchemaValidationError(
            `Relation target model '${targetModel}' not found in schema map`,
            key,
            model
          );
        }
      }
    } else if (field instanceof zRaw.ZodArray) {
      const elementType = field.element;
      if (elementType instanceof zRaw.ZodObject) {
        const meta = elementType.description ? JSON.parse(elementType.description) : {};
        if (meta.relation) {
          const [targetModel] = meta.relation.split('.');
          if (!schemaMap.has(targetModel)) {
            throw new SchemaValidationError(
              `Relation target model '${targetModel}' not found in schema map`,
              key,
              model
            );
          }
        }
      }
    }
  }
} 