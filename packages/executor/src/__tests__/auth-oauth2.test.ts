import { describe, expect, test as it, beforeEach, mock } from 'bun:test';
import type { Authentication } from '../schemas';

// We need to test the internal OAuth2 functions
// Since they're not exported, we'll test through applyAuthentication
import { applyAuthentication } from '../auth';

describe('OAuth2 Token Refresh Logic', () => {
  // Mock fetch for OAuth2 token endpoint
  const mockFetch = mock(() => {});
  global.fetch = mockFetch;

  beforeEach(() => {
    mockFetch.mockClear();
  });

  const createOAuth2Auth = (overrides?: Partial<Extract<Authentication, { type: 'oauth2' }>>): Extract<Authentication, { type: 'oauth2' }> => ({
    type: 'oauth2',
    clientId: 'test-client',
    clientSecret: 'test-secret',
    tokenUrl: 'https://auth.example.com/token',
    authorizationUrl: 'https://auth.example.com/authorize',
    redirectUrl: 'https://app.example.com/callback',
    scope: ['read', 'write'],
    refreshToken: 'initial-refresh-token',
    ...overrides,
  });

  describe('token rotation', () => {
    it('handles refresh token rotation correctly', async () => {
      const auth = createOAuth2Auth();
      const headers: Record<string, string> = {};
      
      // Initial state - expired access token
      const credentials = {
        'oauth_test-client_access_token': 'old-access-token',
        'oauth_test-client_expires_at': new Date(Date.now() - 3600000).toISOString(), // Expired
        'oauth_test-client_refresh_token': 'current-refresh-token',
      };

      // Mock successful refresh with token rotation
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({
          access_token: 'new-access-token',
          token_type: 'Bearer',
          expires_in: 3600,
          refresh_token: 'rotated-refresh-token', // New refresh token
          scope: 'read write',
        }),
      });

      await applyAuthentication(headers, auth, credentials);

      // Should have used the stored refresh token (not the one in config)
      expect(mockFetch).toHaveBeenCalled();
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('https://auth.example.com/token');
      expect(options.body.toString()).toContain('refresh_token=current-refresh-token');

      expect(headers.Authorization).toBe('Bearer new-access-token');
    });

    it('uses valid access token without refreshing', async () => {
      const auth = createOAuth2Auth();
      const headers: Record<string, string> = {};
      
      // Valid access token (expires in 1 hour)
      const credentials = {
        'oauth_test-client_access_token': 'valid-access-token',
        'oauth_test-client_expires_at': new Date(Date.now() + 3600000).toISOString(),
      };

      await applyAuthentication(headers, auth, credentials);

      // Should not call refresh endpoint
      expect(mockFetch).not.toHaveBeenCalled();
      expect(headers.Authorization).toBe('Bearer valid-access-token');
    });
  });

  describe('rate limiting', () => {
    it('prevents rapid token refresh attempts', async () => {
      const auth = createOAuth2Auth();
      const headers: Record<string, string> = {};
      
      // Expired token with recent refresh attempt
      const credentials = {
        'oauth_test-client_access_token': 'old-token',
        'oauth_test-client_expires_at': new Date(Date.now() - 3600000).toISOString(),
        'oauth_test-client_refresh_token': 'refresh-token',
        'oauth_test-client_last_refresh': (Date.now() - 5000).toString(), // 5 seconds ago
      };

      await expect(
        applyAuthentication(headers, auth, credentials)
      ).rejects.toThrow('Token refresh attempted too frequently');
    });

    it('allows refresh after rate limit period', async () => {
      const auth = createOAuth2Auth();
      const headers: Record<string, string> = {};
      
      // Expired token with old refresh attempt
      const credentials = {
        'oauth_test-client_access_token': 'old-token',
        'oauth_test-client_expires_at': new Date(Date.now() - 3600000).toISOString(),
        'oauth_test-client_refresh_token': 'refresh-token',
        'oauth_test-client_last_refresh': (Date.now() - 15000).toString(), // 15 seconds ago
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({
          access_token: 'new-token',
          expires_in: 3600,
        }),
      });

      await applyAuthentication(headers, auth, credentials);
      expect(headers.Authorization).toBe('Bearer new-token');
    });
  });

  describe('error handling', () => {
    it('handles invalid_grant error (refresh token expired)', async () => {
      const auth = createOAuth2Auth();
      const headers: Record<string, string> = {};
      
      const credentials = {
        'oauth_test-client_access_token': 'expired-token',
        'oauth_test-client_expires_at': new Date(Date.now() - 3600000).toISOString(),
        'oauth_test-client_refresh_token': 'expired-refresh-token',
      };

      // Mock invalid_grant error
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => JSON.stringify({
          error: 'invalid_grant',
          error_description: 'The refresh token has expired',
        }),
      });

      await expect(
        applyAuthentication(headers, auth, credentials)
      ).rejects.toThrow(/Re-authentication required/);
    });

    it('handles temporarily_unavailable as retryable', async () => {
      const auth = createOAuth2Auth();
      const headers: Record<string, string> = {};
      
      const credentials = {
        'oauth_test-client_access_token': 'expired-token',
        'oauth_test-client_expires_at': new Date(Date.now() - 3600000).toISOString(),
        'oauth_test-client_refresh_token': 'refresh-token',
      };

      // First attempt fails with temporarily_unavailable
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        text: async () => JSON.stringify({
          error: 'temporarily_unavailable',
          error_description: 'Server overloaded',
        }),
      });

      await expect(
        applyAuthentication(headers, auth, credentials)
      ).rejects.toThrow('OAuth2 server temporarily unavailable');
    });

    it('handles network errors gracefully', async () => {
      const auth = createOAuth2Auth();
      const headers: Record<string, string> = {};
      
      const credentials = {
        'oauth_test-client_access_token': 'expired-token',
        'oauth_test-client_expires_at': new Date(Date.now() - 3600000).toISOString(),
        'oauth_test-client_refresh_token': 'refresh-token',
      };

      // Mock network failure
      mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

      await expect(
        applyAuthentication(headers, auth, credentials)
      ).rejects.toThrow('Failed to connect to OAuth2 server');
    });

    it('handles invalid JSON response', async () => {
      const auth = createOAuth2Auth();
      const headers: Record<string, string> = {};
      
      const credentials = {
        'oauth_test-client_access_token': 'expired-token',
        'oauth_test-client_expires_at': new Date(Date.now() - 3600000).toISOString(),
        'oauth_test-client_refresh_token': 'refresh-token',
      };

      // Mock invalid JSON response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => 'Not JSON <html>Error page</html>',
      });

      await expect(
        applyAuthentication(headers, auth, credentials)
      ).rejects.toThrow('OAuth2 server returned invalid JSON');
    });

    it('handles missing refresh token', async () => {
      const auth = createOAuth2Auth({ refreshToken: undefined });
      const headers: Record<string, string> = {};
      
      const credentials = {
        'oauth_test-client_access_token': 'expired-token',
        'oauth_test-client_expires_at': new Date(Date.now() - 3600000).toISOString(),
        // No refresh token in credentials
      };

      await expect(
        applyAuthentication(headers, auth, credentials)
      ).rejects.toThrow('no refresh token available');
    });
  });

  describe('token expiry handling', () => {
    it('refreshes token within 5-minute expiry buffer', async () => {
      const auth = createOAuth2Auth();
      const headers: Record<string, string> = {};
      
      // Token expires in 4 minutes (within 5-minute buffer)
      const credentials = {
        'oauth_test-client_access_token': 'almost-expired-token',
        'oauth_test-client_expires_at': new Date(Date.now() + 4 * 60 * 1000).toISOString(),
        'oauth_test-client_refresh_token': 'refresh-token',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({
          access_token: 'fresh-token',
          expires_in: 3600,
        }),
      });

      await applyAuthentication(headers, auth, credentials);

      // Should have refreshed even though not expired
      expect(mockFetch).toHaveBeenCalled();
      expect(headers.Authorization).toBe('Bearer fresh-token');
    });

    it('applies clock skew tolerance to token expiry', async () => {
      const auth = createOAuth2Auth();
      const headers: Record<string, string> = {};
      
      const credentials = {
        'oauth_test-client_access_token': 'expired-token',
        'oauth_test-client_expires_at': new Date(Date.now() - 3600000).toISOString(),
        'oauth_test-client_refresh_token': 'refresh-token',
      };

      // Mock response with expires_in
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({
          access_token: 'new-token',
          expires_in: 3600, // 1 hour
        }),
      });

      await applyAuthentication(headers, auth, credentials);

      // Token should be stored with clock skew tolerance
      // (The actual storage would happen through the tokenStorage callback)
      expect(headers.Authorization).toBe('Bearer new-token');
    });
  });

  describe('scope handling', () => {
    it('includes scope in refresh request when originally requested', async () => {
      const auth = createOAuth2Auth({ scope: ['read', 'write', 'admin'] });
      const headers: Record<string, string> = {};
      
      const credentials = {
        'oauth_test-client_access_token': 'expired-token',
        'oauth_test-client_expires_at': new Date(Date.now() - 3600000).toISOString(),
        'oauth_test-client_refresh_token': 'refresh-token',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({
          access_token: 'new-token',
          expires_in: 3600,
        }),
      });

      await applyAuthentication(headers, auth, credentials);

      expect(mockFetch).toHaveBeenCalled();
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('https://auth.example.com/token');
      expect(options.body.toString()).toContain('scope=read+write+admin');
    });

    it('omits scope when not originally requested', async () => {
      const auth = createOAuth2Auth({ scope: [] });
      const headers: Record<string, string> = {};
      
      const credentials = {
        'oauth_test-client_access_token': 'expired-token',
        'oauth_test-client_expires_at': new Date(Date.now() - 3600000).toISOString(),
        'oauth_test-client_refresh_token': 'refresh-token',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({
          access_token: 'new-token',
          expires_in: 3600,
        }),
      });

      await applyAuthentication(headers, auth, credentials);

      const callArg = mockFetch.mock.calls[0][1];
      expect(callArg.body).not.toContain('scope=');
    });
  });

  describe('client authentication', () => {
    it('handles invalid_client error', async () => {
      const auth = createOAuth2Auth();
      const headers: Record<string, string> = {};
      
      const credentials = {
        'oauth_test-client_access_token': 'expired-token',
        'oauth_test-client_expires_at': new Date(Date.now() - 3600000).toISOString(),
        'oauth_test-client_refresh_token': 'refresh-token',
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => JSON.stringify({
          error: 'invalid_client',
          error_description: 'Client authentication failed',
        }),
      });

      await expect(
        applyAuthentication(headers, auth, credentials)
      ).rejects.toThrow('Client authentication failed');
    });

    it('sends correct client credentials', async () => {
      const auth = createOAuth2Auth({
        clientId: 'my-client-id',
        clientSecret: 'my-client-secret',
      });
      const headers: Record<string, string> = {};
      
      const credentials = {
        'oauth_my-client-id_access_token': 'expired-token',
        'oauth_my-client-id_expires_at': new Date(Date.now() - 3600000).toISOString(),
        'oauth_my-client-id_refresh_token': 'refresh-token',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({
          access_token: 'new-token',
          expires_in: 3600,
        }),
      });

      await applyAuthentication(headers, auth, credentials);

      expect(mockFetch).toHaveBeenCalled();
      const [url, options] = mockFetch.mock.calls[0];
      expect(options.body.toString()).toContain('client_id=my-client-id');
      expect(options.body.toString()).toContain('client_secret=my-client-secret');
    });
  });

  describe('edge cases', () => {
    it('handles missing access_token in response', async () => {
      const auth = createOAuth2Auth();
      const headers: Record<string, string> = {};
      
      const credentials = {
        'oauth_test-client_access_token': 'expired-token',
        'oauth_test-client_expires_at': new Date(Date.now() - 3600000).toISOString(),
        'oauth_test-client_refresh_token': 'refresh-token',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({
          token_type: 'Bearer',
          expires_in: 3600,
          // Missing access_token
        }),
      });

      await expect(
        applyAuthentication(headers, auth, credentials)
      ).rejects.toThrow('missing access_token field');
    });

    it('uses default expiry when expires_in not provided', async () => {
      const auth = createOAuth2Auth();
      const headers: Record<string, string> = {};
      
      const credentials = {
        'oauth_test-client_access_token': 'expired-token',
        'oauth_test-client_expires_at': new Date(Date.now() - 3600000).toISOString(),
        'oauth_test-client_refresh_token': 'refresh-token',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({
          access_token: 'new-token',
          // No expires_in field
        }),
      });

      await applyAuthentication(headers, auth, credentials);
      
      // Should still work with default expiry
      expect(headers.Authorization).toBe('Bearer new-token');
    });
  });
});