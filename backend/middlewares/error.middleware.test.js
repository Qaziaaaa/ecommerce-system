import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../utils/logger.js', () => ({
  default: { error: vi.fn(), warn: vi.fn() },
}));

import { globalErrorHandler } from './error.middleware.js';

let mockReq, mockRes;

beforeEach(() => {
  mockReq = {
    requestId: 'req-123',
    originalUrl: '/api/v1/products',
    method: 'GET',
    ip: '127.0.0.1',
    get: vi.fn(() => 'test-agent'),
  };
  mockRes = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  };
});

function runHandler(err) {
  globalErrorHandler(err, mockReq, mockRes, vi.fn());
  return mockRes.json.mock.calls[0][0];
}

describe('globalErrorHandler', () => {
  it('handles AppError with 4xx status', () => {
    const body = runHandler({ message: 'Not found', statusCode: 404, status: 'fail' });
    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(body.message).toBe('Not found');
    expect(body.status).toBe('fail');
  });

  it('handles AppError with 5xx status', () => {
    const body = runHandler({ message: 'Server error', statusCode: 500, status: 'error', isOperational: true });
    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(body.message).toBe('Server error');
  });

  it('defaults to 500 and "error" when no statusCode on err', () => {
    const body = runHandler({ message: 'crash' });
    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(body.status).toBe('error');
  });

  it('uses default message when none provided', () => {
    const body = runHandler({ isOperational: true });
    expect(body.message).toBe('Something went wrong');
  });

  it('maps CastError to 400', () => {
    const body = runHandler({ name: 'CastError', path: 'productId', value: 'abc', message: 'Cast error' });
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(body.message).toContain('productId');
    expect(body.code).toBe('INVALID_ID');
  });

  it('maps duplicate key error (code 11000) to 409', () => {
    const body = runHandler({ code: 11000, keyValue: { email: 'test@test.com' }, message: 'dup' });
    expect(mockRes.status).toHaveBeenCalledWith(409);
    expect(body.message).toContain('Duplicate');
    expect(body.code).toBe('DUPLICATE_FIELD');
  });

  it('maps ValidationError to 422 with field errors', () => {
    const body = runHandler({
      name: 'ValidationError',
      message: 'Validation failed',
      errors: {
        name: { path: 'name', message: 'Name is required' },
        price: { path: 'price', message: 'Price must be positive' },
      },
    });
    expect(mockRes.status).toHaveBeenCalledWith(422);
    expect(body.code).toBe('VALIDATION_ERROR');
    expect(body.errors).toHaveLength(2);
  });

  it('maps JsonWebTokenError to 401', () => {
    const body = runHandler({ name: 'JsonWebTokenError', message: 'jwt malformed' });
    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(body.code).toBe('INVALID_TOKEN');
  });

  it('maps TokenExpiredError to 401', () => {
    const body = runHandler({ name: 'TokenExpiredError', message: 'jwt expired' });
    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(body.code).toBe('TOKEN_EXPIRED');
  });

  it('maps MulterError to 400', () => {
    const body = runHandler({ name: 'MulterError', message: 'File too large', code: 'LIMIT_FILE_SIZE' });
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(body.code).toBe('UPLOAD_ERROR');
  });

  it('includes requestId in response', () => {
    const body = runHandler({ message: 'err', statusCode: 400, status: 'fail' });
    expect(body.requestId).toBe('req-123');
  });

  it('includes timestamp in response', () => {
    const body = runHandler({ message: 'err', statusCode: 400, status: 'fail' });
    expect(body.timestamp).toBeDefined();
  });

  it('includes error stack in development', () => {
    process.env.NODE_ENV = 'development';
    const err = new Error('dev test');
    err.statusCode = 400;
    err.status = 'fail';
    const body = runHandler(err);
    expect(body.stack).toBeDefined();
    delete process.env.NODE_ENV;
  });

  it('hides internal details for non-operational 5xx in production', () => {
    process.env.NODE_ENV = 'production';
    const body = runHandler({ message: 'Internal details', statusCode: 500, isOperational: false });
    expect(body.message).toBe('Something went wrong. Please try again later.');
    expect(body.code).toBe('INTERNAL_ERROR');
    delete process.env.NODE_ENV;
  });
});
