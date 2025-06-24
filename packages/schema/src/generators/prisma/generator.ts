import { z } from '../../zod-base';
import type { DeserializedJson, PrismaType, SerializableJson, SchemaGenerationOptions } from '../../types/prisma';
import { getPrismaModelMetadata, handleReservedKeyword, unwrapType } from '../../utils/utils';
import { validateSchema, validateRelations } from '../../utils/validation';
import { Logger } from '../../utils/logger';
import { mapZodFieldToPrisma } from './type-mapper';

const logger = Logger.getInstance();

export function generatePrismaModels(
  schemaMap: Map<string, z.ZodSchema<DeserializedJson>>,
  options: SchemaGenerationOptions = {}
): string {
  logger.setLogLevel(options.logLevel);
  logger.info('Starting Prisma schema generation');

  let prismaModels = '';
  const schemaToModelNameMap = new Map<z.ZodSchema<DeserializedJson>, string>();
  const enumsMap = new Map<string, z.ZodEnum<[string, ...string[]]>>();

  // Validate schemas if requested
  if (options.validateSchema) {
    logger.debug('Validating schemas');
    for (const [modelName, schema] of schemaMap.entries()) {
      try {
        validateSchema(schema, modelName);
        if (options.validateRelations) {
          validateRelations(schema as z.ZodObject<z.ZodRawShape>, schemaMap, modelName);
        }
      } catch (error) {
        logger.error('Schema validation failed', error);
        throw error;
      }
    }
  }

  // First pass: collect all enums and model names
  for (const [modelName, schema] of schemaMap.entries()) {
    schemaToModelNameMap.set(schema, modelName);
    collectEnums(schema, enumsMap, new Set());
  }

  // Generate enums
  prismaModels += generateEnums(enumsMap);
  
  // Generate models
  prismaModels += generateModels(schemaMap, schemaToModelNameMap, options);

  logger.info('Prisma schema generation completed');
  return prismaModels;
}

function collectEnums(
  schema: z.ZodType,
  enumsMap: Map<string, z.ZodEnum<[string, ...string[]]>>,
  visited: Set<z.ZodType>,
): void {
  if (visited.has(schema)) {
    return;
  }
  visited.add(schema);

  if (schema instanceof z.ZodObject) {
    for (const [key, field] of Object.entries(schema.shape)) {
      if (field instanceof z.ZodEnum) {
        const enumName = `${schema._def.toString() || 'Anonymous'}${key}Enum`;
        enumsMap.set(enumName, field);
      } else if (
        field instanceof z.ZodObject ||
        field instanceof z.ZodArray ||
        field instanceof z.ZodOptional ||
        field instanceof z.ZodNullable ||
        field instanceof z.ZodLazy
      ) {
        collectEnums(field, enumsMap, visited);
      }
    }
  } else if (
    schema instanceof z.ZodArray ||
    schema instanceof z.ZodOptional ||
    schema instanceof z.ZodNullable ||
    schema instanceof z.ZodLazy
  ) {
    const unwrapped = unwrapType(schema);
    collectEnums(unwrapped, enumsMap, visited);
  }
}

function generateEnums(
  enumsMap: Map<string, z.ZodEnum<[string, ...string[]]>>,
): string {
  let enumsStr = '';
  for (const [enumName, enumSchema] of enumsMap.entries()) {
    logger.debug(`Generating enum: ${enumName}`);
    enumsStr += `\nenum ${enumName} {\n`;
    for (const value of enumSchema.options) {
      enumsStr += `  ${value}\n`;
    }
    enumsStr += `}\n`;
  }
  return enumsStr;
}

function generateModels(
  schemaMap: Map<string, z.ZodSchema<DeserializedJson>>,
  schemaToModelNameMap: Map<z.ZodSchema<DeserializedJson>, string>,
  options: SchemaGenerationOptions,
): string {
  let modelsStr = '';

  for (const [modelName, schema] of schemaMap.entries()) {
    logger.debug(`Generating model: ${modelName}`);
    modelsStr += `\nmodel ${modelName} {\n`;

    const shape = schema instanceof z.ZodObject ? schema.shape : {};
    const visitedFields = new Set<z.ZodType>();

    for (const [key, zodType] of Object.entries(shape)) {
      try {
        const { prismaType, attributes } = mapZodFieldToPrisma(
          zodType as SerializableJson,
          key,
          (schema) => `${schemaToModelNameMap.get(schema) || 'Unknown'} String` as PrismaType,
          visitedFields,
        );

        const fieldLine = `  ${handleReservedKeyword(key)} ${prismaType} ${attributes.join(' ')}`.trim();
        modelsStr += `${fieldLine}\n`;
      } catch (error) {
        logger.error(
          `Failed to generate field '${key}' for model '${modelName}'`,
          error,
        );
        throw error;
      }
    }

    const modelMeta = getPrismaModelMetadata(schema);
    if (modelMeta?.indexes) {
      for (const index of modelMeta.indexes) {
        const indexFields = index.fields.join(', ');
        const indexName = index.name ? ` @map("${index.name}")` : '';
        const unique = index.unique ? ' @unique' : '';
        modelsStr += `  @@index([${indexFields}])${indexName}${unique}\n`;
      }
    }

    if (modelMeta?.map) {
      modelsStr += `  @@map("${modelMeta.map}")\n`;
    }

    if (modelMeta?.schema && options.defaultSchema !== modelMeta.schema) {
      modelsStr += `  @@schema("${modelMeta.schema}")\n`;
    }

    modelsStr += `}\n`;
  }

  return modelsStr;
} 