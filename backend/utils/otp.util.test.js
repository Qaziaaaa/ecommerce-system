import { describe, it, expect } from 'vitest';
import { generateOTP, hashOTP } from './otp.util.js';

describe('generateOTP', () => {
  it('returns a 6-digit string', () => {
    const otp = generateOTP();
    expect(otp).toMatch(/^\d{6}$/);
  });

  it('returns a number between 100000 and 999999', () => {
    const otp = Number(generateOTP());
    expect(otp).toBeGreaterThanOrEqual(100000);
    expect(otp).toBeLessThanOrEqual(999999);
  });

  it('produces different values on successive calls', () => {
    const a = generateOTP();
    const b = generateOTP();
    // Extremely unlikely to collide with 6-digit random
    expect(a).not.toBe(b);
  });
});

describe('hashOTP', () => {
  it('returns a hex string', () => {
    const hash = hashOTP('123456');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('produces consistent hashes for same input', () => {
    expect(hashOTP('123456')).toBe(hashOTP('123456'));
  });

  it('produces different hashes for different inputs', () => {
    expect(hashOTP('123456')).not.toBe(hashOTP('654321'));
  });
});
