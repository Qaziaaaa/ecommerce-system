import { describe, it, expect, beforeAll } from 'vitest';
import jwt from 'jsonwebtoken';
import { generateAccessToken, generateRefreshToken, verifyToken, verifyRefreshToken } from './jwt.util.js';

beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret-key';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key';
});

describe('jwt.util', () => {
  describe('generateAccessToken', () => {
    it('generates a valid JWT with userId and role', () => {
      const token = generateAccessToken('user123', 'admin');
      const decoded = jwt.verify(token, 'test-secret-key');
      expect(decoded.userId).toBe('user123');
      expect(decoded.role).toBe('admin');
    });

    it('expires in 15 minutes', () => {
      const token = generateAccessToken('user123', 'user');
      const decoded = jwt.decode(token);
      expect(decoded.exp - decoded.iat).toBe(15 * 60);
    });
  });

  describe('generateRefreshToken', () => {
    it('generates a valid JWT with userId', () => {
      const token = generateRefreshToken('user456');
      const decoded = jwt.verify(token, 'test-refresh-secret-key');
      expect(decoded.userId).toBe('user456');
      expect(decoded.role).toBeUndefined();
    });

    it('expires in 7 days', () => {
      const token = generateRefreshToken('user456');
      const decoded = jwt.decode(token);
      expect(decoded.exp - decoded.iat).toBe(7 * 24 * 60 * 60);
    });
  });

  describe('verifyToken', () => {
    it('returns decoded payload for valid token', () => {
      const token = generateAccessToken('user789', 'user');
      const decoded = verifyToken(token);
      expect(decoded.userId).toBe('user789');
    });

    it('throws for invalid secret', () => {
      const token = jwt.sign({ userId: 'x' }, 'wrong-secret', { expiresIn: '15m' });
      expect(() => verifyToken(token)).toThrow();
    });

    it('throws for expired token', () => {
      const token = jwt.sign({ userId: 'x' }, 'test-secret-key', { expiresIn: '0s' });
      expect(() => verifyToken(token)).toThrow();
    });
  });

  describe('verifyRefreshToken', () => {
    it('returns decoded payload for valid refresh token', () => {
      const token = generateRefreshToken('user789');
      const decoded = verifyRefreshToken(token);
      expect(decoded.userId).toBe('user789');
    });

    it('throws for invalid secret', () => {
      const token = jwt.sign({ userId: 'x' }, 'wrong-secret', { expiresIn: '7d' });
      expect(() => verifyRefreshToken(token)).toThrow();
    });
  });
});
