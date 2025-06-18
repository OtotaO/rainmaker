/**
 * Circuit Breaker pattern implementation for HTTP requests.
 * 
 * This module prevents cascading failures by detecting when an external
 * service is failing and temporarily blocking requests to give it time
 * to recover. This is critical for:
 * 
 * 1. Preventing cascade failures when APIs are down
 * 2. Reducing load on struggling services
 * 3. Providing fast failure feedback
 * 4. Allowing graceful degradation
 * 
 * Circuit states:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Service is failing, requests are blocked
 * - HALF_OPEN: Testing if service has recovered
 * 
 * Design decisions:
 * - Per-host tracking (different APIs have different reliability)
 * - Sliding window for failure rate calculation
 * - Configurable thresholds and timeouts
 * - Exponential backoff for half-open retries
 * - In-memory storage (can be extended to Redis)
 */

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerConfig {
  /**
   * Failure rate threshold to open circuit (0-1)
   * Default: 0.5 (50% failure rate)
   */
  failureThreshold: number;
  
  /**
   * Minimum number of requests before calculating failure rate
   * Default: 10 requests
   */
  volumeThreshold: number;
  
  /**
   * Time window for tracking failures (ms)
   * Default: 60000 (1 minute)
   */
  windowDuration: number;
  
  /**
   * Time to wait before allowing test request (ms)
   * Default: 30000 (30 seconds)
   */
  cooldownPeriod: number;
  
  /**
   * Number of successful requests to close circuit
   * Default: 5
   */
  successThreshold: number;
  
  /**
   * Maximum cooldown period after repeated failures (ms)
   * Default: 300000 (5 minutes)
   */
  maxCooldownPeriod: number;
}

/**
 * Default circuit breaker configuration.
 * These values balance between protecting services and allowing recovery.
 */
export const DEFAULT_CIRCUIT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 0.5,
  volumeThreshold: 10,
  windowDuration: 60 * 1000, // 1 minute
  cooldownPeriod: 30 * 1000, // 30 seconds
  successThreshold: 5,
  maxCooldownPeriod: 5 * 60 * 1000, // 5 minutes
};

/**
 * Request outcome for tracking
 */
interface RequestOutcome {
  timestamp: number;
  success: boolean;
  errorCategory?: string;
}

/**
 * Circuit breaker state for a specific host
 */
interface CircuitBreakerState {
  state: CircuitState;
  lastStateChange: number;
  failureCount: number;
  successCount: number;
  consecutiveFailures: number;
  requests: RequestOutcome[];
  nextRetryTime?: number;
}

/**
 * Circuit breaker implementation with per-host tracking.
 * 
 * This implementation uses a sliding window to track failure rates
 * and implements the three-state circuit breaker pattern.
 */
export class CircuitBreaker {
  private circuits = new Map<string, CircuitBreakerState>();
  private config: CircuitBreakerConfig;
  
  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = { ...DEFAULT_CIRCUIT_CONFIG, ...config };
  }
  
  /**
   * Check if a request to the given host should be allowed.
   * 
   * @param host The hostname to check
   * @returns true if request should proceed, false if circuit is open
   */
  shouldAllowRequest(host: string): boolean {
    const circuit = this.getOrCreateCircuit(host);
    
    // Clean old requests outside the window
    this.cleanOldRequests(circuit);
    
    switch (circuit.state) {
      case CircuitState.CLOSED:
        return true;
        
      case CircuitState.OPEN:
        // Check if cooldown period has passed
        const now = Date.now();
        if (circuit.nextRetryTime && now >= circuit.nextRetryTime) {
          // Transition to half-open
          this.transitionState(circuit, CircuitState.HALF_OPEN);
          return true;
        }
        return false;
        
      case CircuitState.HALF_OPEN:
        // Allow one request through for testing
        return true;
    }
  }
  
  /**
   * Record the outcome of a request.
   * 
   * @param host The hostname
   * @param success Whether the request succeeded
   * @param errorCategory Optional error category for failure analysis
   */
  recordRequest(host: string, success: boolean, errorCategory?: string): void {
    const circuit = this.getOrCreateCircuit(host);
    const now = Date.now();
    
    // Add to request history
    circuit.requests.push({
      timestamp: now,
      success,
      errorCategory,
    });
    
    // Update counters
    if (success) {
      circuit.successCount++;
      circuit.consecutiveFailures = 0;
    } else {
      circuit.failureCount++;
      circuit.consecutiveFailures++;
    }
    
    // Clean old requests
    this.cleanOldRequests(circuit);
    
    // State transitions based on current state
    switch (circuit.state) {
      case CircuitState.CLOSED:
        // Check if we should open the circuit
        if (this.shouldOpenCircuit(circuit)) {
          this.transitionState(circuit, CircuitState.OPEN);
        }
        break;
        
      case CircuitState.HALF_OPEN:
        if (success) {
          circuit.successCount++;
          // Check if we've had enough successes to close
          if (circuit.successCount >= this.config.successThreshold) {
            this.transitionState(circuit, CircuitState.CLOSED);
          }
        } else {
          // Failed in half-open, return to open with increased cooldown
          this.transitionState(circuit, CircuitState.OPEN);
        }
        break;
        
      case CircuitState.OPEN:
        // Record the failure but stay open
        break;
    }
  }
  
  /**
   * Get the current state of a circuit.
   * 
   * @param host The hostname
   * @returns Current circuit state and metadata
   */
  getCircuitInfo(host: string): {
    state: CircuitState;
    failureRate: number;
    requestCount: number;
    lastStateChange: Date;
    nextRetryTime?: Date;
  } {
    const circuit = this.getOrCreateCircuit(host);
    this.cleanOldRequests(circuit);
    
    const requestCount = circuit.requests.length;
    const failureRate = requestCount > 0 
      ? circuit.requests.filter(r => !r.success).length / requestCount
      : 0;
    
    return {
      state: circuit.state,
      failureRate,
      requestCount,
      lastStateChange: new Date(circuit.lastStateChange),
      nextRetryTime: circuit.nextRetryTime ? new Date(circuit.nextRetryTime) : undefined,
    };
  }
  
  /**
   * Reset a circuit breaker for a specific host.
   * Useful for manual intervention or testing.
   * 
   * @param host The hostname to reset
   */
  reset(host: string): void {
    this.circuits.delete(host);
  }
  
  /**
   * Reset all circuit breakers.
   */
  resetAll(): void {
    this.circuits.clear();
  }
  
  /**
   * Get or create a circuit for a host.
   */
  private getOrCreateCircuit(host: string): CircuitBreakerState {
    let circuit = this.circuits.get(host);
    if (!circuit) {
      circuit = {
        state: CircuitState.CLOSED,
        lastStateChange: Date.now(),
        failureCount: 0,
        successCount: 0,
        consecutiveFailures: 0,
        requests: [],
      };
      this.circuits.set(host, circuit);
    }
    return circuit;
  }
  
  /**
   * Clean requests outside the time window.
   */
  private cleanOldRequests(circuit: CircuitBreakerState): void {
    const cutoff = Date.now() - this.config.windowDuration;
    circuit.requests = circuit.requests.filter(r => r.timestamp > cutoff);
  }
  
  /**
   * Check if circuit should be opened based on failure rate.
   */
  private shouldOpenCircuit(circuit: CircuitBreakerState): boolean {
    const requestCount = circuit.requests.length;
    
    // Need minimum volume
    if (requestCount < this.config.volumeThreshold) {
      return false;
    }
    
    // Calculate failure rate
    const failures = circuit.requests.filter(r => !r.success).length;
    const failureRate = failures / requestCount;
    
    return failureRate >= this.config.failureThreshold;
  }
  
  /**
   * Transition circuit to a new state.
   */
  private transitionState(circuit: CircuitBreakerState, newState: CircuitState): void {
    const oldState = circuit.state;
    circuit.state = newState;
    circuit.lastStateChange = Date.now();
    
    switch (newState) {
      case CircuitState.OPEN:
        // Calculate cooldown with exponential backoff
        // consecutiveFailures starts at 1 for first failure
        // So we want: 1st failure = 1x, 2nd = 2x, 3rd = 4x, etc.
        const backoffExponent = Math.max(0, circuit.consecutiveFailures - 1);
        const backoffMultiplier = Math.pow(2, Math.min(backoffExponent, 4)); // Cap at 2^4 = 16x
        const cooldown = Math.min(
          this.config.cooldownPeriod * backoffMultiplier,
          this.config.maxCooldownPeriod
        );
        circuit.nextRetryTime = Date.now() + cooldown;
        break;
        
      case CircuitState.CLOSED:
        // Reset counters
        circuit.failureCount = 0;
        circuit.successCount = 0;
        circuit.consecutiveFailures = 0;
        circuit.requests = [];
        circuit.nextRetryTime = undefined;
        break;
        
      case CircuitState.HALF_OPEN:
        // Reset success counter for testing
        circuit.successCount = 0;
        break;
    }
  }
  
  /**
   * Get statistics for monitoring.
   */
  getStats(): {
    totalCircuits: number;
    openCircuits: number;
    halfOpenCircuits: number;
    closedCircuits: number;
  } {
    let open = 0;
    let halfOpen = 0;
    let closed = 0;
    
    for (const circuit of this.circuits.values()) {
      switch (circuit.state) {
        case CircuitState.OPEN:
          open++;
          break;
        case CircuitState.HALF_OPEN:
          halfOpen++;
          break;
        case CircuitState.CLOSED:
          closed++;
          break;
      }
    }
    
    return {
      totalCircuits: this.circuits.size,
      openCircuits: open,
      halfOpenCircuits: halfOpen,
      closedCircuits: closed,
    };
  }
}

/**
 * Global circuit breaker instance.
 * In production, this should be replaced with a distributed solution.
 */
export const globalCircuitBreaker = new CircuitBreaker();