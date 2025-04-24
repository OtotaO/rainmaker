import { z } from 'zod';
import type { 
  AllowedZodTypeNames, 
  DeserializedJson, 
  PrismaFieldMetadata, 
  PrismaType, 
  SerializableJson, 
  ValueOf 
} from '../../types/prisma';
import { capitalizeFirstLetter, getPrismaFieldMetadata } from '../../utils/utils';

const zodToPrismaTypeMap = {
  ZodString: 'String',
  ZodNumber: 'Int',
  ZodBoolean: 'Boolean',
  ZodDate: 'DateTime',
  ZodEnum: 'Enum',
} as const;

export function mapZodFieldToPrisma(
  field: SerializableJson,
  fieldName: string,
  getModelFieldFromSchema: (schema: SerializableJson) => PrismaType,
  visited: Set<SerializableJson>,
): { prismaType: string; attributes: string[] } {
  if (visited.has(field)) {
    return { prismaType: getModelFieldFromSchema(field), attributes: [] };
  }
  visited.add(field);

  let prismaType = '';
  const attributes: string[] = [];
  const meta: PrismaFieldMetadata = getPrismaFieldMetadata(field) || {};

  if (field instanceof z.ZodLazy) {
    const unwrapped = field.schema;
    return mapZodFieldToPrisma(
      unwrapped,
      fieldName,
      getModelFieldFromSchema,
      visited,
    );
  }

  if (field instanceof z.ZodOptional || field instanceof z.ZodNullable) {
    const result = mapZodFieldToPrisma(
      field.unwrap(),
      fieldName,
      getModelFieldFromSchema,
      visited,
    );
    result.prismaType += '?';
    return result;
  }

  if (field instanceof z.ZodArray) {
    const elementType = mapZodFieldToPrisma(
      field.element,
      fieldName,
      getModelFieldFromSchema,
      visited,
    );
    prismaType = `${elementType.prismaType}[]`;
    if (meta.relation) {
      attributes.push(`@relation("${meta.relation}")`);
    }
  } else if (field instanceof z.ZodObject) {
    prismaType = getModelFieldFromSchema(field);
    if (meta.relation) {
      attributes.push(`@relation("${meta.relation}")`);
    }
  } else if (field instanceof z.ZodEnum) {
    prismaType = getEnumName(field, fieldName, field);
  } else if (
    field instanceof z.ZodString ||
    field instanceof z.ZodNumber ||
    field instanceof z.ZodBoolean ||
    field instanceof z.ZodDate
  ) {
    const zodTypeName = field.constructor.name as AllowedZodTypeNames;
    prismaType = zodToPrismaTypeMap[zodTypeName];

    // Add @id attribute for id fields
    if (fieldName === 'id') {
      attributes.push('@id');
    }

    // Add @unique attribute for email fields
    if (field instanceof z.ZodString && field._def.checks?.some(check => check.kind === 'email')) {
      attributes.push('@unique');
    }
  } else {
    throw new Error(
      `Unsupported Zod type '${field?.constructor?.name}' for field '${fieldName}'.`,
    );
  }

  if (meta.unique) {
    attributes.push('@unique');
  }
  if (meta.default) {
    const defaultValue = formatDefaultValue(meta.default, prismaType);
    attributes.push(`@default(${defaultValue})`);
  }
  if (meta.id) {
    attributes.push(`@id @default(dbgenerated("gen_random_uuid()")) @db.Uuid`);
  }
  if (meta.updatedAt) {
    attributes.push('@updatedAt');
  }
  if (meta.index) {
    attributes.push('@index');
  }

  return { prismaType, attributes };
}

function formatDefaultValue(value: string, prismaType: string): string {
  if (value.endsWith('()')) {
    return value;
  } else if (prismaType === 'String' || prismaType === 'DateTime') {
    return `"${value}"`;
  } else {
    return value;
  }
}

export function getEnumName(
  field: z.ZodEnum<[string, ...string[]]>,
  fieldName: string,
  schema: z.ZodSchema<DeserializedJson>,
): string {
  const modelName = schema._def.toString() || 'Anonymous';
  return `${capitalizeFirstLetter(modelName)}${capitalizeFirstLetter(fieldName)}Enum`;
} 