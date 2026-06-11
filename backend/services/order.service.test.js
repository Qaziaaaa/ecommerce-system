import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../models/Order.js', () => ({
  default: Object.assign(
    vi.fn(function(data) { return Object.assign({ save: vi.fn().mockResolvedValue(true) }, data); }),
    { find: vi.fn(), findById: vi.fn(), findByIdAndUpdate: vi.fn(), findByIdAndDelete: vi.fn(), countDocuments: vi.fn() }
  ),
}));
vi.mock('../models/User.js', () => ({ default: { findOne: vi.fn(), create: vi.fn() } }));
vi.mock('../models/Product.js', () => ({ default: { find: vi.fn(), bulkWrite: vi.fn() } }));
vi.mock('../models/Coupon.js', () => ({ default: { findOne: vi.fn() } }));

vi.mock('../utils/logger.js', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));

let orderService, Order, User, Product, Coupon;

beforeEach(async () => {
  vi.clearAllMocks();
  Order = (await import('../models/Order.js')).default;
  User = (await import('../models/User.js')).default;
  Product = (await import('../models/Product.js')).default;
  Coupon = (await import('../models/Coupon.js')).default;
  orderService = await import('./order.service.js');
});

describe('calculateOrderAmountService', () => {
  it('throws for empty cart', async () => {
    await expect(orderService.calculateOrderAmountService([])).rejects.toThrow('Your cart is empty');
  });

  it('calculates total amount for valid items', async () => {
    Product.find.mockResolvedValue([{ _id: 'p1', isActive: true, stock: 10, price: 100, discountPrice: null, name: 'P1' }]);
    const total = await orderService.calculateOrderAmountService([{ product: 'p1', quantity: 2 }]);
    expect(total).toBe(200);
  });

  it('uses discountPrice if available', async () => {
    Product.find.mockResolvedValue([{ _id: 'p1', isActive: true, stock: 10, price: 100, discountPrice: 80, name: 'P1' }]);
    const total = await orderService.calculateOrderAmountService([{ product: 'p1', quantity: 3 }]);
    expect(total).toBe(240);
  });

  it('applies coupon discount', async () => {
    Product.find.mockResolvedValue([{ _id: 'p1', isActive: true, stock: 10, price: 100, discountPrice: null, name: 'P1' }]);
    Coupon.findOne.mockResolvedValue({ code: 'SAVE10', isActive: true, expiryDate: new Date(Date.now() + 86400000), discountType: 'percentage', discountValue: 10, minOrderValue: 0 });
    const total = await orderService.calculateOrderAmountService([{ product: 'p1', quantity: 1 }], 'save10');
    expect(total).toBe(90);
  });

  it('throws for inactive product', async () => {
    Product.find.mockResolvedValue([{ _id: 'p1', isActive: false, stock: 10, price: 100, name: 'P1' }]);
    await expect(orderService.calculateOrderAmountService([{ product: 'p1', quantity: 1 }])).rejects.toThrow('no longer available');
  });

  it('throws for insufficient stock', async () => {
    Product.find.mockResolvedValue([{ _id: 'p1', isActive: true, stock: 1, price: 100, name: 'P1' }]);
    await expect(orderService.calculateOrderAmountService([{ product: 'p1', quantity: 5 }])).rejects.toThrow(/only has 1 unit/);
  });
});

describe('checkoutOrderService', () => {
  it('creates order and reduces stock', async () => {
    Product.find.mockResolvedValue([{ _id: 'p1', isActive: true, stock: 10, price: 100, discountPrice: null, name: 'P1' }]);
    Product.bulkWrite.mockResolvedValue({ modifiedCount: 1 });

    const result = await orderService.checkoutOrderService('u1', {
      orderItems: [{ product: 'p1', quantity: 2 }],
      shippingAddress: { street: '123' },
      paymentMethod: 'cod',
    });

    expect(result.totalAmount).toBe(200);
    expect(Product.bulkWrite).toHaveBeenCalled();
  });
});

describe('getUserOrdersService', () => {
  it('returns user orders sorted by date', async () => {
    const orders = [{ _id: 'o1' }];
    const populateFn = vi.fn().mockReturnThis();
    const sortFn = vi.fn().mockResolvedValue(orders);
    Order.find.mockReturnValue({ populate: populateFn, sort: sortFn });
    const result = await orderService.getUserOrdersService('u1');
    expect(result).toEqual(orders);
  });
});

describe('getSingleOrderService', () => {
  it('returns order for owner', async () => {
    const order = { _id: 'o1', user: { _id: 'u1', toString: () => 'u1' } };
    const queryObj = {
      populate: vi.fn().mockReturnThis(),
      then: vi.fn((resolve) => resolve(order)),
    };
    Order.findById.mockReturnValue(queryObj);
    const result = await orderService.getSingleOrderService('o1', { _id: 'u1', role: 'user' });
    expect(result).toEqual(order);
  });

  it('throws for non-owner non-admin', async () => {
    const order = { _id: 'o1', user: { _id: 'u1', toString: () => 'u1' } };
    const queryObj = {
      populate: vi.fn().mockReturnThis(),
      then: vi.fn((resolve) => resolve(order)),
    };
    Order.findById.mockReturnValue(queryObj);
    await expect(orderService.getSingleOrderService('o1', { _id: 'u2', role: 'user' })).rejects.toThrow('permission');
  });
});

describe('updateOrderStatusService', () => {
  it('updates to valid status', async () => {
    Order.findByIdAndUpdate.mockResolvedValue({ _id: 'o1', orderStatus: 'shipped' });
    const result = await orderService.updateOrderStatusService('o1', 'shipped');
    expect(result.orderStatus).toBe('shipped');
  });

  it('throws for invalid status', async () => {
    await expect(orderService.updateOrderStatusService('o1', 'invalid')).rejects.toThrow('Invalid status');
  });

  it('throws when order not found', async () => {
    Order.findByIdAndUpdate.mockResolvedValue(null);
    await expect(orderService.updateOrderStatusService('missing', 'shipped')).rejects.toThrow('Order not found');
  });
});

describe('getAllOrdersService', () => {
  it('returns paginated orders', async () => {
    const orders = [{ _id: 'o1' }];
    const populateFn = vi.fn().mockReturnThis();
    const sortFn = vi.fn().mockReturnThis();
    const skipFn = vi.fn().mockReturnThis();
    const limitFn = vi.fn().mockResolvedValue(orders);
    Order.find.mockReturnValue({ populate: populateFn, sort: sortFn, skip: skipFn, limit: limitFn });
    Order.countDocuments.mockResolvedValue(1);
    const result = await orderService.getAllOrdersService({ page: 1, limit: 20 });
    expect(result.orders).toEqual(orders);
    expect(result.total).toBe(1);
  });
});

describe('deleteOrderService', () => {
  it('deletes pending order and restores stock', async () => {
    const order = {
      _id: 'o1',
      user: { toString: () => 'u1' },
      orderStatus: 'pending',
      orderItems: [{ product: 'p1', quantity: 2 }],
    };
    Order.findById.mockResolvedValue(order);
    Order.findByIdAndDelete.mockResolvedValue({});
    Product.bulkWrite.mockResolvedValue({});

    const result = await orderService.deleteOrderService('o1', { _id: 'u1', role: 'user' });
    expect(result).toBe(true);
    expect(Product.bulkWrite).toHaveBeenCalled();
  });

  it('blocks non-admin from deleting shipped orders', async () => {
    const order = {
      _id: 'o1',
      user: { toString: () => 'u1' },
      orderStatus: 'shipped',
    };
    Order.findById.mockResolvedValue(order);
    await expect(orderService.deleteOrderService('o1', { _id: 'u1', role: 'user' })).rejects.toThrow('Cannot cancel');
  });
});

describe('guestCheckoutOrderService', () => {
  it('creates guest user and calls checkoutOrderService', async () => {
    User.findOne.mockResolvedValue(null);
    User.create.mockResolvedValue({ _id: 'guest1', name: 'guest', email: 'guest@test.com' });
    Product.find.mockResolvedValue([{ _id: 'p1', isActive: true, stock: 5, price: 50, name: 'P1' }]);
    Product.bulkWrite.mockResolvedValue({ modifiedCount: 1 });

    const result = await orderService.guestCheckoutOrderService('guest@test.com', {
      orderItems: [{ product: 'p1', quantity: 1 }],
      shippingAddress: { street: '123' },
      paymentMethod: 'card',
    });
    expect(result.totalAmount).toBe(50);
  });
});
