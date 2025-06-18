import { describe, expect, test as it } from 'bun:test';
import { detectCircularReferences } from '../references';

describe('Circular Reference Detection', () => {
  describe('detectCircularReferences for dependency graph', () => {
    it('provides clear error for circular dependencies', () => {
      const actions = [
        {
          id: 'action1',
          inputs: { value: '${action3.output}' },
        },
        {
          id: 'action2',
          inputs: { value: '${action1.output}' },
        },
        {
          id: 'action3',
          inputs: { value: '${action2.output}' },
        },
      ];

      const errors = detectCircularReferences(actions);
      
      expect(errors.length).toBeGreaterThan(0);
      
      // Check that error messages are clear
      const firstError = errors[0];
      expect(firstError).toContain('Circular dependency detected');
      expect(firstError).toContain('cycle starts here');
      expect(firstError).toContain('returns to start');
      expect(firstError).toContain('→');
      
      // Should mention the infinite loop issue
      expect(firstError).toContain('infinite dependency loop');
    });

    it('handles multiple independent cycles', () => {
      const actions = [
        // First cycle: A -> B -> A
        {
          id: 'A',
          inputs: { value: '${B.output}' },
        },
        {
          id: 'B',
          inputs: { value: '${A.output}' },
        },
        // Second cycle: C -> D -> E -> C
        {
          id: 'C',
          inputs: { value: '${E.output}' },
        },
        {
          id: 'D',
          inputs: { value: '${C.output}' },
        },
        {
          id: 'E',
          inputs: { value: '${D.output}' },
        },
      ];

      const errors = detectCircularReferences(actions);
      
      expect(errors.length).toBeGreaterThanOrEqual(2);
      
      // Check that both cycles are reported
      const errorText = errors.join('\n');
      expect(errorText).toContain('A');
      expect(errorText).toContain('B');
      expect(errorText).toContain('C');
      expect(errorText).toContain('D');
      expect(errorText).toContain('E');
    });

    it('does not report false positives for valid dependencies', () => {
      const actions = [
        {
          id: 'A',
          inputs: {},
        },
        {
          id: 'B',
          inputs: { value: '${A.output}' },
        },
        {
          id: 'C',
          inputs: { value1: '${A.output}', value2: '${B.output}' },
        },
        {
          id: 'D',
          inputs: { value1: '${B.output}', value2: '${C.output}' },
        },
      ];

      const errors = detectCircularReferences(actions);
      
      expect(errors).toHaveLength(0);
    });
  });
});