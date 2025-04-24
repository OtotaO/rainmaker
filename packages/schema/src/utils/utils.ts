import { z } from 'zod';
import type { PrismaFieldMetadata, PrismaModelMetadata } from '../types/prisma';

export function capitalizeFirstLetter(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function getPrismaFieldMetadata(field: z.ZodType): PrismaFieldMetadata | undefined {
  const description = field.description;
  if (!description) return undefined;

  try {
    return JSON.parse(description) as PrismaFieldMetadata;
  } catch {
    return undefined;
  }
}

export function getPrismaModelMetadata(schema: z.ZodType): PrismaModelMetadata | undefined {
  const description = schema.description;
  if (!description) return undefined;

  try {
    return JSON.parse(description) as PrismaModelMetadata;
  } catch {
    return undefined;
  }
}

export function handleReservedKeyword(fieldName: string): string {
  const reservedKeywords = new Set([
    'select', 'where', 'order', 'and', 'or', 'not', 'if', 'else',
    'for', 'while', 'do', 'return', 'function', 'var', 'let', 'const',
    'enum', 'class', 'interface', 'extends', 'implements', 'public',
    'private', 'protected', 'static', 'import', 'export', 'default',
    'new', 'delete'
  ]);

  if (reservedKeywords.has(fieldName)) {
    return `\`${fieldName}\``;
  }
  return fieldName;
}

export function unwrapType(schema: z.ZodType): z.ZodType {
  if (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable) {
    return unwrapType(schema.unwrap());
  } else if (schema instanceof z.ZodArray) {
    return unwrapType(schema.element);
  } else if (schema instanceof z.ZodLazy) {
    return unwrapType(schema.schema);
  }
  return schema;
} 