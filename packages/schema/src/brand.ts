import { z } from './zod-base';

/**
 * Brand support for JSON-safe schemas.
 * 
 * This module provides a way to add branded types to our JSON-safe schemas.
 * Brands provide compile-time type safety without affecting runtime behavior
 * or JSON serialization.
 * 
 * @example
 * import { z } from '@rainmaker/schema';
 * import { withBrand } from '@rainmaker/schema/brand';
 * 
 * const UserIdSchema = withBrand(z.string().uuid(), 'UserId');
 * const CustomerIdSchema = withBrand(z.string().uuid(), 'CustomerId');
 * 
 * type UserId = z.infer<typeof UserIdSchema>;
 * type CustomerId = z.infer<typeof CustomerIdSchema>;
 * 
 * // Type-safe at compile time
 * function processUser(id: UserId) { ... }
 * 
 * // But still just strings at runtime
 * const userId = UserIdSchema.parse('...');
 * JSON.stringify({ userId }); // Works fine
 */

/**
 * Adds a brand to a schema.
 * The brand exists only at the type level and doesn't affect runtime behavior.
 */
export function withBrand<
  T extends z.ZodType<string | number | boolean>,
  B extends string
>(schema: T, brand: B): z.ZodBranded<T, B> {
  // Zod's brand method is safe - it only adds type information
  return (schema as T & { brand: (b: B) => z.ZodBranded<T, B> }).brand(brand);
}

/**
 * Helper type for extracting the branded type
 */
export type Branded<T, B extends string> = T & { __brand: B };

/**
 * Common branded type definitions
 */
export const CommonBrands = {
  // ID types
  UserId: <T extends z.ZodString>(schema: T) => withBrand(schema, 'UserId'),
  CustomerId: <T extends z.ZodString>(schema: T) => withBrand(schema, 'CustomerId'),
  OrganizationId: <T extends z.ZodString>(schema: T) => withBrand(schema, 'OrganizationId'),
  ExecutionId: <T extends z.ZodString>(schema: T) => withBrand(schema, 'ExecutionId'),
  ActionId: <T extends z.ZodString>(schema: T) => withBrand(schema, 'ActionId'),
  
  // Numeric types
  Port: <T extends z.ZodNumber>(schema: T) => withBrand(schema, 'Port'),
  ProcessId: <T extends z.ZodNumber>(schema: T) => withBrand(schema, 'ProcessId'),
  Timestamp: <T extends z.ZodNumber>(schema: T) => withBrand(schema, 'Timestamp'),
  
  // URL types
  ApiUrl: <T extends z.ZodString>(schema: T) => withBrand(schema, 'ApiUrl'),
  WebhookUrl: <T extends z.ZodString>(schema: T) => withBrand(schema, 'WebhookUrl'),
} as const;