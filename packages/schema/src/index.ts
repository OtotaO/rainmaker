import { generatePrismaModels } from './generators/prisma/generator';
import { z } from './zod';

/**
 * Generates a Prisma schema from a map of Zod schemas.
 * @param schemaMap A map of model names to their corresponding Zod schemas
 * @returns The generated Prisma schema as a string
 */
export function generateSchema(schemaMap: Map<string, z.ZodType>): string {
  const baseSchema = `
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}
`;

  return baseSchema + generatePrismaModels(schemaMap);
}

// Re-export types for convenience
export * from './types/prisma';
export * from './types/configSetting';
export * from './types/enums';
export * from './types/execution';

// Export our JSON-safe Zod and helpers
export { z, assertJsonSerializable, makeJsonSafe } from './zod';
export type * from './zod';

// Export brand utilities
export { withBrand, CommonBrands } from './brand';
export type { Branded } from './brand';
