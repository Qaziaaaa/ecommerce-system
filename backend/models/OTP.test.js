import { describe, it, expect } from 'vitest';
import OTP from '../models/OTP.js';

describe('OTP Model', () => {
  describe('schema', () => {
    it('should have email as required lowercase String', () => {
      const path = OTP.schema.paths.email;
      expect(path).toBeDefined();
      expect(path.instance).toBe('String');
      expect(path.options.required).toBe(true);
      expect(path.options.lowercase).toBe(true);
    });

    it('should have otp as required String', () => {
      const path = OTP.schema.paths.otp;
      expect(path).toBeDefined();
      expect(path.instance).toBe('String');
      expect(path.options.required).toBe(true);
    });

    it('should have expiresAt as required Date with TTL index', () => {
      const path = OTP.schema.paths.expiresAt;
      expect(path).toBeDefined();
      expect(path.instance).toBe('Date');
      expect(path.options.required).toBe(true);
    });

    it('should have attempts with default 0', () => {
      const path = OTP.schema.paths.attempts;
      expect(path).toBeDefined();
      expect(path.instance).toBe('Number');
      expect(path.options.default).toBe(0);
    });

    it('should have timestamps enabled', () => {
      expect(OTP.schema.options.timestamps).toBe(true);
    });
  });

  describe('validation', () => {
    it('should fail if email is missing', () => {
      const otp = new OTP({ otp: 'hashed123', expiresAt: new Date() });
      const err = otp.validateSync();
      expect(err.errors.email).toBeDefined();
    });

    it('should fail if otp is missing', () => {
      const otp = new OTP({ email: 'test@test.com', expiresAt: new Date() });
      const err = otp.validateSync();
      expect(err.errors.otp).toBeDefined();
    });

    it('should fail if expiresAt is missing', () => {
      const otp = new OTP({ email: 'test@test.com', otp: 'hashed123' });
      const err = otp.validateSync();
      expect(err.errors.expiresAt).toBeDefined();
    });
  });

  describe('TTL index', () => {
    it('should have TTL index on expiresAt', () => {
      const index = OTP.schema.indexes().find(i => {
        const key = i[0];
        return key.expiresAt === 1 && Object.keys(key).length === 1;
      });
      expect(index).toBeDefined();
      expect(index[1].expireAfterSeconds).toBe(0);
    });
  });
});
