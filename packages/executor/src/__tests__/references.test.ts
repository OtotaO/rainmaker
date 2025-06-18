import { describe, it, expect } from 'bun:test';
import {
  resolveReferences,
  isValidReference,
  extractActionId,
  extractAllReferences,
  detectCircularReferences,
} from '../references';
import type { ActionId } from '../schemas';

describe('Reference Resolution Tests', () => {
  describe('isValidReference', () => {
    it('validates correct reference patterns', () => {
      expect(isValidReference('${action1.output.field}')).toBe(true);
      expect(isValidReference('${action_2.output.nested.field}')).toBe(true);
      expect(isValidReference('${action3.output.array[0].field}')).toBe(true);
    });

    it('rejects invalid reference patterns', () => {
      expect(isValidReference('not a reference')).toBe(false);
      expect(isValidReference('${incomplete')).toBe(false);
      expect(isValidReference('$action.output}')).toBe(false);
      expect(isValidReference('${action.}')).toBe(false);
      expect(isValidReference('prefix ${action.output} suffix')).toBe(false);
    });
  });

  describe('extractActionId', () => {
    it('extracts action ID from valid references', () => {
      expect(extractActionId('${action1.output.field}')).toBe('action1');
      expect(extractActionId('${my_action.output.data}')).toBe('my_action');
      expect(extractActionId('${action123.result}')).toBe('action123');
    });

    it('returns null for invalid references', () => {
      expect(extractActionId('not a reference')).toBe(null);
      expect(extractActionId('${.output.field}')).toBe(null);
    });
  });

  describe('resolveReferences', () => {
    it('resolves simple field references', async () => {
      const inputs = {
        userId: '${action1.output.id}',
        name: 'static value',
      };

      const previousResults = {
        action1: JSON.stringify({ output: { id: '123', name: 'John' } }),
      };

      const resolved = await resolveReferences(inputs, previousResults, ['action1' as ActionId]);

      expect(resolved.userId).toBe('123');
      expect(resolved.name).toBe('static value');
    });

    it('resolves nested field references', async () => {
      const inputs = {
        email: '${action1.output.user.contact.email}',
      };

      const previousResults = {
        action1: JSON.stringify({
          output: {
            user: {
              contact: {
                email: 'john@example.com',
              },
            },
          },
        }),
      };

      const resolved = await resolveReferences(inputs, previousResults, ['action1' as ActionId]);

      expect(resolved.email).toBe('john@example.com');
    });

    it('resolves array index references', async () => {
      const inputs = {
        firstUserId: '${action1.output.users[0].id}',
        secondUserName: '${action1.output.users[1].name}',
      };

      const previousResults = {
        action1: JSON.stringify({
          output: {
            users: [
              { id: '101', name: 'Alice' },
              { id: '102', name: 'Bob' },
            ],
          },
        }),
      };

      const resolved = await resolveReferences(inputs, previousResults, ['action1' as ActionId]);

      expect(resolved.firstUserId).toBe('101');
      expect(resolved.secondUserName).toBe('Bob');
    });

    it('preserves non-string values', async () => {
      const inputs = {
        count: 42,
        active: true,
        userId: '${action1.output.id}',
      };

      const previousResults = {
        action1: JSON.stringify({ output: { id: '123' } }),
      };

      const resolved = await resolveReferences(inputs, previousResults, ['action1' as ActionId]);

      expect(resolved.count).toBe(42);
      expect(resolved.active).toBe(true);
      expect(resolved.userId).toBe('123');
    });

    it('throws error for missing dependencies', async () => {
      const inputs = {
        userId: '${action2.output.id}',
      };

      const previousResults = {
        action1: JSON.stringify({ output: { id: '123' } }),
      };

      await expect(
        resolveReferences(inputs, previousResults, ['action1' as ActionId]),
      ).rejects.toThrow("Reference to action 'action2' not found in dependencies");
    });

    it('throws error for missing results', async () => {
      const inputs = {
        userId: '${action1.output.id}',
      };

      const previousResults = {};

      await expect(
        resolveReferences(inputs, previousResults, ['action1' as ActionId]),
      ).rejects.toThrow("No results found for action 'action1'");
    });

    it('throws error for invalid path in results', async () => {
      const inputs = {
        value: '${action1.output.nonexistent.field}',
      };

      const previousResults = {
        action1: JSON.stringify({ output: { id: '123' } }),
      };

      await expect(
        resolveReferences(inputs, previousResults, ['action1' as ActionId]),
      ).rejects.toThrow('Cannot access');
    });

    it('throws error for array index out of bounds', async () => {
      const inputs = {
        value: '${action1.output.items[5].id}',
      };

      const previousResults = {
        action1: JSON.stringify({
          output: { items: [{ id: '1' }, { id: '2' }] },
        }),
      };

      await expect(
        resolveReferences(inputs, previousResults, ['action1' as ActionId]),
      ).rejects.toThrow('Array index 5 out of bounds');
    });

    it('detects simple circular references', async () => {
      const inputs = {
        value: '${action1.output.ref}',
      };

      const previousResults = {
        action1: JSON.stringify({
          output: { ref: '${action1.output.ref}' },
        }),
      };

      await expect(
        resolveReferences(inputs, previousResults, ['action1' as ActionId]),
      ).rejects.toThrow('Circular reference detected');
    });

    it('resolves chained references', async () => {
      const inputs = {
        finalValue: '${action2.output.value}',
      };

      const previousResults = {
        action1: JSON.stringify({ output: { data: 'Hello World' } }),
        action2: JSON.stringify({ output: { value: '${action1.output.data}' } }),
      };

      const resolved = await resolveReferences(inputs, previousResults, [
        'action1' as ActionId,
        'action2' as ActionId,
      ]);

      expect(resolved.finalValue).toBe('Hello World');
    });
  });

  describe('extractAllReferences', () => {
    it('extracts all references from inputs', () => {
      const inputs = {
        field1: '${action1.output.a}',
        field2: 'static',
        field3: '${action2.output.b}',
        field4: 42,
        field5: '${action1.output.c}',
      };

      const refs = extractAllReferences(inputs);

      expect(refs.size).toBe(3);
      expect(refs.has('${action1.output.a}')).toBe(true);
      expect(refs.has('${action2.output.b}')).toBe(true);
      expect(refs.has('${action1.output.c}')).toBe(true);
    });

    it('handles nested objects and arrays', () => {
      const inputs = {
        nested: {
          ref: '${action1.output.x}',
          array: ['${action2.output.y}', 'static', { deep: '${action3.output.z}' }],
        },
      };

      const refs = extractAllReferences(inputs as any);

      expect(refs.size).toBe(3);
      expect(refs.has('${action1.output.x}')).toBe(true);
      expect(refs.has('${action2.output.y}')).toBe(true);
      expect(refs.has('${action3.output.z}')).toBe(true);
    });
  });

  describe('detectCircularReferences', () => {
    it('detects direct circular dependencies', () => {
      const actions = [
        {
          id: 'action1',
          inputs: { value: '${action2.output}' },
        },
        {
          id: 'action2',
          inputs: { value: '${action1.output}' },
        },
      ];

      const errors = detectCircularReferences(actions);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('Circular dependency');
      expect(errors[0]).toContain('action1');
      expect(errors[0]).toContain('action2');
    });

    it('detects longer circular chains', () => {
      const actions = [
        {
          id: 'action1',
          inputs: { value: '${action2.output}' },
        },
        {
          id: 'action2',
          inputs: { value: '${action3.output}' },
        },
        {
          id: 'action3',
          inputs: { value: '${action1.output}' },
        },
      ];

      const errors = detectCircularReferences(actions);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('Circular dependency');
    });

    it('allows valid DAG without cycles', () => {
      const actions: Array<{ id: string; inputs: Record<string, string | number | boolean> }> = [
        {
          id: 'action1',
          inputs: { value: 'static' },
        },
        {
          id: 'action2',
          inputs: { value: '${action1.output}' },
        },
        {
          id: 'action3',
          inputs: {
            a: '${action1.output}',
            b: '${action2.output}',
          },
        },
      ];

      const errors = detectCircularReferences(actions);

      expect(errors.length).toBe(0);
    });

    it('ignores self-references in detection', () => {
      const actions: Array<{ id: string; inputs: Record<string, string | number | boolean> }> = [
        {
          id: 'action1',
          inputs: {
            external: '${action2.output}',
            self: '${action1.output}', // Self-reference should be caught elsewhere
          },
        },
        {
          id: 'action2',
          inputs: { value: 'static' },
        },
      ];

      const errors = detectCircularReferences(actions);

      // Should not detect circular dependency from self-reference
      expect(errors.length).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('handles empty inputs', async () => {
      const resolved = await resolveReferences({}, {}, []);
      expect(resolved).toEqual({});
    });

    it('handles malformed JSON in previous results', async () => {
      const inputs = {
        value: '${action1.output.field}',
      };

      const previousResults = {
        action1: 'not valid json',
      };

      await expect(
        resolveReferences(inputs, previousResults, ['action1' as ActionId]),
      ).rejects.toThrow('Failed to parse results');
    });

    it('handles accessing properties on primitive values', async () => {
      const inputs = {
        value: '${action1.output.field.subfield}',
      };

      const previousResults = {
        action1: JSON.stringify({ output: { field: 'string value' } }),
      };

      await expect(
        resolveReferences(inputs, previousResults, ['action1' as ActionId]),
      ).rejects.toThrow("Cannot access property 'subfield' on non-object value");
    });

    it('handles null values in reference path', async () => {
      const inputs = {
        value: '${action1.output.nullable.field}',
      };

      const previousResults = {
        action1: JSON.stringify({ output: { nullable: null } }),
      };

      await expect(
        resolveReferences(inputs, previousResults, ['action1' as ActionId]),
      ).rejects.toThrow('Cannot access');
    });

    it('resolves references to boolean false correctly', async () => {
      const inputs = {
        flag: '${action1.output.isActive}',
      };

      const previousResults = {
        action1: JSON.stringify({ output: { isActive: false } }),
      };

      const resolved = await resolveReferences(inputs, previousResults, ['action1' as ActionId]);

      expect(resolved.flag).toBe(false);
    });

    it('resolves references to zero correctly', async () => {
      const inputs = {
        count: '${action1.output.total}',
      };

      const previousResults = {
        action1: JSON.stringify({ output: { total: 0 } }),
      };

      const resolved = await resolveReferences(inputs, previousResults, ['action1' as ActionId]);

      expect(resolved.count).toBe(0);
    });

    it('resolves references to empty string correctly', async () => {
      const inputs = {
        message: '${action1.output.text}',
      };

      const previousResults = {
        action1: JSON.stringify({ output: { text: '' } }),
      };

      const resolved = await resolveReferences(inputs, previousResults, ['action1' as ActionId]);

      expect(resolved.message).toBe('');
    });
  });
});
