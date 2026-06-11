import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validate, signupSchema, loginSchema, verifyOtpSchema } from './validation.middleware.js';

describe('validate', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockReq = { body: {}, query: {}, params: {} };
    mockRes = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    mockNext = vi.fn();
  });

  it('calls next when schema passes', () => {
    mockReq.body = { name: 'Test', email: 'test@test.com', phone: '1234567890' };
    validate(signupSchema)(mockReq, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalled();
  });

  it('returns 400 with errors when schema fails', () => {
    mockReq.body = { name: 'T' };
    validate(signupSchema)(mockReq, mockRes, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'fail', errors: expect.any(Array) })
    );
  });

  it('formats errors with path and message', () => {
    mockReq.body = { name: 'T' };
    validate(signupSchema)(mockReq, mockRes, mockNext);
    const call = mockRes.json.mock.calls[0][0];
    expect(call.errors[0]).toHaveProperty('path');
    expect(call.errors[0]).toHaveProperty('message');
  });
});

describe('signupSchema', () => {
  it('passes with valid data', () => {
    const result = signupSchema.safeParse({
      body: { name: 'Test User', email: 'test@test.com', phone: '1234567890' },
      query: {},
      params: {},
    });
    expect(result.success).toBe(true);
  });

  it('fails with short name', () => {
    const result = signupSchema.safeParse({
      body: { name: 'T', email: 'test@test.com', phone: '1234567890' },
      query: {},
      params: {},
    });
    expect(result.success).toBe(false);
  });

  it('fails with invalid email', () => {
    const result = signupSchema.safeParse({
      body: { name: 'Test User', email: 'not-an-email', phone: '1234567890' },
      query: {},
      params: {},
    });
    expect(result.success).toBe(false);
  });
});

describe('loginSchema', () => {
  it('passes with valid email', () => {
    const result = loginSchema.safeParse({
      body: { email: 'test@test.com' },
      query: {},
      params: {},
    });
    expect(result.success).toBe(true);
  });

  it('fails with missing email', () => {
    const result = loginSchema.safeParse({
      body: {},
      query: {},
      params: {},
    });
    expect(result.success).toBe(false);
  });
});

describe('verifyOtpSchema', () => {
  it('passes with valid email and 6-digit OTP', () => {
    const result = verifyOtpSchema.safeParse({
      body: { email: 'test@test.com', otp: '123456' },
      query: {},
      params: {},
    });
    expect(result.success).toBe(true);
  });

  it('fails with short OTP', () => {
    const result = verifyOtpSchema.safeParse({
      body: { email: 'test@test.com', otp: '123' },
      query: {},
      params: {},
    });
    expect(result.success).toBe(false);
  });
});
