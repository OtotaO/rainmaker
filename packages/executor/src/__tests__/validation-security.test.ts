import { describe, expect, test as it } from 'bun:test';
import { validateAgainstSchema } from '../validation';

describe('JSON Schema Validation Security', () => {
  describe('no silent degradation to unknown', () => {
    it('throws error for unsupported schema instead of accepting any data', async () => {
      const unsupportedSchema = {
        // No type field, no recognized patterns
        title: 'Some schema',
        description: 'This should fail',
      };

      // Should throw, not silently accept
      const result = await validateAgainstSchema({ anything: 'goes' }, unsupportedSchema);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Unsupported JSON Schema configuration');
    });

    it('throws error for unsupported format instead of ignoring', async () => {
      const schemaWithUnsupportedFormat = {
        type: 'string',
        format: 'credit-card', // Not supported
      };

      const result = await validateAgainstSchema('4111111111111111', schemaWithUnsupportedFormat);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("Unsupported string format 'credit-card'");
    });

    it('properly validates supported formats', async () => {
      // Email validation
      const emailSchema = { type: 'string', format: 'email' };
      
      const validEmail = await validateAgainstSchema('test@example.com', emailSchema);
      expect(validEmail.valid).toBe(true);
      
      const invalidEmail = await validateAgainstSchema('not-an-email', emailSchema);
      expect(invalidEmail.valid).toBe(false);

      // UUID validation
      const uuidSchema = { type: 'string', format: 'uuid' };
      
      const validUuid = await validateAgainstSchema('550e8400-e29b-41d4-a716-446655440000', uuidSchema);
      expect(validUuid.valid).toBe(true);
      
      const invalidUuid = await validateAgainstSchema('not-a-uuid', uuidSchema);
      expect(invalidUuid.valid).toBe(false);

      // Date validation
      const dateSchema = { type: 'string', format: 'date' };
      
      const validDate = await validateAgainstSchema('2023-12-25', dateSchema);
      expect(validDate.valid).toBe(true);
      
      const invalidDate = await validateAgainstSchema('2023-13-45', dateSchema);
      expect(invalidDate.valid).toBe(false);
    });
  });

  describe('const and enum support', () => {
    it('validates const values correctly', async () => {
      const constSchema = { const: 'exact-value' };
      
      const valid = await validateAgainstSchema('exact-value', constSchema);
      expect(valid.valid).toBe(true);
      
      const invalid = await validateAgainstSchema('different-value', constSchema);
      expect(invalid.valid).toBe(false);
    });

    it('validates enum values correctly', async () => {
      const enumSchema = { enum: ['red', 'green', 'blue'] };
      
      const valid = await validateAgainstSchema('green', enumSchema);
      expect(valid.valid).toBe(true);
      
      const invalid = await validateAgainstSchema('yellow', enumSchema);
      expect(invalid.valid).toBe(false);
    });

    it('handles numeric const/enum values', async () => {
      const numericEnumSchema = { enum: [1, 2, 3] };
      
      const valid = await validateAgainstSchema(2, numericEnumSchema);
      expect(valid.valid).toBe(true);
      
      const invalid = await validateAgainstSchema(4, numericEnumSchema);
      expect(invalid.valid).toBe(false);
    });
  });

  describe('security validation scenarios', () => {
    it('prevents type confusion attacks', async () => {
      const schema = {
        type: 'object',
        properties: {
          isAdmin: { type: 'boolean' },
          role: { type: 'string', enum: ['user', 'moderator'] },
        },
        required: ['isAdmin', 'role'],
      };

      // Attempt to pass string "true" instead of boolean
      const attack1 = await validateAgainstSchema(
        { isAdmin: 'true', role: 'user' },
        schema
      );
      expect(attack1.valid).toBe(false);
      expect(attack1.errors[0]).toContain('isAdmin');

      // Attempt to pass invalid role
      const attack2 = await validateAgainstSchema(
        { isAdmin: false, role: 'admin' }, // 'admin' not in enum
        schema
      );
      expect(attack2.valid).toBe(false);
    });

    it('enforces string constraints to prevent injection', async () => {
      const schema = {
        type: 'string',
        maxLength: 50,
        pattern: '^[a-zA-Z0-9_]+$', // Alphanumeric only
      };

      // Valid input
      const valid = await validateAgainstSchema('valid_username123', schema);
      expect(valid.valid).toBe(true);

      // SQL injection attempt
      const sqlInjection = await validateAgainstSchema(
        "admin'; DROP TABLE users; --",
        schema
      );
      expect(sqlInjection.valid).toBe(false);

      // Length limit bypass attempt
      const lengthBypass = await validateAgainstSchema(
        'a'.repeat(100),
        schema
      );
      expect(lengthBypass.valid).toBe(false);
    });

    it('validates nested objects properly', async () => {
      const schema = {
        type: 'object',
        properties: {
          user: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              email: { type: 'string', format: 'email' },
              age: { type: 'integer', minimum: 0, maximum: 150 },
            },
            required: ['id', 'email'],
          },
        },
        required: ['user'],
      };

      const validData = {
        user: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          email: 'test@example.com',
          age: 25,
        },
      };

      const valid = await validateAgainstSchema(validData, schema);
      expect(valid.valid).toBe(true);

      // Invalid nested data
      const invalidData = {
        user: {
          id: 'not-a-uuid',
          email: 'not-an-email',
          age: -5,
        },
      };

      const invalid = await validateAgainstSchema(invalidData, schema);
      expect(invalid.valid).toBe(false);
      expect(invalid.errors.length).toBeGreaterThan(0);
      // Should report all validation errors
      expect(invalid.errors.some(e => e.includes('id'))).toBe(true);
      expect(invalid.errors.some(e => e.includes('email'))).toBe(true);
      expect(invalid.errors.some(e => e.includes('age'))).toBe(true);
    });
  });

  describe('anyOf/oneOf/allOf support', () => {
    it('validates anyOf correctly', async () => {
      const schema = {
        anyOf: [
          { type: 'string' },
          { type: 'number' },
        ],
      };

      const validString = await validateAgainstSchema('hello', schema);
      expect(validString.valid).toBe(true);

      const validNumber = await validateAgainstSchema(42, schema);
      expect(validNumber.valid).toBe(true);

      const invalid = await validateAgainstSchema(true, schema);
      expect(invalid.valid).toBe(false);
    });

    it('validates union types correctly', async () => {
      const schema = {
        type: ['string', 'null'],
      };

      const validString = await validateAgainstSchema('hello', schema);
      expect(validString.valid).toBe(true);

      const validNull = await validateAgainstSchema(null, schema);
      expect(validNull.valid).toBe(true);

      const invalid = await validateAgainstSchema(123, schema);
      expect(invalid.valid).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('handles empty schemas appropriately', async () => {
      const emptySchema = {};
      
      // Empty schema should fail with clear error
      const result = await validateAgainstSchema({ any: 'data' }, emptySchema);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Unsupported JSON Schema');
    });

    it('validates complex patterns correctly', async () => {
      const schema = {
        type: 'string',
        pattern: '^(?=.*[A-Z])(?=.*[a-z])(?=.*\\d).{8,}$', // Strong password
      };

      const strongPassword = await validateAgainstSchema('Pass123!', schema);
      expect(strongPassword.valid).toBe(true);

      const weakPassword = await validateAgainstSchema('password', schema);
      expect(weakPassword.valid).toBe(false);
    });

    it('handles array validation with items constraint', async () => {
      const schema = {
        type: 'array',
        items: { type: 'string', format: 'email' },
        minItems: 1,
        maxItems: 5,
      };

      const valid = await validateAgainstSchema(
        ['user1@example.com', 'user2@example.com'],
        schema
      );
      expect(valid.valid).toBe(true);

      const invalidItem = await validateAgainstSchema(
        ['user1@example.com', 'not-an-email'],
        schema
      );
      expect(invalidItem.valid).toBe(false);

      const tooMany = await validateAgainstSchema(
        Array(10).fill('user@example.com'),
        schema
      );
      expect(tooMany.valid).toBe(false);
    });
  });
});