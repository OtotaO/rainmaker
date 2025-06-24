import { describe, expect, it } from 'bun:test';
import { applyAuth, calculateBackoff, categorizeHttpError } from '../http-core';

describe('http-core', () => {
  describe('categorizeHttpError', () => {
    it('should categorize network errors', () => {
      const error = new TypeError('Failed to fetch');
      const result = categorizeHttpError(error);

      expect(result.category).toBe('network_connection_refused');
      expect(result.retryable).toBe(true);
    });

    it('should categorize 401 as auth error', () => {
      const result = categorizeHttpError(new Error('Unauthorized'), 401);

      expect(result.category).toBe('auth_invalid');
      expect(result.retryable).toBe(false);
      expect(result.statusCode).toBe(401);
    });

    it('should categorize 429 as rate limit', () => {
      const result = categorizeHttpError(new Error('Too Many Requests'), 429);

      expect(result.category).toBe('rate_limit_burst');
      expect(result.retryable).toBe(true);
    });

    it('should categorize 5xx as server errors', () => {
      const result = categorizeHttpError(new Error('Server Error'), 503);

      expect(result.category).toBe('api_unexpected_status');
      expect(result.retryable).toBe(true);
      expect(result.message).toContain('503');
    });

    it('should categorize 4xx as validation errors', () => {
      const result = categorizeHttpError(new Error('Bad Request'), 400);

      expect(result.category).toBe('validation_failed');
      expect(result.retryable).toBe(false);
    });
  });

  describe('applyAuth', () => {
    it('should apply bearer token', () => {
      const headers = { 'Content-Type': 'application/json' };
      const result = applyAuth(headers, {
        type: 'bearer',
        token: 'my-token',
      });

      expect(result['Authorization']).toBe('Bearer my-token');
      expect(result['Content-Type']).toBe('application/json');
    });

    it('should apply API key', () => {
      const headers = {};
      const result = applyAuth(headers, {
        type: 'api_key',
        header: 'X-API-Key',
        value: 'secret-key',
      });

      expect(result['X-API-Key']).toBe('secret-key');
    });

    it('should apply basic auth', () => {
      const headers = {};
      const result = applyAuth(headers, {
        type: 'basic',
        username: 'user',
        password: 'pass',
      });

      const expectedToken = btoa('user:pass');
      expect(result['Authorization']).toBe(`Basic ${expectedToken}`);
    });

    it('should return unchanged headers if no auth', () => {
      const headers = { 'Content-Type': 'application/json' };
      const result = applyAuth(headers, undefined);

      expect(result).toEqual(headers);
    });
  });

  describe('calculateBackoff', () => {
    it('should calculate exponential backoff', () => {
      expect(calculateBackoff(1, 1000)).toBe(1000);
      expect(calculateBackoff(2, 1000)).toBe(2000);
      expect(calculateBackoff(3, 1000)).toBe(4000);
      expect(calculateBackoff(4, 1000)).toBe(8000);
    });

    it('should respect max delay', () => {
      expect(calculateBackoff(10, 1000, 5000)).toBe(5000);
    });

    it('should use custom multiplier', () => {
      expect(calculateBackoff(3, 1000, 30000, 3)).toBe(9000);
    });
  });
});
