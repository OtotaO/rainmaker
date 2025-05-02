import { z } from 'zod';
import { generatePrismaModels } from './generators/prisma/generator';

/**
 * Generates a Prisma schema from a map of Zod schemas.
 * @param schemaMap A map of model names to their corresponding Zod schemas
 * @returns The generated Prisma schema as a string
 */
export function generateSchema(schemaMap: Map<string, z.ZodSchema<any>>): string {
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
