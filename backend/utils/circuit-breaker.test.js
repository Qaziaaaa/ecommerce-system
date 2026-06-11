import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), child: vi.fn(() => mockLogger) };
vi.mock('./logger.js', () => ({ default: mockLogger, childLogger: vi.fn(() => mockLogger) }));

let CircuitBreaker, CircuitOpenError, breakers;

beforeEach(async () => {
  vi.clearAllMocks();
  const mod = await import('./circuit-breaker.js');
  CircuitBreaker = mod.CircuitBreaker;
  CircuitOpenError = mod.CircuitOpenError;
  breakers = mod;
});

describe('CircuitBreaker', () => {
  it('starts in CLOSED state', () => {
    const cb = new CircuitBreaker('test', { failureThreshold: 2, resetTimeout: 1000 });
    expect(cb.state).toBe('CLOSED');
  });

  it('executes a successful function', async () => {
    const cb = new CircuitBreaker('test');
    const fn = vi.fn().mockResolvedValue('ok');
    const result = await cb.execute(fn);
    expect(result).toBe('ok');
    expect(cb.stats.totalCalls).toBe(1);
    expect(cb.stats.successes).toBe(1);
  });

  it('opens circuit after failure threshold reached', async () => {
    const cb = new CircuitBreaker('test', { failureThreshold: 2, resetTimeout: 1000 });
    const fn = vi.fn().mockRejectedValue(new Error('fail'));
    await expect(cb.execute(fn)).rejects.toThrow('fail');
    expect(cb.state).toBe('CLOSED');
    await expect(cb.execute(fn)).rejects.toThrow('fail');
    expect(cb.state).toBe('OPEN');
  });

  it('rejects calls when circuit is OPEN', async () => {
    const cb = new CircuitBreaker('test', { failureThreshold: 1, resetTimeout: 60000 });
    const fn = vi.fn().mockRejectedValue(new Error('fail'));
    await expect(cb.execute(fn)).rejects.toThrow('fail');
    expect(cb.state).toBe('OPEN');
    await expect(cb.execute(vi.fn())).rejects.toThrow(CircuitOpenError);
    expect(cb.stats.rejections).toBe(1);
  });

  it('transitions to HALF_OPEN after resetTimeout', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
    const cb = new CircuitBreaker('test', { failureThreshold: 1, resetTimeout: 5000, successThreshold: 1 });
    const failFn = vi.fn().mockRejectedValue(new Error('fail'));
    await expect(cb.execute(failFn)).rejects.toThrow('fail');
    expect(cb.state).toBe('OPEN');
    vi.advanceTimersByTime(5000);
    // Next execute triggers the HALF_OPEN transition then closes on success
    const okFn = vi.fn().mockResolvedValue('ok');
    const result = await cb.execute(okFn);
    expect(result).toBe('ok');
    expect(cb.state).toBe('CLOSED');
    vi.useRealTimers();
  });

  it('closes circuit after successThreshold successes in HALF_OPEN', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
    const cb = new CircuitBreaker('test', { failureThreshold: 1, resetTimeout: 100, successThreshold: 1 });
    const failFn = vi.fn().mockRejectedValue(new Error('fail'));
    await expect(cb.execute(failFn)).rejects.toThrow('fail');
    expect(cb.state).toBe('OPEN');
    vi.advanceTimersByTime(100);
    const successFn = vi.fn().mockResolvedValue('ok');
    await cb.execute(successFn);
    expect(cb.state).toBe('CLOSED');
    vi.useRealTimers();
  });

  it('reopens if HALF_OPEN call fails', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
    const cb = new CircuitBreaker('test', { failureThreshold: 1, resetTimeout: 100, successThreshold: 1 });
    await expect(cb.execute(vi.fn().mockRejectedValue(new Error('fail')))).rejects.toThrow('fail');
    expect(cb.state).toBe('OPEN');
    vi.advanceTimersByTime(100);
    await expect(cb.execute(vi.fn().mockRejectedValue(new Error('fail2')))).rejects.toThrow('fail2');
    expect(cb.state).toBe('OPEN');
    vi.useRealTimers();
  });

  it('getStatus returns current state and stats', () => {
    const cb = new CircuitBreaker('test');
    const status = cb.getStatus();
    expect(status.name).toBe('test');
    expect(status.state).toBe('CLOSED');
    expect(status.stats).toBeDefined();
  });

  it('reset transitions back to CLOSED', () => {
    const cb = new CircuitBreaker('test', { failureThreshold: 1, resetTimeout: 60000 });
    cb.state = 'OPEN';
    cb.reset();
    expect(cb.state).toBe('CLOSED');
  });
});

describe('CircuitOpenError', () => {
  it('has isOperational and statusCode 503', () => {
    const err = new CircuitOpenError('test');
    expect(err.message).toBe('test');
    expect(err.isOperational).toBe(true);
    expect(err.statusCode).toBe(503);
  });
});

describe('Pre-configured breakers', () => {
  it('exports stripe, cloudinary, email breakers', () => {
    expect(breakers.stripeCircuitBreaker.name).toBe('stripe');
    expect(breakers.cloudinaryCircuitBreaker.name).toBe('cloudinary');
    expect(breakers.emailCircuitBreaker.name).toBe('email');
  });

  it('exports registry with all breakers', () => {
    expect(breakers.circuitBreakers.stripe).toBe(breakers.stripeCircuitBreaker);
    expect(breakers.circuitBreakers.cloudinary).toBe(breakers.cloudinaryCircuitBreaker);
    expect(breakers.circuitBreakers.email).toBe(breakers.emailCircuitBreaker);
  });
});
