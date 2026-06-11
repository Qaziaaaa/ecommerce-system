import { describe, it, expect } from 'vitest';
import AppError from './AppError.js';

describe('AppError', () => {
  it('creates an error with message and status code', () => {
    const err = new AppError('Not found', 404);
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe('Not found');
    expect(err.statusCode).toBe(404);
  });

  it('sets status to "fail" for 4xx codes', () => {
    const err = new AppError('Bad request', 400);
    expect(err.status).toBe('fail');
  });

  it('sets status to "error" for 5xx codes', () => {
    const err = new AppError('Server error', 500);
    expect(err.status).toBe('error');
  });

  it('sets isOperational to true', () => {
    const err = new AppError('Any', 400);
    expect(err.isOperational).toBe(true);
  });

  it('captures stack trace', () => {
    const err = new AppError('Stack', 422);
    expect(err.stack).toBeTruthy();
  });
});
