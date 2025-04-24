import { z } from 'zod';
import { validateFieldName, validateSchema, validateRelations } from '../utils/validation';
import { SchemaValidationError, SchemaMap } from '../types/prisma';

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
        status: z.enum(['active', 'inactive']),
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

      const postSchema = z.object({
        id: z.string(),
        title: z.string(),
        author: z.object({
          id: z.string(),
          name: z.string(),
        }).describe(JSON.stringify({ relation: 'User' })),
      });

      const schemaMap = new Map<string, z.ZodSchema<any>>([
        ['User', userSchema],
        ['Post', postSchema],
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

      const postSchema = z.object({
        id: z.string(),
        title: z.string(),
        author: z.object({
          id: z.string(),
          name: z.string(),
        }).describe(JSON.stringify({ relation: 'User' })),
      });

      const schemaMap = new Map<string, z.ZodSchema<any>>([
        ['User', userSchema],
        ['Post', postSchema],
      ]);

      expect(() => {
        try {
          validateRelations(userSchema, schemaMap, 'User');
        } catch (error) {
          if (error instanceof SchemaValidationError) {
            throw error;
          }
          throw new Error('Expected SchemaValidationError');
        }
      }).toThrow(SchemaValidationError);
    });
  });
}); 