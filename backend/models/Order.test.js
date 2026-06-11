import { describe, it, expect } from 'vitest';
import Order from '../models/Order.js';

describe('Order Model', () => {
  describe('schema', () => {
    it('should have user as required ref to User', () => {
      const path = Order.schema.paths.user;
      expect(path).toBeDefined();
      expect(path.instance).toBe('ObjectId');
      expect(path.options.ref).toBe('User');
      expect(path.options.required[0]).toBe(true);
    });

    it('should have orderItems array with product, quantity, price', () => {
      const path = Order.schema.paths.orderItems;
      expect(path).toBeDefined();
      expect(path.instance).toBe('Array');
    });

    it('should have totalAmount as required Number', () => {
      const path = Order.schema.paths.totalAmount;
      expect(path).toBeDefined();
      expect(path.instance).toBe('Number');
      expect(path.options.required[0]).toBe(true);
    });

    it('should have shippingAddress with subfields', () => {
      expect(Order.schema.paths['shippingAddress.street']).toBeDefined();
      expect(Order.schema.paths['shippingAddress.city']).toBeDefined();
      expect(Order.schema.paths['shippingAddress.state']).toBeDefined();
      expect(Order.schema.paths['shippingAddress.zipCode']).toBeDefined();
      expect(Order.schema.paths['shippingAddress.country']).toBeDefined();
    });

    it('should have paymentMethod as required String', () => {
      const path = Order.schema.paths.paymentMethod;
      expect(path).toBeDefined();
      expect(path.instance).toBe('String');
      expect(path.options.required[0]).toBe(true);
    });

    it('should have paymentStatus enum with pending/paid/failed and default pending', () => {
      const path = Order.schema.paths.paymentStatus;
      expect(path).toBeDefined();
      expect(path.instance).toBe('String');
      expect(path.options.enum).toEqual(['pending', 'paid', 'failed']);
      expect(path.options.default).toBe('pending');
    });

    it('should have orderStatus enum with all statuses and default pending', () => {
      const path = Order.schema.paths.orderStatus;
      expect(path).toBeDefined();
      expect(path.instance).toBe('String');
      expect(path.options.enum).toEqual(['pending', 'processing', 'shipped', 'delivered', 'cancelled']);
      expect(path.options.default).toBe('pending');
    });

    it('should have stripePaymentIntentId as unique sparse String', () => {
      const path = Order.schema.paths.stripePaymentIntentId;
      expect(path).toBeDefined();
      expect(path.instance).toBe('String');
      expect(path.options.unique).toBe(true);
      expect(path.options.sparse).toBe(true);
    });

    it('should have timestamps enabled', () => {
      expect(Order.schema.options.timestamps).toBe(true);
    });
  });

  describe('validation', () => {
    it('should fail if user is missing', () => {
      const order = new Order({ totalAmount: 100, paymentMethod: 'stripe' });
      const err = order.validateSync();
      expect(err.errors.user).toBeDefined();
    });

    it('should fail if totalAmount is missing', () => {
      const order = new Order({ user: '507f1f77bcf86cd799439011', paymentMethod: 'stripe' });
      const err = order.validateSync();
      expect(err.errors.totalAmount).toBeDefined();
    });

    it('should fail if paymentMethod is missing', () => {
      const order = new Order({ user: '507f1f77bcf86cd799439011', totalAmount: 100 });
      const err = order.validateSync();
      expect(err.errors.paymentMethod).toBeDefined();
    });

    it('should reject invalid paymentStatus', () => {
      const order = new Order({ user: '507f1f77bcf86cd799439011', totalAmount: 100, paymentMethod: 'stripe', paymentStatus: 'refunded' });
      const err = order.validateSync();
      expect(err.errors.paymentStatus).toBeDefined();
    });

    it('should reject invalid orderStatus', () => {
      const order = new Order({ user: '507f1f77bcf86cd799439011', totalAmount: 100, paymentMethod: 'stripe', orderStatus: 'returned' });
      const err = order.validateSync();
      expect(err.errors.orderStatus).toBeDefined();
    });
  });

  describe('indexes', () => {
    it('should have compound index on user and createdAt descending', () => {
      const index = Order.schema.indexes().find(i => {
        const key = i[0];
        return key.user === 1 && key.createdAt === -1;
      });
      expect(index).toBeDefined();
    });

    it('should have compound index on orderStatus and createdAt descending', () => {
      const index = Order.schema.indexes().find(i => {
        const key = i[0];
        return key.orderStatus === 1 && key.createdAt === -1;
      });
      expect(index).toBeDefined();
    });

    it('should have index on paymentStatus', () => {
      const index = Order.schema.indexes().find(i => {
        const key = i[0];
        return key.paymentStatus === 1 && Object.keys(key).length === 1;
      });
      expect(index).toBeDefined();
    });
  });
});
