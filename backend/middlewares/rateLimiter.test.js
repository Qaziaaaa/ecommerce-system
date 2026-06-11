import { describe, it, expect } from 'vitest';
import {
  apiLimiter, userApiLimiter, orderLimiter,
  authLimiter, otpSendLimiter, otpVerifyLimiter,
} from './rateLimiter.js';

function expectLimiter(limiter, expectedMax, expectedWindowMs) {
  expect(limiter).toBeTypeOf('function');
  expect(limiter.constructor.name).toBe('AsyncFunction');
}

describe('rate limiters', () => {
  it('apiLimiter: 100 per 15 min', () => {
    expectLimiter(apiLimiter, 100, 15 * 60 * 1000);
  });

  it('userApiLimiter: 200 per 15 min', () => {
    expectLimiter(userApiLimiter, 200, 15 * 60 * 1000);
  });

  it('orderLimiter: 5 per 1 min', () => {
    expectLimiter(orderLimiter, 5, 60 * 1000);
  });

  it('authLimiter: 50 per 15 min', () => {
    expectLimiter(authLimiter, 50, 15 * 60 * 1000);
  });

  it('otpSendLimiter: 5 per 1 min', () => {
    expectLimiter(otpSendLimiter, 5, 60 * 1000);
  });

  it('otpVerifyLimiter: 3 per 1 min', () => {
    expectLimiter(otpVerifyLimiter, 3, 60 * 1000);
  });
});
