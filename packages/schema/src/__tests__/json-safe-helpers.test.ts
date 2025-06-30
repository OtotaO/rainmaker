import { describe, it, expect } from 'bun:test';
import { z } from '../zod';

describe('JSON-Safe Zod Helpers', () => {
  describe('uuid()', () => {
    it('should validate valid UUID v4', () => {
      const schema = z.uuid();
      
      expect(() => schema.parse('550e8400-e29b-41d4-a716-446655440000')).not.toThrow();
      expect(() => schema.parse('f47ac10b-58cc-4372-a567-0e02b2c3d479')).not.toThrow();
    });
    
    it('should reject invalid UUIDs', () => {
      const schema = z.uuid();
      
      expect(() => schema.parse('not-a-uuid')).toThrow('Invalid uuid');
      expect(() => schema.parse('550e8400-e29b-11d4-a716-446655440000')).not.toThrow(); // v1 is valid UUID
      expect(() => schema.parse('550e8400e29b41d4a716446655440000')).toThrow(); // no hyphens
    });
  });
  
  describe('url()', () => {
    it('should validate valid URLs', () => {
      const schema = z.url();
      
      expect(() => schema.parse('https://example.com')).not.toThrow();
      expect(() => schema.parse('http://test.org/path?query=1')).not.toThrow();
      expect(() => schema.parse('https://sub.domain.com:8080/path/to/resource')).not.toThrow();
    });
    
    it('should reject invalid URLs', () => {
      const schema = z.url();
      
      expect(() => schema.parse('not-a-url')).toThrow('Invalid url');
      expect(() => schema.parse('ftp://example.com')).not.toThrow(); // Zod's url() accepts any protocol
      expect(() => schema.parse('https://')).toThrow(); // incomplete
    });
  });
  
  describe('int()', () => {
    it('should validate integers only', () => {
      const schema = z.int();
      
      // Only accepts whole numbers
      expect(() => schema.parse(42)).not.toThrow();
      expect(() => schema.parse(0)).not.toThrow();
      expect(() => schema.parse(-100)).not.toThrow();
      
      // Rejects decimals
      expect(() => schema.parse(3.14)).toThrow();
      expect(() => schema.parse(0.1)).toThrow();
      expect(() => schema.parse(-100.5)).toThrow();
    });
    
    it('should reject non-numbers', () => {
      const schema = z.int();
      
      expect(() => schema.parse('42')).toThrow();
      expect(() => schema.parse(null)).toThrow();
      expect(() => schema.parse(undefined)).toThrow();
    });
    
    it('should work with additional constraints', () => {
      const schema = z.int().min(0).max(100);
      
      expect(() => schema.parse(50)).not.toThrow();
      expect(() => schema.parse(0)).not.toThrow();
      expect(() => schema.parse(100)).not.toThrow();
      expect(() => schema.parse(-1)).toThrow();
      expect(() => schema.parse(101)).toThrow();
      expect(() => schema.parse(50.5)).toThrow(); // Not an integer
    });
    
    it('provides better DX than z.number().int()', () => {
      // Our helper
      const schema1 = z.int().min(1);
      
      // Standard Zod (more verbose)
      const schema2 = z.number().int().min(1);
      
      // Both should behave the same
      expect(() => schema1.parse(5)).not.toThrow();
      expect(() => schema2.parse(5)).not.toThrow();
      expect(() => schema1.parse(5.5)).toThrow();
      expect(() => schema2.parse(5.5)).toThrow();
    });
  });
  
  describe('Integration with schemas', () => {
    it('should work in object schemas', () => {
      const UserSchema = z.object({
        id: z.uuid(),
        age: z.int().min(0),
        website: z.url().optional(),
        score: z.number() // Can be decimal
      });
      
      const valid = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        age: 25,
        website: 'https://example.com',
        score: 95.5
      };
      
      expect(() => UserSchema.parse(valid)).not.toThrow();
      
      const invalid = {
        id: 'not-a-uuid',
        age: 25, // Valid age
        website: 'not-a-url',
        score: 95.5
      };
      
      expect(() => UserSchema.parse(invalid)).toThrow(); // Fails on id and website
    });
  });
});