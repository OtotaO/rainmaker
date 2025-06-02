import { z } from 'zod';
import { validateFieldName, validateSchema, validateRelations } from '../utils/validation';
import { SchemaValidationError } from '../types/prisma';
import { StatusSchema } from '../../packages/schema/src/types/enums';

describe('Validation Utilities', () => {
  describe('validateFieldName', () => {
    it('should accept valid field names', () => {
      expect(() => validateFieldName('validName')).not.toThrow();
      expect(() => validateFieldName('valid_name')).not.toThrow();
      expect(() => validateFieldName('validName123')).not.toThrow();
    });

    it('should reject reserved words', () => {
      expect(() => validateFieldName('select')).toThrow(SchemaValidationError);
      expect(() => validateFieldName('where')).toThrow(SchemaValidationError);
      expect(() => validateFieldName('model')).toThrow(SchemaValidationError);
    });

    it('should reject invalid field names', () => {
      expect(() => validateFieldName('123invalid')).toThrow(SchemaValidationError);
      expect(() => validateFieldName('invalid-name')).toThrow(SchemaValidationError);
      expect(() => validateFieldName('invalid name')).toThrow(SchemaValidationError);
    });
  });

  describe('validateSchema', () => {
    it('should accept valid schemas', () => {
      const validSchema = z.object({
        name: z.string(),
        age: z.number(),
        isActive: z.boolean(),
        createdAt: z.date(),
        status: StatusSchema,
      });

      expect(() => validateSchema(validSchema)).not.toThrow();
    });

    it('should reject non-ZodObject schemas', () => {
      const invalidSchema = z.string();
      expect(() => validateSchema(invalidSchema)).toThrow(SchemaValidationError);
    });

    it('should reject schemas with invalid field names', () => {
      const invalidSchema = z.object({
        select: z.string(), // reserved word
        'invalid-name': z.string(), // invalid format
      });

      expect(() => validateSchema(invalidSchema)).toThrow(SchemaValidationError);
    });
  });

  describe('validateRelations', () => {
    it('should validate correct relations', () => {
      const userSchema = z.object({
        id: z.string(),
        posts: z.array(z.object({
          id: z.string(),
          title: z.string(),
        }).describe(JSON.stringify({ relation: 'Post' }))),
      });

      const schemaMap = new Map([
        ['User', userSchema],
        ['Post', z.object({ id: z.string(), title: z.string() })],
      ]);

      expect(() => validateRelations(userSchema, schemaMap, 'User')).not.toThrow();
    });

    it('should reject invalid relations', () => {
      const userSchema = z.object({
        id: z.string(),
        posts: z.array(z.object({
          id: z.string(),
          title: z.string(),
        }).describe(JSON.stringify({ relation: 'NonExistentModel' }))),
      });

      const schemaMap = new Map([
        ['User', userSchema],
      ]);

      expect(() => validateRelations(userSchema, schemaMap, 'User')).toThrow(SchemaValidationError);
    });
  });
}); 