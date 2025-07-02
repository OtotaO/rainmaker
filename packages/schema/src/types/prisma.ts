import type { ZodType, ZodObject, ZodRawShape } from '../zod-base';
import { LogLevel } from '../logger';

// Type definitions
type SerializableJson = ZodObject<ZodRawShape>;
type DeserializedJson = unknown;

interface PrismaFieldMetadata {
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

interface PrismaModelMetadata {
  indexes?: Array<{
    fields: string[];
    name?: string;
    unique?: boolean;
  }>;
  map?: string;
  schema?: string;
}

type ValueOf<T> = T[keyof T];

type AllowedZodTypeNames =
  | 'ZodString'
  | 'ZodNumber'
  | 'ZodBoolean'
  | 'ZodDate'
  | 'ZodEnum';

const zodToPrismaTypeMap = {
  ZodString: 'String',
  ZodNumber: 'Int',
  ZodBoolean: 'Boolean',
  ZodDate: 'DateTime',
  ZodEnum: 'Enum',
} as const;

type PrismaType = `${string} ${ValueOf<typeof zodToPrismaTypeMap>} ${string}`;

class SchemaValidationError extends Error {
  constructor(message: string, public field?: string, public model?: string) {
    super(message);
    this.name = 'SchemaValidationError';
  }
}

class SchemaGenerationError extends Error {
  constructor(message: string, public field?: string, public model?: string) {
    super(message);
    this.name = 'SchemaGenerationError';
  }
}

type SchemaGenerationOptions = {
  logLevel?: LogLevel;
  outputPath?: string;
  schemaPath?: string;
  include?: string[];
  exclude?: string[];
  validateSchema?: boolean;
  validateRelations?: boolean;
  defaultSchema?: string;
};

interface PrismaField {
  name: string;
  type: string;
  isOptional: boolean;
  isUnique?: boolean;
  isId?: boolean;
}

interface PrismaModel {
  name: string;
  fields: PrismaField[];
}

interface PrismaSchema {
  models: PrismaModel[];
}

type SchemaMap = Record<string, ZodObject<ZodRawShape>>;

// Export for ESM
export {
  SerializableJson,
  DeserializedJson,
  PrismaFieldMetadata,
  PrismaModelMetadata,
  ValueOf,
  AllowedZodTypeNames,
  zodToPrismaTypeMap,
  PrismaType,
  SchemaValidationError,
  SchemaGenerationError,
  SchemaGenerationOptions,
  PrismaField,
  PrismaModel,
  PrismaSchema,
  SchemaMap,
};
