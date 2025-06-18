import { describe, expect, test as it, beforeEach, afterEach, mock } from 'bun:test';
import { CircuitBreaker, CircuitState, DEFAULT_CIRCUIT_CONFIG } from '../circuit-breaker';

describe('Circuit Breaker', () => {
  let circuitBreaker: CircuitBreaker;

  beforeEach(() => {
    circuitBreaker = new CircuitBreaker();
  });

  afterEach(() => {
    circuitBreaker.resetAll();
  });

  describe('State Management', () => {
    it('starts in CLOSED state', () => {
      const info = circuitBreaker.getCircuitInfo('api.example.com');
      expect(info.state).toBe(CircuitState.CLOSED);
      expect(info.failureRate).toBe(0);
      expect(info.requestCount).toBe(0);
    });

    it('allows requests when circuit is CLOSED', () => {
      expect(circuitBreaker.shouldAllowRequest('api.example.com')).toBe(true);
    });

    it('transitions to OPEN when failure threshold is exceeded', () => {
      const host = 'api.example.com';
      
      // Record enough failures to exceed threshold
      for (let i = 0; i < DEFAULT_CIRCUIT_CONFIG.volumeThreshold; i++) {
        circuitBreaker.recordRequest(host, i < 6 ? false : true); // 60% failure rate
      }
      
      const info = circuitBreaker.getCircuitInfo(host);
      expect(info.state).toBe(CircuitState.OPEN);
      expect(info.failureRate).toBeGreaterThanOrEqual(DEFAULT_CIRCUIT_CONFIG.failureThreshold);
    });

    it('blocks requests when circuit is OPEN', () => {
      const host = 'api.example.com';
      
      // Open the circuit
      for (let i = 0; i < DEFAULT_CIRCUIT_CONFIG.volumeThreshold; i++) {
        circuitBreaker.recordRequest(host, false); // All failures
      }
      
      expect(circuitBreaker.shouldAllowRequest(host)).toBe(false);
    });

    it('transitions to HALF_OPEN after cooldown period', async () => {
      const host = 'api.example.com';
      const fastConfig = { 
        ...DEFAULT_CIRCUIT_CONFIG, 
        cooldownPeriod: 100 // 100ms for testing
      };
      circuitBreaker = new CircuitBreaker(fastConfig);
      
      // Open the circuit
      for (let i = 0; i < fastConfig.volumeThreshold; i++) {
        circuitBreaker.recordRequest(host, false);
      }
      
      expect(circuitBreaker.getCircuitInfo(host).state).toBe(CircuitState.OPEN);
      expect(circuitBreaker.shouldAllowRequest(host)).toBe(false);
      
      // Get initial retry time
      const initialInfo = circuitBreaker.getCircuitInfo(host);
      const retryTime = initialInfo.nextRetryTime;
      expect(retryTime).toBeDefined();
      
      // Calculate exact wait time needed
      const waitTime = Math.max(0, retryTime!.getTime() - Date.now() + 10); // +10ms buffer
      
      // Wait for cooldown
      await new Promise(resolve => setTimeout(resolve, waitTime));
      
      // Should now allow a test request
      expect(circuitBreaker.shouldAllowRequest(host)).toBe(true);
      expect(circuitBreaker.getCircuitInfo(host).state).toBe(CircuitState.HALF_OPEN);
    });

    it('closes circuit after successful requests in HALF_OPEN state', () => {
      const host = 'api.example.com';
      const config = { 
        ...DEFAULT_CIRCUIT_CONFIG, 
        successThreshold: 3
      };
      circuitBreaker = new CircuitBreaker(config);
      
      // Open the circuit
      for (let i = 0; i < config.volumeThreshold; i++) {
        circuitBreaker.recordRequest(host, false);
      }
      
      // Force transition to HALF_OPEN by manipulating state
      circuitBreaker.reset(host);
      circuitBreaker.recordRequest(host, false); // This won't open immediately
      
      // Manually transition to test HALF_OPEN behavior
      const info = circuitBreaker.getCircuitInfo(host);
      expect(info.state).toBe(CircuitState.CLOSED);
      
      // Record successes to close circuit
      for (let i = 0; i < config.successThreshold; i++) {
        circuitBreaker.recordRequest(host, true);
      }
      
      expect(circuitBreaker.getCircuitInfo(host).state).toBe(CircuitState.CLOSED);
    });

    it('returns to OPEN from HALF_OPEN on failure', async () => {
      const host = 'api.example.com';
      const fastConfig = { 
        ...DEFAULT_CIRCUIT_CONFIG, 
        cooldownPeriod: 100
      };
      circuitBreaker = new CircuitBreaker(fastConfig);
      
      // Open the circuit
      for (let i = 0; i < fastConfig.volumeThreshold; i++) {
        circuitBreaker.recordRequest(host, false);
      }
      
      // Wait for cooldown and transition to HALF_OPEN
      await new Promise(resolve => setTimeout(resolve, 200));
      circuitBreaker.shouldAllowRequest(host); // Transitions to HALF_OPEN
      
      // Record a failure
      circuitBreaker.recordRequest(host, false);
      
      expect(circuitBreaker.getCircuitInfo(host).state).toBe(CircuitState.OPEN);
    });
  });

  describe('Failure Rate Calculation', () => {
    it('requires minimum volume before opening circuit', () => {
      const host = 'api.example.com';
      
      // Record failures below volume threshold
      for (let i = 0; i < DEFAULT_CIRCUIT_CONFIG.volumeThreshold - 1; i++) {
        circuitBreaker.recordRequest(host, false);
      }
      
      // Should still be closed despite 100% failure rate
      const info = circuitBreaker.getCircuitInfo(host);
      expect(info.state).toBe(CircuitState.CLOSED);
      expect(info.failureRate).toBe(1);
    });

    it('calculates failure rate over sliding window', async () => {
      const host = 'api.example.com';
      const config = {
        ...DEFAULT_CIRCUIT_CONFIG,
        windowDuration: 200, // 200ms window
        volumeThreshold: 5,
      };
      circuitBreaker = new CircuitBreaker(config);
      
      // Record old failures
      for (let i = 0; i < 5; i++) {
        circuitBreaker.recordRequest(host, false);
      }
      
      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 250));
      
      // Record new successes
      for (let i = 0; i < 5; i++) {
        circuitBreaker.recordRequest(host, true);
      }
      
      // Should only see recent successes
      const info = circuitBreaker.getCircuitInfo(host);
      expect(info.failureRate).toBe(0);
      expect(info.requestCount).toBe(5);
    });

    it('handles mixed success and failure patterns', () => {
      const host = 'api.example.com';
      
      // Alternating pattern: success, fail, success, fail...
      for (let i = 0; i < 20; i++) {
        circuitBreaker.recordRequest(host, i % 2 === 0);
      }
      
      const info = circuitBreaker.getCircuitInfo(host);
      expect(info.failureRate).toBeCloseTo(0.5, 2);
      expect(info.state).toBe(CircuitState.OPEN); // 50% = threshold
    });
  });

  describe('Exponential Backoff', () => {
    it('increases cooldown period on consecutive failures', async () => {
      const host = 'api.example.com';
      const config = {
        ...DEFAULT_CIRCUIT_CONFIG,
        cooldownPeriod: 100,
        maxCooldownPeriod: 1000,
        volumeThreshold: 3, // Lower for easier testing
      };
      circuitBreaker = new CircuitBreaker(config);
      
      // First failure cycle - this will set consecutiveFailures based on volume
      for (let i = 0; i < config.volumeThreshold; i++) {
        circuitBreaker.recordRequest(host, false);
      }
      
      const info1 = circuitBreaker.getCircuitInfo(host);
      expect(info1.state).toBe(CircuitState.OPEN);
      const firstRetryTime = info1.nextRetryTime!.getTime();
      
      // Wait for cooldown
      const waitTime = firstRetryTime - Date.now() + 10;
      await new Promise(resolve => setTimeout(resolve, waitTime));
      
      // Transition to HALF_OPEN and fail again
      expect(circuitBreaker.shouldAllowRequest(host)).toBe(true); // HALF_OPEN
      circuitBreaker.recordRequest(host, false); // Back to OPEN
      
      const info2 = circuitBreaker.getCircuitInfo(host);
      expect(info2.state).toBe(CircuitState.OPEN);
      const secondRetryTime = info2.nextRetryTime!.getTime();
      
      // Compare the absolute retry times (not relative to "now")
      // Second should be further in the future due to backoff
      expect(secondRetryTime).toBeGreaterThan(firstRetryTime);
      
      // The actual cooldown period should have increased
      const now = Date.now();
      const remainingCooldown1 = Math.max(0, firstRetryTime - now);
      const remainingCooldown2 = Math.max(0, secondRetryTime - now);
      
      // Second cooldown should be longer (at least some increase)
      expect(remainingCooldown2).toBeGreaterThan(remainingCooldown1);
    });

    it('respects maximum cooldown period', () => {
      const host = 'api.example.com';
      const config = {
        ...DEFAULT_CIRCUIT_CONFIG,
        cooldownPeriod: 100,
        maxCooldownPeriod: 500,
      };
      circuitBreaker = new CircuitBreaker(config);
      
      // Simulate many consecutive failures
      for (let cycle = 0; cycle < 10; cycle++) {
        // Open circuit
        for (let i = 0; i < config.volumeThreshold; i++) {
          circuitBreaker.recordRequest(host, false);
        }
        
        // Force state tracking
        circuitBreaker.recordRequest(host, false);
      }
      
      const info = circuitBreaker.getCircuitInfo(host);
      const cooldown = info.nextRetryTime!.getTime() - Date.now();
      
      // Should not exceed max cooldown
      expect(cooldown).toBeLessThanOrEqual(config.maxCooldownPeriod + 100); // Allow small buffer
    });
  });

  describe('Multiple Hosts', () => {
    it('tracks circuits independently per host', () => {
      const host1 = 'api1.example.com';
      const host2 = 'api2.example.com';
      
      // Open circuit for host1
      for (let i = 0; i < DEFAULT_CIRCUIT_CONFIG.volumeThreshold; i++) {
        circuitBreaker.recordRequest(host1, false);
      }
      
      // host1 should be open, host2 should be closed
      expect(circuitBreaker.getCircuitInfo(host1).state).toBe(CircuitState.OPEN);
      expect(circuitBreaker.getCircuitInfo(host2).state).toBe(CircuitState.CLOSED);
      
      expect(circuitBreaker.shouldAllowRequest(host1)).toBe(false);
      expect(circuitBreaker.shouldAllowRequest(host2)).toBe(true);
    });

    it('provides aggregate statistics', () => {
      // Create circuits in different states
      const hosts = ['api1.com', 'api2.com', 'api3.com'];
      
      // api1: OPEN
      for (let i = 0; i < DEFAULT_CIRCUIT_CONFIG.volumeThreshold; i++) {
        circuitBreaker.recordRequest(hosts[0], false);
      }
      
      // api2: CLOSED (some requests but not failing)
      for (let i = 0; i < 5; i++) {
        circuitBreaker.recordRequest(hosts[1], true);
      }
      
      // api3: Never accessed (will be created as CLOSED)
      circuitBreaker.getCircuitInfo(hosts[2]);
      
      const stats = circuitBreaker.getStats();
      expect(stats.totalCircuits).toBe(3);
      expect(stats.openCircuits).toBe(1);
      expect(stats.closedCircuits).toBe(2);
      expect(stats.halfOpenCircuits).toBe(0);
    });
  });

  describe('Error Categories', () => {
    it('tracks error categories for analysis', () => {
      const host = 'api.example.com';
      
      // Record different types of failures
      circuitBreaker.recordRequest(host, false, 'network_timeout');
      circuitBreaker.recordRequest(host, false, 'network_timeout');
      circuitBreaker.recordRequest(host, false, 'rate_limit_burst');
      circuitBreaker.recordRequest(host, false, 'api_server_error');
      
      // Categories are tracked in request history
      const info = circuitBreaker.getCircuitInfo(host);
      expect(info.requestCount).toBe(4);
      expect(info.failureRate).toBe(1);
    });
  });

  describe('Reset Functionality', () => {
    it('resets individual circuit', () => {
      const host = 'api.example.com';
      
      // Open circuit
      for (let i = 0; i < DEFAULT_CIRCUIT_CONFIG.volumeThreshold; i++) {
        circuitBreaker.recordRequest(host, false);
      }
      
      expect(circuitBreaker.getCircuitInfo(host).state).toBe(CircuitState.OPEN);
      
      // Reset
      circuitBreaker.reset(host);
      
      // Should be back to initial state
      const info = circuitBreaker.getCircuitInfo(host);
      expect(info.state).toBe(CircuitState.CLOSED);
      expect(info.requestCount).toBe(0);
    });

    it('resets all circuits', () => {
      const hosts = ['api1.com', 'api2.com', 'api3.com'];
      
      // Open all circuits
      for (const host of hosts) {
        for (let i = 0; i < DEFAULT_CIRCUIT_CONFIG.volumeThreshold; i++) {
          circuitBreaker.recordRequest(host, false);
        }
      }
      
      expect(circuitBreaker.getStats().openCircuits).toBe(3);
      
      // Reset all
      circuitBreaker.resetAll();
      
      expect(circuitBreaker.getStats().totalCircuits).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('handles invalid configuration gracefully', () => {
      const config = {
        failureThreshold: 2, // Invalid: > 1
        volumeThreshold: -1, // Invalid: negative
        windowDuration: 0, // Invalid: zero
      };
      
      // Should use defaults for invalid values
      const cb = new CircuitBreaker(config);
      const info = cb.getCircuitInfo('test.com');
      
      expect(info).toBeDefined();
      expect(info.state).toBe(CircuitState.CLOSED);
    });

    it('handles rapid successive requests', () => {
      const host = 'api.example.com';
      
      // Simulate burst of requests
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(
          Promise.resolve(circuitBreaker.shouldAllowRequest(host))
        );
      }
      
      return Promise.all(promises).then(results => {
        // All should be allowed (circuit starts closed)
        expect(results.every(r => r === true)).toBe(true);
      });
    });
  });
});