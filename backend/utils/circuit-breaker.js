import logger from './logger.js';

/**
 * Circuit Breaker implementation.
 * Prevents cascading failures by stopping calls to a failing external service.
 *
 * States:
 *   CLOSED   — normal operation, calls pass through
 *   OPEN     — service is failing, calls are rejected immediately
 *   HALF_OPEN — testing if service has recovered, one probe call allowed
 *
 * Requirements: 5.3 — Property 18: Circuit Breaker State Management
 */

const STATE = {
  CLOSED: 'CLOSED',
  OPEN: 'OPEN',
  HALF_OPEN: 'HALF_OPEN',
};

export class CircuitBreaker {
  /**
   * @param {string} name - Service name for logging
   * @param {Object} options
   * @param {number} options.failureThreshold  - Failures before opening (default: 5)
   * @param {number} options.resetTimeout      - ms before trying HALF_OPEN (default: 30000)
   * @param {number} options.monitoringPeriod  - ms window for counting failures (default: 60000)
   * @param {number} options.successThreshold  - Successes in HALF_OPEN to close (default: 2)
   */
  constructor(name, options = {}) {
    this.name = name;
    this.failureThreshold = options.failureThreshold ?? 5;
    this.resetTimeout = options.resetTimeout ?? 30_000;
    this.monitoringPeriod = options.monitoringPeriod ?? 60_000;
    this.successThreshold = options.successThreshold ?? 2;

    this.state = STATE.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = null;
    this.stats = { totalCalls: 0, failures: 0, successes: 0, rejections: 0 };
  }

  /**
   * Execute a function through the circuit breaker.
   * @param {Function} fn - Async function to execute
   * @returns {Promise<any>}
   * @throws {CircuitOpenError} when circuit is OPEN
   */
  async execute(fn) {
    this.stats.totalCalls++;

    if (this.state === STATE.OPEN) {
      // Check if reset timeout has elapsed
      if (Date.now() >= this.nextAttemptTime) {
        this._transitionTo(STATE.HALF_OPEN);
      } else {
        this.stats.rejections++;
        const err = new CircuitOpenError(
          `Circuit breaker [${this.name}] is OPEN. Next attempt at ${new Date(this.nextAttemptTime).toISOString()}`
        );
        logger.warn('Circuit breaker rejected call', {
          name: this.name,
          state: this.state,
          nextAttempt: this.nextAttemptTime,
        });
        throw err;
      }
    }

    try {
      const result = await fn();
      this._onSuccess();
      return result;
    } catch (err) {
      // Don't count CircuitOpenError as a failure
      if (err instanceof CircuitOpenError) throw err;
      this._onFailure(err);
      throw err;
    }
  }

  _onSuccess() {
    this.stats.successes++;
    this.failureCount = 0;

    if (this.state === STATE.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        this._transitionTo(STATE.CLOSED);
      }
    }
  }

  _onFailure(err) {
    this.stats.failures++;
    this.failureCount++;
    this.lastFailureTime = Date.now();

    logger.warn('Circuit breaker recorded failure', {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      threshold: this.failureThreshold,
      error: err.message,
    });

    if (this.state === STATE.HALF_OPEN) {
      // Any failure in HALF_OPEN reopens the circuit
      this._transitionTo(STATE.OPEN);
    } else if (this.state === STATE.CLOSED && this.failureCount >= this.failureThreshold) {
      this._transitionTo(STATE.OPEN);
    }
  }

  _transitionTo(newState) {
    const prevState = this.state;
    this.state = newState;

    if (newState === STATE.OPEN) {
      this.nextAttemptTime = Date.now() + this.resetTimeout;
      this.successCount = 0;
      logger.error('Circuit breaker OPENED', {
        name: this.name,
        failureCount: this.failureCount,
        nextAttempt: new Date(this.nextAttemptTime).toISOString(),
      });
    } else if (newState === STATE.HALF_OPEN) {
      this.successCount = 0;
      logger.info('Circuit breaker HALF_OPEN — probing service', { name: this.name });
    } else if (newState === STATE.CLOSED) {
      this.failureCount = 0;
      this.successCount = 0;
      this.nextAttemptTime = null;
      logger.info('Circuit breaker CLOSED — service recovered', { name: this.name });
    }
  }

  /** Get current circuit state and stats */
  getStatus() {
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      nextAttemptTime: this.nextAttemptTime,
      stats: { ...this.stats },
    };
  }

  /** Manually reset the circuit to CLOSED (for admin use) */
  reset() {
    this._transitionTo(STATE.CLOSED);
    logger.info('Circuit breaker manually reset', { name: this.name });
  }
}

export class CircuitOpenError extends Error {
  constructor(message) {
    super(message);
    this.name = 'CircuitOpenError';
    this.isOperational = true;
    this.statusCode = 503;
  }
}

// ─── Pre-configured breakers for external services ────────────────────────────

export const stripeCircuitBreaker = new CircuitBreaker('stripe', {
  failureThreshold: 3,
  resetTimeout: 60_000,   // 1 minute
  successThreshold: 2,
});

export const cloudinaryCircuitBreaker = new CircuitBreaker('cloudinary', {
  failureThreshold: 5,
  resetTimeout: 30_000,
  successThreshold: 2,
});

export const emailCircuitBreaker = new CircuitBreaker('email', {
  failureThreshold: 5,
  resetTimeout: 120_000,  // 2 minutes
  successThreshold: 1,
});

// Registry for health reporting
export const circuitBreakers = {
  stripe: stripeCircuitBreaker,
  cloudinary: cloudinaryCircuitBreaker,
  email: emailCircuitBreaker,
};

export default CircuitBreaker;
