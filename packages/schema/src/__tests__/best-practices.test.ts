import { describe, it, expect } from 'bun:test';
import { z } from '../zod';
// Import raw zod for coerce tests
import { z as zRaw } from '../zod-base';

describe('JSON-Safe Zod Best Practices', () => {
  describe('dateString with datetime()', () => {
    it('should validate ISO datetime strings', () => {
      const schema = z.dateString();
      
      // Valid ISO datetimes
      expect(() => schema.parse('2023-12-25T10:30:00.000Z')).not.toThrow();
      expect(() => schema.parse('2023-12-25T10:30:00Z')).not.toThrow();
      expect(() => schema.parse('2023-12-25T10:30:00.123456Z')).not.toThrow();
      
      // Invalid formats
      expect(() => schema.parse('2023-12-25')).toThrow('Invalid ISO datetime format');
      expect(() => schema.parse('not a date')).toThrow();
    });
    
    it('can transform to Date object following best practices', () => {
      // Best practice: transform ISO string to Date when needed
      const schema = z.dateString().transform(str => new Date(str));
      
      const result = schema.parse('2023-12-25T10:30:00Z');
      expect(result instanceof Date).toBe(true);
      expect(result.toISOString()).toBe('2023-12-25T10:30:00.000Z');
    });
  });
  
  describe('numberString best practices', () => {
    it('should preserve leading zeros as string', () => {
      const schema = z.numberString();
      
      // Best practice: Keep as string to preserve formatting
      const result = schema.parse('00042');
      expect(result).toBe('00042'); // Preserves leading zeros
      expect(typeof result).toBe('string');
    });
    
    it('can transform to number when needed', () => {
      // Best practice: Only transform when you need arithmetic
      const schema = z.numberString().transform(Number);
      
      const result = schema.parse('00042');
      expect(result).toBe(42);
      expect(typeof result).toBe('number');
    });
  });
  
  describe('z.coerce best practices', () => {
    it('should handle flexible input types', () => {
      // Best practice for form data or unknown JSON
      // Using raw zod for coerce since it's not in our JSON-safe subset
      const schema = zRaw.object({
        age: zRaw.coerce.number(),
        active: zRaw.coerce.boolean(),
      });
      
      // Handles string inputs from forms
      const result = schema.parse({
        age: '25',
        active: 'true'
      });
      
      expect(result.age).toBe(25);
      expect(result.active).toBe(true);
    });
    
    it('should work with constraints', () => {
      const schema = zRaw.coerce.number().min(0).max(100);
      
      expect(() => schema.parse('50')).not.toThrow();
      expect(() => schema.parse('101')).toThrow();
    });
  });
  
  describe('Real-world patterns', () => {
    it('should handle API response with dates', () => {
      // Common pattern: API returns ISO strings
      const ApiResponseSchema = z.object({
        id: z.uuid(),
        createdAt: z.dateString(),
        updatedAt: z.dateString(),
        score: z.int().min(0).max(100),
        metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
      });
      
      const response = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        createdAt: '2023-12-25T10:30:00Z',
        updatedAt: '2023-12-26T10:30:00Z',
        score: 95,
        metadata: {
          version: '1.0',
          attempts: 3,
          verified: true
        }
      };
      
      expect(() => ApiResponseSchema.parse(response)).not.toThrow();
    });
    
    it('should handle form data with coercion', () => {
      // Common pattern: Form submits everything as strings
      const FormSchema = zRaw.object({
        name: z.string().min(1),
        age: zRaw.coerce.number().min(0).max(150),
        email: z.email(),
        acceptTerms: zRaw.coerce.boolean()
      });
      
      const formData = {
        name: 'John Doe',
        age: '30',
        email: 'john@example.com',
        acceptTerms: 'on' // Checkbox value
      };
      
      const result = FormSchema.parse(formData);
      expect(result.age).toBe(30);
      expect(result.acceptTerms).toBe(true);
    });
  });
});