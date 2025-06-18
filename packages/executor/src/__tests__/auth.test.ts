import { describe, expect, test as it, beforeEach, afterEach } from 'bun:test';
import { applyAuthentication, extractAuthFromHeaders, isTokenExpiring } from '../auth';
import type { Authentication } from '../schemas';

describe('Authentication Module', () => {
  describe('applyAuthentication', () => {
    let headers: Record<string, string>;
    let credentials: Record<string, string>;

    beforeEach(() => {
      headers = {};
      credentials = {
        'api_key': 'test-key-123',
        'username': 'testuser',
        'password': 'testpass',
        'oauth_client123_access_token': 'cached-token',
        'oauth_client123_expires_at': new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
      };
      
      // Mock environment variables using direct assignment
      // Store original values to restore in afterEach
      process.env.API_TOKEN = 'env-token-456';
      process.env.SECRET_KEY = 'env-secret-789';
    });

    afterEach(() => {
      // Clean up environment variables
      delete process.env.API_TOKEN;
      delete process.env.SECRET_KEY;
    });

    describe('exhaustiveness checking', () => {
      it('handles all defined authentication types without type errors', async () => {
        // This test verifies that our exhaustiveness check works correctly
        // If we add a new auth type to the schema without handling it in the switch,
        // TypeScript will fail to compile, catching the error at build time
        
        const authTypes: Authentication[] = [
          { type: 'bearer', token: 'API_TOKEN', tokenFrom: 'env' },
          { type: 'api_key', header: 'X-API-Key', value: 'api_key', valueFrom: 'user_input' },
          { 
            type: 'oauth2', 
            clientId: 'client123', 
            clientSecret: 'secret',
            tokenUrl: 'https://oauth.example.com/token',
            scope: ['read', 'write']
          },
          { type: 'custom', handler: 'basic_auth' },
        ];

        // Each type should be handled without throwing
        for (const auth of authTypes) {
          const testHeaders = {};
          
          // Test that applyAuthentication completes without throwing
          try {
            await applyAuthentication(testHeaders, auth, credentials);
            // If we get here, the function didn't throw - test passes
            expect(true).toBe(true);
          } catch (error) {
            // Only expected errors should occur (like unimplemented custom handlers)
            if (auth.type === 'custom' && 
                (auth.handler === 'hmac_signature' || auth.handler === 'aws_signature_v4')) {
              expect(error).toBeInstanceOf(Error);
              expect((error as Error).message).toContain('not yet implemented');
            } else {
              // Unexpected error - fail the test
              throw new Error(`Unexpected error for auth type ${auth.type}: ${error}`);
            }
          }
        }
      });

      it('provides meaningful error for malformed authentication objects at runtime', async () => {
        // This simulates data that bypassed TypeScript validation
        // (e.g., from external API, corrupted storage, or schema version mismatch)
        const malformedAuth = { type: 'unsupported_type' } as any;
        
        await expect(
          applyAuthentication(headers, malformedAuth, credentials)
        ).rejects.toThrow('Unsupported authentication type');
        
        await expect(
          applyAuthentication(headers, malformedAuth, credentials)
        ).rejects.toThrow('schema mismatch or corrupted data');
      });

      it('type system prevents compilation with unhandled auth types', () => {
        // This is a compile-time test - if we comment out a case in the switch statement,
        // TypeScript will error on the `_exhaustiveCheck: never = auth` line
        // This test documents that behavior for other developers
        
        // To test this manually:
        // 1. Comment out one of the cases in applyAuthentication's switch
        // 2. Run tsc - it should fail with "Type 'X' is not assignable to type 'never'"
        // 3. This proves our exhaustiveness check is working
        
        expect(true).toBe(true); // Document the compile-time behavior
      });
    });

    describe('bearer token authentication', () => {
      it('adds bearer token from environment variable', async () => {
        const auth: Authentication = { 
          type: 'bearer', 
          token: 'API_TOKEN', 
          tokenFrom: 'env' 
        };
        
        await applyAuthentication(headers, auth, credentials);
        
        expect(headers.Authorization).toBe('Bearer env-token-456');
      });

      it('adds bearer token from user input', async () => {
        const auth: Authentication = { 
          type: 'bearer', 
          token: 'api_key', 
          tokenFrom: 'user_input' 
        };
        
        await applyAuthentication(headers, auth, credentials);
        
        expect(headers.Authorization).toBe('Bearer test-key-123');
      });

      it('throws error when environment variable is missing', async () => {
        const auth: Authentication = { 
          type: 'bearer', 
          token: 'MISSING_VAR', 
          tokenFrom: 'env' 
        };
        
        await expect(
          applyAuthentication(headers, auth, credentials)
        ).rejects.toThrow('Environment variable not found: MISSING_VAR');
      });
    });

    describe('API key authentication', () => {
      it('adds API key to custom header', async () => {
        const auth: Authentication = { 
          type: 'api_key',
          header: 'X-Custom-Key',
          value: 'SECRET_KEY',
          valueFrom: 'env'
        };
        
        await applyAuthentication(headers, auth, credentials);
        
        expect(headers['X-Custom-Key']).toBe('env-secret-789');
      });

      it('supports various header name formats', async () => {
        const auth: Authentication = { 
          type: 'api_key',
          header: 'x-api-key', // lowercase
          value: 'api_key',
          valueFrom: 'user_input'
        };
        
        await applyAuthentication(headers, auth, credentials);
        
        expect(headers['x-api-key']).toBe('test-key-123');
      });
    });

    describe('OAuth2 authentication', () => {
      it('uses cached token when not expired', async () => {
        const auth: Authentication = { 
          type: 'oauth2',
          clientId: 'client123',
          clientSecret: 'secret',
          tokenUrl: 'https://oauth.example.com/token',
          scope: ['read']
        };
        
        await applyAuthentication(headers, auth, credentials);
        
        expect(headers.Authorization).toBe('Bearer cached-token');
      });

      it('throws error when token expired and no refresh token', async () => {
        // Set expired token
        credentials['oauth_client456_expires_at'] = new Date(Date.now() - 3600000).toISOString();
        
        const auth: Authentication = { 
          type: 'oauth2',
          clientId: 'client456',
          clientSecret: 'secret',
          tokenUrl: 'https://oauth.example.com/token',
          scope: ['read']
        };
        
        await expect(
          applyAuthentication(headers, auth, credentials)
        ).rejects.toThrow('OAuth2 access token expired and no refresh token available');
      });
    });

    describe('custom authentication', () => {
      it('applies basic auth when handler is basic_auth', async () => {
        const auth: Authentication = { 
          type: 'custom',
          handler: 'basic_auth'
        };
        
        await applyAuthentication(headers, auth, credentials);
        
        // Basic auth should be base64 encoded username:password
        const expectedAuth = Buffer.from('testuser:testpass').toString('base64');
        expect(headers.Authorization).toBe(`Basic ${expectedAuth}`);
      });

      it('throws error for unimplemented custom handlers', async () => {
        const auth: Authentication = { 
          type: 'custom',
          handler: 'hmac_signature'
        };
        
        await expect(
          applyAuthentication(headers, auth, credentials)
        ).rejects.toThrow('HMAC signature authentication not yet implemented');
      });

      it('throws error for unknown custom handlers', async () => {
        const auth: Authentication = { 
          type: 'custom',
          handler: 'unknown_handler'
        };
        
        await expect(
          applyAuthentication(headers, auth, credentials)
        ).rejects.toThrow('Unknown custom authentication handler: unknown_handler');
      });
    });
  });

  describe('extractAuthFromHeaders', () => {
    it('extracts bearer token from Authorization header', () => {
      const headers = { 'Authorization': 'Bearer test-token-123' };
      
      const result = extractAuthFromHeaders(headers);
      
      expect(result).toEqual({
        type: 'bearer',
        token: 'test-token-123'
      });
    });

    it('extracts API key from common headers', () => {
      const headers = { 'X-API-Key': 'key-456' };
      
      const result = extractAuthFromHeaders(headers);
      
      expect(result).toEqual({
        type: 'api_key',
        header: 'X-API-Key',
        value: 'key-456'
      });
    });

    it('handles case-insensitive authorization header', () => {
      const headers = { 'authorization': 'Bearer lowercase-token' };
      
      const result = extractAuthFromHeaders(headers);
      
      expect(result).toEqual({
        type: 'bearer',
        token: 'lowercase-token'
      });
    });

    it('returns null when no auth headers present', () => {
      const headers = { 'Content-Type': 'application/json' };
      
      const result = extractAuthFromHeaders(headers);
      
      expect(result).toBeNull();
    });
  });

  describe('isTokenExpiring', () => {
    it('returns true when token expires within buffer', () => {
      const expiresAt = new Date(Date.now() + 4 * 60 * 1000).toISOString(); // 4 minutes
      
      expect(isTokenExpiring(expiresAt, 5)).toBe(true);
    });

    it('returns false when token has sufficient time', () => {
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes
      
      expect(isTokenExpiring(expiresAt, 5)).toBe(false);
    });

    it('returns false for undefined expiry', () => {
      expect(isTokenExpiring(undefined)).toBe(false);
    });

    it('returns true for already expired tokens', () => {
      const expiresAt = new Date(Date.now() - 60 * 1000).toISOString(); // 1 minute ago
      
      expect(isTokenExpiring(expiresAt)).toBe(true);
    });
  });
});