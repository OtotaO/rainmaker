// File: packages/api/src/lib/schema-utils.ts

import { z } from 'zod';
import { logger } from './logger';

export type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>;
    }
  : T;

export function createFlexibleSchema<T extends z.ZodRawShape>(schema: z.ZodObject<T>) {
  const flexibleSchema = z.object(
    Object.fromEntries(Object.entries(schema.shape).map(([key, value]) => [key, value.optional()]))
  ) as z.ZodObject<{ [K in keyof T]: z.ZodOptional<T[K]> }>;

  return flexibleSchema;
}

export type FlexibleSchema<T extends z.ZodRawShape> = z.infer<
  ReturnType<typeof createFlexibleSchema<T>>
>;

export function validateAndSanitize<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>,
  data: unknown
): Partial<z.infer<z.ZodObject<T>>> {
  const result: Partial<z.infer<z.ZodObject<T>>> = {};
  const schemaEntries = Object.entries(schema.shape);

  for (const [key, validator] of schemaEntries) {
    try {
      const value = validator.parse((data as any)[key]);
      result[key as keyof z.infer<z.ZodObject<T>>] = value;
    } catch (error) {
      logger.warn(`Validation failed for field "${key}"`, { error });
    }
  }

  return result;
}

export function sanitizeInput(input: string): string {
  return input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
}
