import { describe, it, expect } from 'bun:test';
import { z } from '../zod';
import { withBrand, CommonBrands } from '../brand';

describe('JSON-Safe Branded Types', () => {
  describe('withBrand() helper', () => {
    it('should create branded string types', () => {
      const UserIdSchema = withBrand(z.string().uuid(), 'UserId');
      const CustomerIdSchema = withBrand(z.string().uuid(), 'CustomerId');
      
      type UserId = z.infer<typeof UserIdSchema>;
      type CustomerId = z.infer<typeof CustomerIdSchema>;
      
      // These should be different types at compile time
      // But at runtime, they're just strings
      const userId = UserIdSchema.parse('550e8400-e29b-41d4-a716-446655440000');
      const customerId = CustomerIdSchema.parse('6ba7b810-9dad-11d1-80b4-00c04fd430c8');
      
      // Runtime values are just strings
      expect(typeof userId).toBe('string');
      expect(typeof customerId).toBe('string');
      
      // Values serialize to JSON correctly
      expect(JSON.stringify({ userId, customerId })).toBe(
        '{"userId":"550e8400-e29b-41d4-a716-446655440000","customerId":"6ba7b810-9dad-11d1-80b4-00c04fd430c8"}'
      );
    });
    
    it('should work with number brands', () => {
      const PortSchema = withBrand(z.number().int().min(1).max(65535), 'Port');
      const PidSchema = withBrand(z.number().int().positive(), 'ProcessId');
      
      const port = PortSchema.parse(8080);
      const pid = PidSchema.parse(12345);
      
      expect(typeof port).toBe('number');
      expect(typeof pid).toBe('number');
      expect(JSON.stringify({ port, pid })).toBe('{"port":8080,"pid":12345}');
    });
    
    it('should maintain validation rules', () => {
      const UserIdSchema = withBrand(z.string().uuid(), 'UserId');
      
      // Valid UUID passes
      expect(() => UserIdSchema.parse('550e8400-e29b-41d4-a716-446655440000')).not.toThrow();
      
      // Invalid UUID fails
      expect(() => UserIdSchema.parse('not-a-uuid')).toThrow('Invalid uuid');
    });
    
    it('should work with our helper methods', () => {
      const UserIdSchema = withBrand(z.uuid(), 'UserId');
      const ApiUrlSchema = withBrand(z.url(), 'ApiUrl');
      const RequestIdSchema = withBrand(z.int().positive(), 'RequestId');
      
      const userId = UserIdSchema.parse('550e8400-e29b-41d4-a716-446655440000');
      const apiUrl = ApiUrlSchema.parse('https://api.example.com');
      const requestId = RequestIdSchema.parse(42);
      
      expect(JSON.stringify({ userId, apiUrl, requestId })).toBe(
        '{"userId":"550e8400-e29b-41d4-a716-446655440000","apiUrl":"https://api.example.com","requestId":42}'
      );
    });
    
    it('should work in object schemas', () => {
      const UserSchema = z.object({
        id: withBrand(z.uuid(), 'UserId'),
        customerId: withBrand(z.uuid(), 'CustomerId'),
        port: withBrand(z.int().min(1).max(65535), 'Port'),
        apiUrl: withBrand(z.url(), 'ApiUrl').optional()
      });
      
      const user = UserSchema.parse({
        id: '550e8400-e29b-41d4-a716-446655440000',
        customerId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
        port: 8080,
        apiUrl: 'https://api.example.com'
      });
      
      // Should serialize cleanly
      const json = JSON.stringify(user);
      const parsed = JSON.parse(json);
      
      expect(parsed).toEqual({
        id: '550e8400-e29b-41d4-a716-446655440000',
        customerId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
        port: 8080,
        apiUrl: 'https://api.example.com'
      });
    });
  });
  
  describe('Type safety', () => {
    it('should provide compile-time type safety', () => {
      // This test is more about TypeScript compilation
      // The actual type checking happens at compile time
      
      const UserIdSchema = withBrand(z.string().uuid(), 'UserId');
      const CustomerIdSchema = withBrand(z.string().uuid(), 'CustomerId');
      
      type UserId = z.infer<typeof UserIdSchema>;
      type CustomerId = z.infer<typeof CustomerIdSchema>;
      
      // This function only accepts UserId
      function processUser(id: UserId) {
        return `Processing user: ${id}`;
      }
      
      const userId = UserIdSchema.parse('550e8400-e29b-41d4-a716-446655440000');
      
      // This should work
      expect(processUser(userId)).toBe('Processing user: 550e8400-e29b-41d4-a716-446655440000');
      
      // Note: We can't test compile-time errors in runtime tests
      // but TypeScript will prevent passing a CustomerId to processUser
    });
  });
  
  describe('CommonBrands helpers', () => {
    it('should provide pre-defined brand helpers', () => {
      const userIdSchema = CommonBrands.UserId(z.string().uuid());
      const portSchema = CommonBrands.Port(z.number().int().min(1).max(65535));
      const apiUrlSchema = CommonBrands.ApiUrl(z.string().url());
      
      const userId = userIdSchema.parse('550e8400-e29b-41d4-a716-446655440000');
      const port = portSchema.parse(8080);
      const apiUrl = apiUrlSchema.parse('https://api.example.com');
      
      expect(typeof userId).toBe('string');
      expect(typeof port).toBe('number');
      expect(typeof apiUrl).toBe('string');
      
      // All serialize correctly
      expect(JSON.stringify({ userId, port, apiUrl })).toBe(
        '{"userId":"550e8400-e29b-41d4-a716-446655440000","port":8080,"apiUrl":"https://api.example.com"}'
      );
    });
  });
});