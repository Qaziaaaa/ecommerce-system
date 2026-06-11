import { describe, it, expect } from 'vitest';
import AuditLog from '../models/AuditLog.js';

describe('AuditLog Model', () => {
  describe('schema', () => {
    it('should have admin as required ref to User', () => {
      const path = AuditLog.schema.paths.admin;
      expect(path).toBeDefined();
      expect(path.instance).toBe('ObjectId');
      expect(path.options.ref).toBe('User');
      expect(path.options.required[0]).toBe(true);
    });

    it('should have action as required String with specific enum', () => {
      const path = AuditLog.schema.paths.action;
      expect(path).toBeDefined();
      expect(path.instance).toBe('String');
      expect(path.options.required[0]).toBe(true);
      expect(path.options.enum).toEqual([
        'USER_ROLE_CHANGED',
        'PRODUCT_CREATED',
        'PRODUCT_UPDATED',
        'PRODUCT_DELETED',
        'ORDER_STATUS_CHANGED',
        'CATEGORY_CREATED',
        'COUPON_CREATED',
        'COUPON_UPDATED',
        'COUPON_DELETED',
      ]);
    });

    it('should have targetModel as required String with specific enum', () => {
      const path = AuditLog.schema.paths.targetModel;
      expect(path).toBeDefined();
      expect(path.instance).toBe('String');
      expect(path.options.required[0]).toBe(true);
      expect(path.options.enum).toEqual(['User', 'Product', 'Order', 'Category', 'Coupon']);
    });

    it('should have targetId as required ObjectId', () => {
      const path = AuditLog.schema.paths.targetId;
      expect(path).toBeDefined();
      expect(path.instance).toBe('ObjectId');
      expect(path.options.required[0]).toBe(true);
    });

    it('should have changes as Mixed with default empty object', () => {
      const path = AuditLog.schema.paths.changes;
      expect(path).toBeDefined();
      expect(path.instance).toBe('Mixed');
    });

    it('should have description as required String', () => {
      const path = AuditLog.schema.paths.description;
      expect(path).toBeDefined();
      expect(path.instance).toBe('String');
      expect(path.options.required[0]).toBe(true);
    });

    it('should have ip as String', () => {
      const path = AuditLog.schema.paths.ip;
      expect(path).toBeDefined();
      expect(path.instance).toBe('String');
    });

    it('should have userAgent as String', () => {
      const path = AuditLog.schema.paths.userAgent;
      expect(path).toBeDefined();
      expect(path.instance).toBe('String');
    });

    it('should have timestamps enabled', () => {
      expect(AuditLog.schema.options.timestamps).toBe(true);
    });
  });

  describe('validation', () => {
    it('should fail if admin is missing', () => {
      const log = new AuditLog({ action: 'PRODUCT_CREATED', targetModel: 'Product', targetId: '507f1f77bcf86cd799439011', description: 'Created product' });
      const err = log.validateSync();
      expect(err.errors.admin).toBeDefined();
    });

    it('should fail if action is missing', () => {
      const log = new AuditLog({ admin: '507f1f77bcf86cd799439011', targetModel: 'Product', targetId: '507f1f77bcf86cd799439011', description: 'Test' });
      const err = log.validateSync();
      expect(err.errors.action).toBeDefined();
    });

    it('should fail if targetModel is missing', () => {
      const log = new AuditLog({ admin: '507f1f77bcf86cd799439011', action: 'PRODUCT_CREATED', targetId: '507f1f77bcf86cd799439011', description: 'Test' });
      const err = log.validateSync();
      expect(err.errors.targetModel).toBeDefined();
    });

    it('should fail if targetId is missing', () => {
      const log = new AuditLog({ admin: '507f1f77bcf86cd799439011', action: 'PRODUCT_CREATED', targetModel: 'Product', description: 'Test' });
      const err = log.validateSync();
      expect(err.errors.targetId).toBeDefined();
    });

    it('should fail if description is missing', () => {
      const log = new AuditLog({ admin: '507f1f77bcf86cd799439011', action: 'PRODUCT_CREATED', targetModel: 'Product', targetId: '507f1f77bcf86cd799439011' });
      const err = log.validateSync();
      expect(err.errors.description).toBeDefined();
    });

    it('should reject invalid action', () => {
      const log = new AuditLog({ admin: '507f1f77bcf86cd799439011', action: 'INVALID_ACTION', targetModel: 'Product', targetId: '507f1f77bcf86cd799439011', description: 'Test' });
      const err = log.validateSync();
      expect(err.errors.action).toBeDefined();
    });
  });

  describe('indexes', () => {
    it('should have compound index on admin and createdAt descending', () => {
      const index = AuditLog.schema.indexes().find(i => {
        const key = i[0];
        return key.admin === 1 && key.createdAt === -1;
      });
      expect(index).toBeDefined();
    });

    it('should have compound index on targetModel and targetId', () => {
      const index = AuditLog.schema.indexes().find(i => {
        const key = i[0];
        return key.targetModel === 1 && key.targetId === 1;
      });
      expect(index).toBeDefined();
    });

    it('should have index on action', () => {
      const index = AuditLog.schema.indexes().find(i => {
        const key = i[0];
        return key.action === 1 && Object.keys(key).length === 1;
      });
      expect(index).toBeDefined();
    });
  });
});
