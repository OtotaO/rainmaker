import { z } from '../../zod-base';
import type { DeserializedJson, PrismaType, SerializableJson, SchemaGenerationOptions } from '../../types/prisma';
import { getPrismaModelMetadata, handleReservedKeyword, unwrapType, capitalizeFirstLetter } from '../../utils/utils'; // Import capitalizeFirstLetter
import { validateSchema, validateRelations } from '../../utils/validation';
import { Logger } from '../../utils/logger';
import { mapZodFieldToPrisma, getEnumName } from './type-mapper'; // Import getEnumName

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
  const allSchemasToGenerate = new Map<string, z.ZodSchema<DeserializedJson>>(); // Collect all schemas, including nested ones
  const inverseRelations: { // Define type for inverse relations
    fromModel: string;
    toModel: string;
    fieldName: string;
    relationName: string;
    isList: boolean;
    isOptional: boolean;
  }[] = [];

  // First pass: collect all top-level schemas and their names
  for (const [modelName, schema] of schemaMap.entries()) {
    allSchemasToGenerate.set(modelName, schema);
    schemaToModelNameMap.set(schema, modelName);
  }

  // Second pass: recursively discover nested models and enums
  for (const [modelName, schema] of allSchemasToGenerate.entries()) {
    collectNestedModelsAndEnums(schema, modelName, allSchemasToGenerate, schemaToModelNameMap, enumsMap, new Set());
  }

  // Validate schemas if requested (after all models are collected)
  if (options.validateSchema) {
    logger.debug('Validating schemas');
    for (const [modelName, schema] of allSchemasToGenerate.entries()) {
      try {
        validateSchema(schema, modelName);
        if (options.validateRelations) {
          // Filter to only pass ZodObject schemas to validateRelations
          const objectSchemas = new Map<string, z.ZodObject<z.ZodRawShape>>();
          for (const [name, s] of allSchemasToGenerate.entries()) {
            if (s instanceof z.ZodObject) {
              objectSchemas.set(name, s);
            }
          }
          validateRelations(schema as z.ZodObject<z.ZodRawShape>, objectSchemas, modelName);
        }
      } catch (error) {
        logger.error('Schema validation failed', error);
        throw error;
      }
    }
  }

  // Generate enums
  prismaModels += generateEnums(enumsMap);
  
  // Generate models (using all collected schemas)
  prismaModels += generateModels(allSchemasToGenerate, schemaToModelNameMap, options, inverseRelations); // Pass inverseRelations

  // Second pass: Add inverse relations to models
  prismaModels = addInverseRelationsToModels(prismaModels, inverseRelations);

  logger.info('Prisma schema generation completed');
  return prismaModels;
}

// Helper function to add inverse relations
function addInverseRelationsToModels(currentModelsStr: string, inverseRelations: any[]): string {
  let updatedModelsStr = currentModelsStr;
  for (const rel of inverseRelations) {
    const modelRegex = new RegExp(`(model\\s+${rel.fromModel}\\s+\\{[^}]*)`, 's');
    updatedModelsStr = updatedModelsStr.replace(modelRegex, (match, modelContent) => {
      const fieldType = rel.toModel;
      const optionality = rel.isOptional ? '?' : '';
      const listIndicator = rel.isList ? '[]' : '';
      const relationAttribute = `@relation("${rel.relationName}"`;
      
      // Check if the field already exists to avoid duplicates
      if (modelContent.includes(`  ${rel.fieldName} ${fieldType}${listIndicator}`)) {
        return match; // Field already exists, do nothing
      }

      // For one-to-many inverse, the foreign key is on the 'fromModel' side, so no fields/references here
      // For one-to-one inverse, the foreign key is on the 'fromModel' side, so no fields/references here
      // The relation name is crucial for Prisma to link them.
      const inverseFieldLine = `  ${rel.fieldName} ${fieldType}${listIndicator} ${relationAttribute})\n`;
      return `${modelContent}\n${inverseFieldLine}`;
    });
  }
  return updatedModelsStr;
}

function collectNestedModelsAndEnums(
  schema: z.ZodSchema<DeserializedJson>,
  parentModelName: string,
  allSchemasToGenerate: Map<string, z.ZodSchema<DeserializedJson>>,
  schemaToModelNameMap: Map<z.ZodSchema<DeserializedJson>, string>,
  enumsMap: Map<string, z.ZodEnum<[string, ...string[]]>>,
  visited: Set<z.ZodSchema<DeserializedJson>>,
): void {
  if (visited.has(schema)) {
    return;
  }
  visited.add(schema);

  const unwrappedSchema = unwrapType(schema as z.ZodTypeAny); // Cast to ZodTypeAny

  if (unwrappedSchema instanceof z.ZodObject) {
    for (const [key, field] of Object.entries(unwrappedSchema.shape)) {
      const unwrappedField = unwrapType(field as z.ZodTypeAny); // Cast to ZodTypeAny

      if (unwrappedField instanceof z.ZodEnum) {
        const enumName = getEnumName(unwrappedField, key, parentModelName);
        enumsMap.set(enumName, unwrappedField);
      } else if (unwrappedField instanceof z.ZodObject) {
        // If this ZodObject is not already a top-level model, create a new model for it
        if (!schemaToModelNameMap.has(unwrappedField)) {
          const nestedModelName = `${parentModelName}${capitalizeFirstLetter(key)}`;
          allSchemasToGenerate.set(nestedModelName, unwrappedField);
          schemaToModelNameMap.set(unwrappedField, nestedModelName);
          logger.debug(`Discovered nested model: ${nestedModelName}`);
        }
        // Recursively collect from the nested object
        collectNestedModelsAndEnums(unwrappedField, `${parentModelName}${capitalizeFirstLetter(key)}`, allSchemasToGenerate, schemaToModelNameMap, enumsMap, visited);
      } else if (unwrappedField instanceof z.ZodArray && unwrappedField.element instanceof z.ZodObject) {
        // If it's an array of objects, treat the element as a nested model
        if (!schemaToModelNameMap.has(unwrappedField.element)) {
          const nestedModelName = `${parentModelName}${capitalizeFirstLetter(key)}Item`; // Suffix for array items
          allSchemasToGenerate.set(nestedModelName, unwrappedField.element);
          schemaToModelNameMap.set(unwrappedField.element, nestedModelName);
          logger.debug(`Discovered nested array model: ${nestedModelName}`);
        }
        // Recursively collect from the array element
        collectNestedModelsAndEnums(unwrappedField.element, `${parentModelName}${capitalizeFirstLetter(key)}Item`, allSchemasToGenerate, schemaToModelNameMap, enumsMap, visited);
      } else if (
        unwrappedField instanceof z.ZodArray ||
        unwrappedField instanceof z.ZodOptional ||
        unwrappedField instanceof z.ZodNullable ||
        unwrappedField instanceof z.ZodLazy ||
        unwrappedField instanceof z.ZodUnion || // Also check unions for nested types
        unwrappedField instanceof z.ZodRecord // Also check records for nested types
      ) {
        // Recursively collect from complex types that might contain nested objects/enums
        collectNestedModelsAndEnums(unwrappedField, parentModelName, allSchemasToGenerate, schemaToModelNameMap, enumsMap, visited);
      }
    }
  } else if (unwrappedSchema instanceof z.ZodArray) {
    collectNestedModelsAndEnums(unwrappedSchema.element, parentModelName, allSchemasToGenerate, schemaToModelNameMap, enumsMap, visited);
  } else if (unwrappedSchema instanceof z.ZodUnion) {
    unwrappedSchema.options.forEach((opt: z.ZodTypeAny) => collectNestedModelsAndEnums(opt, parentModelName, allSchemasToGenerate, schemaToModelNameMap, enumsMap, visited)); // Explicitly type opt
  } else if (unwrappedSchema instanceof z.ZodRecord) {
    collectNestedModelsAndEnums(unwrappedSchema.valueSchema, parentModelName, allSchemasToGenerate, schemaToModelNameMap, enumsMap, visited); // Use valueSchema
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
  inverseRelations: { // Add inverseRelations parameter
    fromModel: string;
    toModel: string;
    fieldName: string;
    relationName: string;
    isList: boolean;
    isOptional: boolean;
  }[],
): string {
  let modelsStr = '';

  for (const [modelName, schema] of schemaMap.entries()) {
    logger.debug(`Generating model: ${modelName}`);
    modelsStr += `\nmodel ${modelName} {\n`;

    const shape = schema instanceof z.ZodObject ? schema.shape : {};
    const visitedFields = new Set<SerializableJson>();
    let hasIdField = false; // Track if the model already has an ID field

    for (const [key, zodType] of Object.entries(shape)) {
      try {
        const { prismaType, attributes } = mapZodFieldToPrisma(
          zodType as SerializableJson,
          key,
          modelName, // Pass parentModelName
          (s: SerializableJson) => {
            const name = schemaToModelNameMap.get(s);
            if (!name) {
              throw new Error(`Schema for nested object not found in map for field '${key}' in model '${modelName}'.`);
            }
            return name as PrismaType;
          },
          visitedFields,
        );

        // Check if this field is an ID field
        if (attributes.includes('@id')) {
          hasIdField = true;
        }

        // Determine if this is a relation field that needs a separate ID field
        const unwrappedZodType = unwrapType(zodType as z.ZodTypeAny);
        const isRelation = unwrappedZodType instanceof z.ZodObject && schemaToModelNameMap.has(unwrappedZodType);
        const isListRelation = zodType instanceof z.ZodArray && unwrappedZodType instanceof z.ZodObject;

        // Store relation info for a second pass to generate inverse relations
        if (isRelation) {
          const relatedModelName = schemaToModelNameMap.get(unwrappedZodType);
          if (relatedModelName && relatedModelName !== modelName) {
            const relationName = `${modelName}To${relatedModelName}`; // Explicit relation name
            
            if (isListRelation) {
              // One-to-many relation: Parent has list of Children. Child needs a field back to Parent.
              // Add the relation field to the current model
              modelsStr += `  ${handleReservedKeyword(key)} ${relatedModelName}[] @relation("${relationName}")\n`;
              // Store inverse relation info
              inverseRelations.push({
                fromModel: relatedModelName,
                toModel: modelName,
                fieldName: handleReservedKeyword(modelName.toLowerCase()), // Default inverse field name
                relationName: relationName,
                isList: false, // Inverse is a single item
                isOptional: true, // Make inverse optional by default for one-to-many
              });
            } else {
              // One-to-one relation: Parent has one Child. Child needs a field back to Parent.
              const relationFieldName = `${handleReservedKeyword(key)}Id`;
              const isOptionalRelation = zodType instanceof z.ZodOptional || zodType instanceof z.ZodNullable;
              const optionality = isOptionalRelation ? '?' : '';
              const uniqueAttribute = isOptionalRelation ? '' : ' @unique'; // Add @unique for required one-to-one relations

              // Add the foreign key field with @unique for one-to-one relations
              modelsStr += `  ${relationFieldName} String${optionality}${uniqueAttribute}\n`; // Assuming ID is String
              // Add the relation field, also optional if the foreign key is optional
              modelsStr += `  ${handleReservedKeyword(key)} ${relatedModelName}${optionality} @relation("${relationName}", fields: [${relationFieldName}], references: [id])\n`;
              
              // Store inverse relation info
              inverseRelations.push({
                fromModel: relatedModelName,
                toModel: modelName,
                fieldName: handleReservedKeyword(modelName.toLowerCase()), // Default inverse field name
                relationName: relationName,
                isList: false,
                isOptional: true, // Make inverse optional by default for one-to-one
                // For inverse relations, we need to know the foreign key and reference fields
                // This is complex as it depends on the other side's ID.
                // For now, we'll rely on Prisma's inference for inverse fields,
                // but if it fails, we'll need to add explicit fields/references here.
              });
            }
          } else {
            // Self-relation or unhandled relation, just generate the field line
            const fieldLine = `  ${handleReservedKeyword(key)} ${prismaType} ${attributes.join(' ')}`.trim();
            modelsStr += `${fieldLine}\n`;
          }
        } else {
          // For all other fields (scalars, enums, Json, etc.), generate the field line directly
          const fieldLine = `  ${handleReservedKeyword(key)} ${prismaType} ${attributes.join(' ')}`.trim();
          modelsStr += `${fieldLine}\n`;
        }
      } catch (error) {
        logger.error(
          `Failed to generate field '${key}' for model '${modelName}'`,
          error,
        );
        throw error;
      }
    }

    // Ensure every model has an @id field
    if (!hasIdField) {
      modelsStr += `  id String @id @default(uuid())\n`; // Add a default ID field if none exists
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
