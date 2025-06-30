import { describe, expect, it } from 'bun:test';
// Import our constrained version directly to avoid circular dependency
import { z, assertJsonSerializable, makeJsonSafe } from '../zod';

describe('JSON-Safe Zod', () => {
  describe('Allowed Types', () => {
    it('should allow string schemas', () => {
      const schema = z.string();
      const result = schema.parse('hello');
      expect(result).toBe('hello');
      
      // Verify JSON serializable
      expect(() => JSON.stringify(result)).not.toThrow();
    });

    it('should allow number schemas', () => {
      const schema = z.number();
      const result = schema.parse(42);
      expect(result).toBe(42);
      expect(() => JSON.stringify(result)).not.toThrow();
    });

    it('should allow boolean schemas', () => {
      const schema = z.boolean();
      const result = schema.parse(true);
      expect(result).toBe(true);
      expect(() => JSON.stringify(result)).not.toThrow();
    });

    it('should allow null schemas', () => {
      const schema = z.null();
      const result = schema.parse(null);
      expect(result).toBe(null);
      expect(() => JSON.stringify(result)).not.toThrow();
    });

    it('should allow literal schemas', () => {
      const stringLiteral = z.literal('active');
      expect(stringLiteral.parse('active')).toBe('active');
      
      const numberLiteral = z.literal(42);
      expect(numberLiteral.parse(42)).toBe(42);
      
      const booleanLiteral = z.literal(true);
      expect(booleanLiteral.parse(true)).toBe(true);
    });

    it('should allow object schemas', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
        isActive: z.boolean()
      });
      
      const result = schema.parse({
        name: 'John',
        age: 30,
        isActive: true
      });
      
      expect(result.name).toBe('John');
      expect(() => JSON.stringify(result)).not.toThrow();
    });

    it('should allow array schemas', () => {
      const schema = z.array(z.string());
      const result = schema.parse(['a', 'b', 'c']);
      expect(result).toEqual(['a', 'b', 'c']);
      expect(() => JSON.stringify(result)).not.toThrow();
    });

    it('should allow record schemas', () => {
      const schema = z.record(z.string(), z.number());
      const result = schema.parse({ a: 1, b: 2 });
      expect(result).toEqual({ a: 1, b: 2 });
      expect(() => JSON.stringify(result)).not.toThrow();
    });

    it('should allow union schemas', () => {
      const schema = z.union([z.string(), z.number()]);
      expect(schema.parse('hello')).toBe('hello');
      expect(schema.parse(42)).toBe(42);
    });

    it('should allow discriminated union schemas', () => {
      const schema = z.discriminatedUnion('type', [
        z.object({ type: z.literal('text'), content: z.string() }),
        z.object({ type: z.literal('number'), value: z.number() })
      ]);
      
      const textResult = schema.parse({ type: 'text', content: 'hello' });
      expect(textResult.type).toBe('text');
      expect(() => JSON.stringify(textResult)).not.toThrow();
    });

    it('should allow optional schemas', () => {
      const schema = z.optional(z.string());
      expect(schema.parse(undefined)).toBeUndefined();
      expect(schema.parse('hello')).toBe('hello');
    });

    it('should allow nullable schemas', () => {
      const schema = z.nullable(z.string());
      expect(schema.parse(null)).toBeNull();
      expect(schema.parse('hello')).toBe('hello');
    });

    it('should allow complex nested schemas', () => {
      const schema = z.object({
        id: z.string(),
        profile: z.object({
          name: z.string(),
          age: z.number(),
          tags: z.array(z.string()),
          settings: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
        }),
        status: z.union([z.literal('active'), z.literal('inactive')]),
        deletedAt: z.nullable(z.string())
      });

      const result = schema.parse({
        id: '123',
        profile: {
          name: 'John',
          age: 30,
          tags: ['dev', 'test'],
          settings: { theme: 'dark', fontSize: 14, notifications: true }
        },
        status: 'active',
        deletedAt: null
      });

      expect(() => JSON.stringify(result)).not.toThrow();
      const serialized = JSON.stringify(result);
      const deserialized = JSON.parse(serialized);
      expect(schema.parse(deserialized)).toEqual(result);
    });
  });

  describe('Type Inference', () => {
    it('should correctly infer types', () => {
      const UserSchema = z.object({
        id: z.string(),
        name: z.string(),
        age: z.number()
      });

      type User = z.infer<typeof UserSchema>;
      
      // This is a compile-time test - if it compiles, it works
      const user: User = {
        id: '123',
        name: 'John',
        age: 30
      };

      expect(user.id).toBe('123');
    });
  });

  describe('Forbidden Types', () => {
    it('should throw runtime error for date()', () => {
      expect(() => {
        // @ts-expect-error - Testing forbidden method
        z.date();
      }).toThrow('JSON-serializable schemas only. Use z.string() with ISO date format instead of z.date()');
    });

    it('should throw runtime error for bigint()', () => {
      expect(() => {
        // @ts-expect-error - Testing forbidden method
        z.bigint();
      }).toThrow('JSON-serializable schemas only. Use z.number() or z.string() instead of z.bigint()');
    });

    it('should throw runtime error for symbol()', () => {
      expect(() => {
        // @ts-expect-error - Testing forbidden method
        z.symbol();
      }).toThrow('JSON-serializable schemas only. Symbols are not JSON-serializable');
    });

    it('should throw runtime error for any()', () => {
      expect(() => {
        // @ts-expect-error - Testing forbidden method
        z.any();
      }).toThrow('JSON-serializable schemas only. Define explicit schema instead of z.any()');
    });

    it('should throw runtime error for unknown()', () => {
      expect(() => {
        // @ts-expect-error - Testing forbidden method
        z.unknown();
      }).toThrow('JSON-serializable schemas only. Define explicit schema instead of z.unknown()');
    });

    it('should throw runtime error for transform()', () => {
      expect(() => {
        // @ts-expect-error - Testing forbidden method
        z.transform();
      }).toThrow('JSON-serializable schemas only. Transforms are not allowed - handle transformations outside the schema');
    });

    it('should throw runtime error for lazy()', () => {
      expect(() => {
        // @ts-expect-error - Testing forbidden method
        z.lazy();
      }).toThrow('JSON-serializable schemas only. Use explicit recursive types instead of z.lazy()');
    });

    it('should throw runtime error for map()', () => {
      expect(() => {
        // @ts-expect-error - Testing forbidden method
        z.map();
      }).toThrow('JSON-serializable schemas only. Use z.record() instead of z.map()');
    });

    it('should throw runtime error for set()', () => {
      expect(() => {
        // @ts-expect-error - Testing forbidden method
        z.set();
      }).toThrow('JSON-serializable schemas only. Use z.array() instead of z.set()');
    });

    it('should throw runtime error for enum()', () => {
      expect(() => {
        // @ts-expect-error - Testing forbidden method
        z.enum();
      }).toThrow("JSON-serializable schemas only. Use z.union([z.literal('a'), z.literal('b')]) instead of z.enum()");
    });
  });

  describe('JSON Serialization Guarantee', () => {
    it('should ensure all valid schemas produce JSON-serializable values', () => {
      const testCases = [
        z.string().parse('hello'),
        z.number().parse(42),
        z.boolean().parse(true),
        z.null().parse(null),
        z.array(z.string()).parse(['a', 'b']),
        z.object({ x: z.number() }).parse({ x: 1 }),
        z.record(z.string(), z.boolean()).parse({ a: true, b: false })
      ];

      for (const value of testCases) {
        const serialized = JSON.stringify(value);
        const deserialized = JSON.parse(serialized);
        expect(deserialized).toEqual(value);
      }
    });
  });

  describe('Helper Patterns', () => {
    it('should validate ISO date strings with dateString()', () => {
      const schema = z.dateString();
      
      // Valid ISO date strings
      expect(schema.parse('2023-12-25T10:30:00.000Z')).toBe('2023-12-25T10:30:00.000Z');
      expect(schema.parse('2023-12-25T10:30:00.123Z')).toBe('2023-12-25T10:30:00.123Z');
      expect(schema.parse('2023-01-01T00:00:00.000Z')).toBe('2023-01-01T00:00:00.000Z');
      
      // Invalid formats should throw
      expect(() => schema.parse('2023-12-25')).toThrow('Invalid ISO datetime format');
      expect(() => schema.parse('2023-12-25T10:30:00')).toThrow('Invalid ISO datetime format');
      expect(() => schema.parse('not a date')).toThrow('Invalid ISO datetime format');
    });

    it('should validate numeric strings with numberString()', () => {
      const schema = z.numberString();
      
      // Valid numeric strings
      expect(schema.parse('123')).toBe('123');
      expect(schema.parse('0')).toBe('0');
      expect(schema.parse('999999')).toBe('999999');
      
      // Invalid formats should throw
      expect(() => schema.parse('12.34')).toThrow('Must contain only digits');
      expect(() => schema.parse('-123')).toThrow('Must contain only digits');
      expect(() => schema.parse('123abc')).toThrow('Must contain only digits');
      expect(() => schema.parse('')).toThrow('Must contain only digits');
    });
  });

  describe('Runtime Validation Helpers', () => {
    describe('assertJsonSerializable', () => {
      it('should pass for JSON-serializable values', () => {
        const validCases = [
          null,
          'string',
          123,
          true,
          { a: 1, b: 'two', c: [3, 4, 5] },
          [1, 'two', { three: 3 }],
          { nested: { deeply: { value: 'test' } } }
        ];

        for (const value of validCases) {
          expect(() => assertJsonSerializable(value)).not.toThrow();
        }
      });

      it('should throw for non-JSON types with path info', () => {
        expect(() => assertJsonSerializable(new Date()))
          .toThrow('Value contains non-JSON-serializable type at root: Date (use ISO string instead)');
        
        expect(() => assertJsonSerializable({ date: new Date() }))
          .toThrow('Value contains non-JSON-serializable type at root.date: Date (use ISO string instead)');
        
        expect(() => assertJsonSerializable({ items: [1, 2, new Date()] }))
          .toThrow('Value contains non-JSON-serializable type at root.items[2]: Date (use ISO string instead)');
          
        expect(() => assertJsonSerializable({ fn: () => {} }))
          .toThrow('Value contains non-JSON-serializable type at root.fn: function');
          
        expect(() => assertJsonSerializable({ big: 123n }))
          .toThrow('Value contains non-JSON-serializable type at root.big: bigint');
          
        expect(() => assertJsonSerializable({ map: new Map() }))
          .toThrow('Value contains non-JSON-serializable type at root.map: Map (use object instead)');
          
        expect(() => assertJsonSerializable({ set: new Set() }))
          .toThrow('Value contains non-JSON-serializable type at root.set: Set (use array instead)');
      });

      it('should detect circular references', () => {
        const obj: Record<string, unknown> = { a: 1 };
        obj.self = obj;
        
        expect(() => assertJsonSerializable(obj))
          .toThrow('Value contains circular reference at root.self');
      });
    });

    describe('makeJsonSafe', () => {
      it('should convert Date to ISO string', () => {
        const date = new Date('2023-12-25T10:30:00.000Z');
        const result = makeJsonSafe({ date });
        expect(result).toEqual({ date: '2023-12-25T10:30:00.000Z' });
      });

      it('should convert bigint to string', () => {
        const result = makeJsonSafe({ big: 123n });
        expect(result).toEqual({ big: '123' });
      });

      it('should convert Map to object', () => {
        const map = new Map([['a', 1], ['b', 2]]);
        const result = makeJsonSafe({ map });
        expect(result).toEqual({ map: { a: 1, b: 2 } });
      });

      it('should convert Set to array', () => {
        const set = new Set([1, 2, 3]);
        const result = makeJsonSafe({ set });
        expect(result).toEqual({ set: [1, 2, 3] });
      });

      it('should remove undefined values', () => {
        const result = makeJsonSafe({ a: 1, b: undefined, c: 3 });
        expect(result).toEqual({ a: 1, c: 3 });
      });

      it('should handle nested conversions', () => {
        const input = {
          date: new Date('2023-12-25T10:30:00.000Z'),
          nested: {
            big: 999n,
            map: new Map([['key', 'value']]),
            undef: undefined
          },
          array: [1, new Date('2023-01-01T00:00:00.000Z'), 3]
        };

        const result = makeJsonSafe(input);
        expect(result).toEqual({
          date: '2023-12-25T10:30:00.000Z',
          nested: {
            big: '999',
            map: { key: 'value' }
          },
          array: [1, '2023-01-01T00:00:00.000Z', 3]
        });
      });

      it('should throw for functions and symbols', () => {
        expect(() => makeJsonSafe({ fn: () => {} }))
          .toThrow('Cannot convert function to JSON');
          
        expect(() => makeJsonSafe({ sym: Symbol('test') }))
          .toThrow('Cannot convert symbol to JSON');
      });

      it('should convert RegExp to string', () => {
        const result = makeJsonSafe({ regex: /test/gi });
        expect(result).toEqual({ regex: '/test/gi' });
      });

      it('should handle circular references', () => {
        const obj: Record<string, unknown> = { a: 1 };
        obj.self = obj;
        
        const result = makeJsonSafe(obj) as Record<string, unknown>;
        expect(result.a).toBe(1);
        expect(result.self).toBe(result); // Should maintain reference
      });
    });
  });
});