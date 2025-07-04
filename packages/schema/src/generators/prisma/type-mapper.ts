import { z } from '../../zod-base';
import type { 
  AllowedZodTypeNames, 
  DeserializedJson, 
  PrismaFieldMetadata, 
  PrismaType, 
  SerializableJson
} from '../../types/prisma';
import { capitalizeFirstLetter, getPrismaFieldMetadata, unwrapType } from '../../utils/utils'; // Import unwrapType

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
  parentModelName: string, // Add parentModelName
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

  // Handle ZodLazy by unwrapping
  if (field instanceof z.ZodLazy) {
    const unwrapped = field.schema;
    return mapZodFieldToPrisma(
      unwrapped,
      fieldName,
      parentModelName, // Pass parentModelName
      getModelFieldFromSchema,
      visited,
    );
  }

  // Handle ZodOptional and ZodNullable by unwrapping and adding '?'
  if (field instanceof z.ZodOptional || field instanceof z.ZodNullable) {
    const unwrappedField = field.unwrap();
    const result = mapZodFieldToPrisma(
      unwrappedField,
      fieldName,
      parentModelName, // Pass parentModelName
      getModelFieldFromSchema,
      visited,
    );
    // Only add '?' if the unwrapped type is not an array, as Prisma does not support optional lists.
    // Optionality for lists is handled by the relation itself or by the absence of entries.
    if (!(unwrappedField instanceof z.ZodArray)) {
      result.prismaType += '?';
    }
    return result;
  }

  // Handle ZodArray
  if (field instanceof z.ZodArray) {
    const elementType = mapZodFieldToPrisma(
      field.element,
      fieldName,
      parentModelName, // Pass parentModelName
      getModelFieldFromSchema,
      visited,
    );
    prismaType = `${elementType.prismaType}[]`;
    // If the element is a ZodObject, it implies a relation, so add a relation attribute
    if (field.element instanceof z.ZodObject) {
      // Prisma requires an explicit relation field for list relations
      // This will be handled in generateModels by adding a separate ID field and @relation
      // For now, just ensure the type is correct.
    }
  } 
  // Handle ZodObject (nested models or relations)
  else if (field instanceof z.ZodObject) {
    prismaType = getModelFieldFromSchema(field); // This should return the model name
    // If it's a relation, add the relation attribute
    if (meta.relation) {
      attributes.push(`@relation("${meta.relation}")`);
    }
  } 
  // Handle ZodEnum
  else if (field instanceof z.ZodEnum) {
    prismaType = getEnumName(field, fieldName, parentModelName); // Pass parentModelName
  } 
  // Handle ZodLiteral
  else if (field instanceof z.ZodLiteral) {
    prismaType = 'String'; // Literals are typically strings in Prisma
    // Optionally, add a @default attribute if the literal value is simple
    if (typeof field.value === 'string' || typeof field.value === 'number' || typeof field.value === 'boolean') {
      attributes.push(`@default("${field.value}")`);
    }
  }
  // Handle ZodDiscriminatedUnion
  else if (field instanceof z.ZodDiscriminatedUnion) {
    // Discriminated unions are complex and should be mapped to Json in Prisma.
    prismaType = 'Json';
    attributes.push('@db.Json');
  }
  // Handle ZodUnion
  else if (field instanceof z.ZodUnion) {
    // If any option in the union is a complex type (object, array, record, or another union/lazy that resolves to complex),
    // or if it's a union of mixed types (e.g., string | object), map to Json.
    // This is a pragmatic approach for JSON-serializable unions.
    const isComplexUnion = field.options.some((opt: z.ZodTypeAny) => {
      const unwrappedOpt = unwrapType(opt);
      return (
        unwrappedOpt instanceof z.ZodObject ||
        unwrappedOpt instanceof z.ZodArray ||
        unwrappedOpt instanceof z.ZodRecord ||
        unwrappedOpt instanceof z.ZodUnion || // Nested unions are also complex
        unwrappedOpt instanceof z.ZodDiscriminatedUnion // Discriminated unions are also complex
      );
    });

    if (isComplexUnion) {
      prismaType = 'Json';
      attributes.push('@db.Json');
    } else if (field.options.every((opt: z.ZodTypeAny) => opt instanceof z.ZodLiteral)) {
      // If it's a union of only literals, map to String in Prisma.
      // The validation of specific literal values will happen at the application layer via Zod.
      prismaType = 'String';
    } else {
      // For other unsupported unions (e.g., string | number, or mixed complex/primitive not covered by Json heuristic)
      throw new Error(
        `Unsupported ZodUnion type for field '${fieldName}'. Only unions of literals (mapped to String) or complex unions (mapped to Json) are supported.`,
      );
    }
  }
  // Handle primitive Zod types
  else if (
    field instanceof z.ZodString ||
    field instanceof z.ZodNumber ||
    field instanceof z.ZodBoolean ||
    field instanceof z.ZodDate ||
    field instanceof z.ZodNull // Explicitly handle ZodNull
  ) {
    const zodTypeName = field.constructor.name as AllowedZodTypeNames;
    prismaType = zodToPrismaTypeMap[zodTypeName];

    // Special handling for datetime strings - they should map to DateTime in Prisma
    if (field instanceof z.ZodString && field._def.checks?.some((check: any) => check.kind === 'datetime')) {
      prismaType = 'DateTime';
    }
    // Special handling for UUID strings
    if (field instanceof z.ZodString && field._def.checks?.some((check: any) => check.kind === 'uuid')) {
      attributes.push('@db.Uuid');
    }

    // Add @id attribute for id fields
    if (fieldName === 'id') {
      attributes.push('@id');
    }

    // Add @unique attribute for email fields
    if (field instanceof z.ZodString && field._def.checks?.some((check: any) => check.kind === 'email')) {
      attributes.push('@unique');
    }
  } 
  // Handle ZodRecord (map to Json)
  else if (field instanceof z.ZodRecord) {
    prismaType = 'Json';
    attributes.push('@db.Json');
  }
  // Fallback for unsupported types
  else {
    throw new Error(
      `Unsupported Zod type '${field?.constructor?.name}' for field '${fieldName}'.`,
    );
  }

  // Add common attributes
  if (meta.unique) {
    attributes.push('@unique');
  }
  if (meta.default) {
    const defaultValue = formatDefaultValue(meta.default, prismaType);
    attributes.push(`@default(${defaultValue})`);
  }
  // Handle @id attribute for fields other than 'id' if explicitly marked
  if (meta.id && fieldName !== 'id') {
    attributes.push(`@id`);
    // If it's a UUID string, add @db.Uuid
    if (prismaType === 'String' && field instanceof z.ZodString && field._def.checks?.some((check: any) => check.kind === 'uuid')) {
      attributes.push('@db.Uuid');
    } else if (prismaType === 'Int') {
      attributes.push('@default(autoincrement())');
    }
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
  } else if (prismaType === 'String' || prismaType === 'DateTime' || prismaType === 'Json') {
    return `"${value}"`;
  } else {
    return value;
  }
}

export function getEnumName(
  enumSchema: z.ZodEnum<[string, ...string[]]>,
  fieldName: string,
  parentModelName: string, // Add parentModelName for better uniqueness
): string {
  // Use a more stable name for enums by combining parent model name and field name
  // This ensures uniqueness across different models that might have fields with the same name.
  return `${capitalizeFirstLetter(parentModelName)}${capitalizeFirstLetter(fieldName)}Enum`;
}

// Simple hash function for generating unique enum names
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
}
