import { z } from 'zod';

export type SerializableJson = z.ZodType<any, any, any>;
export type DeserializedJson = any;

export interface PrismaFieldMetadata {
  unique?: boolean;
  default?: string;
  id?: boolean;
  updatedAt?: boolean;
  index?: boolean;
  relation?: string;
  map?: string;
  db?: {
    type?: string;
    name?: string;
  };
}

export interface PrismaModelMetadata {
  indexes?: Array<{
    fields: string[];
    name?: string;
    unique?: boolean;
  }>;
  map?: string;
  schema?: string;
}

export type ValueOf<T> = T[keyof T];

export type AllowedZodTypeNames =
  | 'ZodString'
  | 'ZodNumber'
  | 'ZodBoolean'
  | 'ZodDate'
  | 'ZodEnum';

export const zodToPrismaTypeMap = {
  ZodString: 'String',
  ZodNumber: 'Int',
  ZodBoolean: 'Boolean',
  ZodDate: 'DateTime',
  ZodEnum: 'Enum',
} as const;

export type PrismaType = `${string} ${ValueOf<typeof zodToPrismaTypeMap>} ${string}`;

export class SchemaValidationError extends Error {
  constructor(message: string, public field?: string, public model?: string) {
    super(message);
    this.name = 'SchemaValidationError';
  }
}

export class SchemaGenerationError extends Error {
  constructor(message: string, public field?: string, public model?: string) {
    super(message);
    this.name = 'SchemaGenerationError';
  }
}

export interface SchemaGenerationOptions {
  validateSchema?: boolean;
  validateFieldNames?: boolean;
  validateRelations?: boolean;
  customScalars?: Record<string, string>;
  defaultSchema?: string;
  logLevel?: 'error' | 'warn' | 'info' | 'debug';
} 