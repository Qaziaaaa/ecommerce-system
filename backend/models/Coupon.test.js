import { describe, it, expect } from 'vitest';
import Coupon from '../models/Coupon.js';

describe('Coupon Model', () => {
  describe('schema', () => {
    it('should have code as required unique uppercase trimmed String', () => {
      const path = Coupon.schema.paths.code;
      expect(path).toBeDefined();
      expect(path.instance).toBe('String');
      expect(path.options.required[0]).toBe(true);
      expect(path.options.unique).toBe(true);
      expect(path.options.uppercase).toBe(true);
      expect(path.options.trim).toBe(true);
    });

    it('should have discountType as required enum with percentage and fixed', () => {
      const path = Coupon.schema.paths.discountType;
      expect(path).toBeDefined();
      expect(path.instance).toBe('String');
      expect(path.options.required[0]).toBe(true);
      expect(path.options.enum).toEqual(['percentage', 'fixed']);
    });

    it('should have discountValue as required Number', () => {
      const path = Coupon.schema.paths.discountValue;
      expect(path).toBeDefined();
      expect(path.instance).toBe('Number');
      expect(path.options.required[0]).toBe(true);
    });

    it('should have minOrderValue with default 0', () => {
      const path = Coupon.schema.paths.minOrderValue;
      expect(path).toBeDefined();
      expect(path.instance).toBe('Number');
      expect(path.options.default).toBe(0);
    });

    it('should have expiryDate as required Date', () => {
      const path = Coupon.schema.paths.expiryDate;
      expect(path).toBeDefined();
      expect(path.instance).toBe('Date');
      expect(path.options.required[0]).toBe(true);
    });

    it('should have usageLimit with default null', () => {
      const path = Coupon.schema.paths.usageLimit;
      expect(path).toBeDefined();
      expect(path.instance).toBe('Number');
      expect(path.options.default).toBe(null);
    });

    it('should have usedCount with default 0', () => {
      const path = Coupon.schema.paths.usedCount;
      expect(path).toBeDefined();
      expect(path.instance).toBe('Number');
      expect(path.options.default).toBe(0);
    });

    it('should have isActive with default true', () => {
      const path = Coupon.schema.paths.isActive;
      expect(path).toBeDefined();
      expect(path.instance).toBe('Boolean');
      expect(path.options.default).toBe(true);
    });

    it('should have timestamps enabled', () => {
      expect(Coupon.schema.options.timestamps).toBe(true);
    });
  });

  describe('validation', () => {
    it('should fail if code is missing', () => {
      const coupon = new Coupon({ discountType: 'percentage', discountValue: 10, expiryDate: new Date() });
      const err = coupon.validateSync();
      expect(err.errors.code).toBeDefined();
    });

    it('should fail if discountType is missing', () => {
      const coupon = new Coupon({ code: 'SAVE10', discountValue: 10, expiryDate: new Date() });
      const err = coupon.validateSync();
      expect(err.errors.discountType).toBeDefined();
    });

    it('should fail if discountValue is missing', () => {
      const coupon = new Coupon({ code: 'SAVE10', discountType: 'percentage', expiryDate: new Date() });
      const err = coupon.validateSync();
      expect(err.errors.discountValue).toBeDefined();
    });

    it('should fail if expiryDate is missing', () => {
      const coupon = new Coupon({ code: 'SAVE10', discountType: 'percentage', discountValue: 10 });
      const err = coupon.validateSync();
      expect(err.errors.expiryDate).toBeDefined();
    });

    it('should reject invalid discountType', () => {
      const coupon = new Coupon({ code: 'SAVE10', discountType: 'invalid', discountValue: 10, expiryDate: new Date() });
      const err = coupon.validateSync();
      expect(err.errors.discountType).toBeDefined();
    });
  });

  describe('indexes', () => {
    it('should have index on expiryDate', () => {
      const index = Coupon.schema.indexes().find(i => {
        const key = i[0];
        return key.expiryDate === 1 && Object.keys(key).length === 1;
      });
      expect(index).toBeDefined();
    });
  });
});
