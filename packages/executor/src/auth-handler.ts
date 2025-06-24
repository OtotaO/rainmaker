/**
 * Authentication handler for OAuth2 client credentials
 * Simplified token management without external dependencies
 */

import type { Authentication } from '@rainmaker/schema/types/execution';
import type { FetchFunction } from './http-core';

// Token cache entry
interface TokenCacheEntry {
  token: string;
  expiresAt: number; // Unix timestamp
  scope?: string[];
}

// Simple in-memory token cache
const tokenCache = new Map<string, TokenCacheEntry>();

// Generate cache key for OAuth2 config
function getCacheKey(auth: Extract<Authentication, { type: 'oauth2_client_credentials' }>): string {
  return `${auth.clientId}:${auth.tokenUrl}:${(auth.scope || []).join(',')}`;
}

// Exchange OAuth2 client credentials for access token
async function exchangeClientCredentials(
  auth: Extract<Authentication, { type: 'oauth2_client_credentials' }>,
  fetchFn: FetchFunction = fetch,
): Promise<TokenCacheEntry> {
  const params = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: auth.clientId,
    client_secret: auth.clientSecret,
  });

  if (auth.scope?.length) {
    params.set('scope', auth.scope.join(' '));
  }

  const response = await fetchFn(auth.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OAuth2 token exchange failed: ${response.status} ${errorText}`);
  }

  const data = (await response.json()) as {
    access_token: string;
    expires_in?: number;
    scope?: string;
  };

  // Calculate expiration (default to 1 hour if not provided)
  const expiresIn = data.expires_in || 3600;
  const expiresAt = Date.now() + expiresIn * 1000 - 60000; // 1 minute buffer

  return {
    token: data.access_token,
    expiresAt,
    scope: data.scope?.split(' ') || [],
  };
}

// Get OAuth2 token with caching
export async function getOAuth2Token(
  auth: Extract<Authentication, { type: 'oauth2_client_credentials' }>,
  fetchFn: FetchFunction = fetch,
): Promise<string> {
  const cacheKey = getCacheKey(auth);
  const cached = tokenCache.get(cacheKey);

  // Return cached token if still valid
  if (cached && cached.expiresAt > Date.now()) {
    return cached.token;
  }

  // Exchange for new token
  const tokenEntry = await exchangeClientCredentials(auth, fetchFn);
  tokenCache.set(cacheKey, tokenEntry);

  return tokenEntry.token;
}

// Apply authentication to headers
export async function applyAuthentication(
  headers: Record<string, string>,
  auth?: Authentication,
  fetchFn: FetchFunction = fetch,
): Promise<Record<string, string>> {
  if (!auth) return headers;

  switch (auth.type) {
    case 'bearer':
      return { ...headers, Authorization: `Bearer ${auth.token}` };

    case 'api_key':
      return { ...headers, [auth.header]: auth.value };

    case 'basic': {
      const encoded = btoa(`${auth.username}:${auth.password}`);
      return { ...headers, Authorization: `Basic ${encoded}` };
    }

    case 'oauth2_client_credentials': {
      const token = await getOAuth2Token(auth, fetchFn);
      return { ...headers, Authorization: `Bearer ${token}` };
    }

    default:
      return headers;
  }
}

// Clear token cache (useful for testing or forced refresh)
export function clearTokenCache(): void {
  tokenCache.clear();
}

// Remove expired tokens from cache
export function cleanupExpiredTokens(): void {
  const now = Date.now();
  for (const [key, entry] of tokenCache.entries()) {
    if (entry.expiresAt <= now) {
      tokenCache.delete(key);
    }
  }
}
