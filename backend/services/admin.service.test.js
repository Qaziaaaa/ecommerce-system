import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../models/User.js', () => ({ default: { countDocuments: vi.fn(), find: vi.fn(), findByIdAndUpdate: vi.fn() } }));
vi.mock('../models/Order.js', () => ({ default: { countDocuments: vi.fn(), aggregate: vi.fn(), find: vi.fn() } }));
vi.mock('../models/Product.js', () => ({ default: { countDocuments: vi.fn(), find: vi.fn() } }));

let adminService, User, Order, Product;

beforeEach(async () => {
  vi.clearAllMocks();
  User = (await import('../models/User.js')).default;
  Order = (await import('../models/Order.js')).default;
  Product = (await import('../models/Product.js')).default;
  adminService = await import('./admin.service.js');
});

describe('getDashboardOverview', () => {
  it('returns core counts and revenue', async () => {
    User.countDocuments.mockResolvedValue(10);
    Order.countDocuments.mockResolvedValue(20);
    Product.countDocuments.mockResolvedValue(30);
    Order.aggregate.mockResolvedValue([{ revenue: 5000 }]);

    const result = await adminService.getDashboardOverview();
    expect(result).toEqual({ totalUsers: 10, totalOrders: 20, totalProducts: 30, totalRevenue: 5000 });
  });

  it('returns 0 revenue when no paid orders', async () => {
    User.countDocuments.mockResolvedValue(0);
    Order.countDocuments.mockResolvedValue(0);
    Product.countDocuments.mockResolvedValue(0);
    Order.aggregate.mockResolvedValue([]);

    const result = await adminService.getDashboardOverview();
    expect(result.totalRevenue).toBe(0);
  });
});

describe('getMonthlySales', () => {
  it('returns 12 months with revenue', async () => {
    Order.aggregate.mockResolvedValue([{ _id: 1, revenue: 1000 }, { _id: 6, revenue: 2000 }]);
    const result = await adminService.getMonthlySales();
    expect(result).toHaveLength(12);
    expect(result[0].month).toBe('Jan');
    expect(result[0].revenue).toBe(1000);
    expect(result[5].month).toBe('Jun');
    expect(result[5].revenue).toBe(2000);
    expect(result[11].revenue).toBe(0);
  });
});

describe('getCategoryDistribution', () => {
  it('returns category revenue breakdown', async () => {
    Order.aggregate.mockResolvedValue([{ name: 'Electronics', value: 5000 }]);
    const result = await adminService.getCategoryDistribution();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Electronics');
  });
});

describe('getOrderStatusDistribution', () => {
  it('returns order status counts', async () => {
    Order.aggregate.mockResolvedValue([{ name: 'pending', value: 5 }, { name: 'shipped', value: 3 }]);
    const result = await adminService.getOrderStatusDistribution();
    expect(result).toHaveLength(2);
  });
});

describe('getTopProducts', () => {
  it('returns top sold products', async () => {
    Order.aggregate.mockResolvedValue([{ name: 'Product A', sold: 10 }]);
    const result = await adminService.getTopProducts();
    expect(result[0].name).toBe('Product A');
  });
});

describe('getRecentOrders', () => {
  it('returns recent orders with user populated', async () => {
    const orders = [{ _id: 'o1' }];
    const sortFn = vi.fn().mockReturnThis();
    const limitFn = vi.fn().mockReturnThis();
    const populateFn = vi.fn().mockResolvedValue(orders);
    Order.find.mockReturnValue({ sort: sortFn, limit: limitFn, populate: populateFn });

    const result = await adminService.getRecentOrders();
    expect(result).toEqual(orders);
    expect(sortFn).toHaveBeenCalledWith({ createdAt: -1 });
    expect(limitFn).toHaveBeenCalledWith(10);
  });
});

describe('getLowStockAlerts', () => {
  it('returns products with stock < 20', async () => {
    const products = [{ _id: 'p1', name: 'Low', stock: 5 }];
    const populateFn = vi.fn().mockReturnThis();
    const selectFn = vi.fn().mockReturnThis();
    const sortFn = vi.fn().mockResolvedValue(products);
    Product.find.mockReturnValue({ populate: populateFn, select: selectFn, sort: sortFn });

    const result = await adminService.getLowStockAlerts();
    expect(Product.find).toHaveBeenCalledWith({ stock: { $lt: 20 } });
    expect(result).toEqual(products);
  });
});

describe('getAllUsers', () => {
  it('returns users sorted by creation date', async () => {
    const users = [{ _id: 'u1', name: 'Test' }];
    const selectFn = vi.fn().mockReturnThis();
    const sortFn = vi.fn().mockResolvedValue(users);
    User.find.mockReturnValue({ select: selectFn, sort: sortFn });

    const result = await adminService.getAllUsers();
    expect(User.find).toHaveBeenCalled();
    expect(result).toEqual(users);
  });
});

describe('updateUserRoleService', () => {
  it('updates user role', async () => {
    User.findByIdAndUpdate.mockResolvedValue({ _id: 'u1', role: 'admin' });
    const result = await adminService.updateUserRoleService('u1', 'admin');
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith('u1', { role: 'admin' }, { new: true, runValidators: true });
    expect(result.role).toBe('admin');
  });
});
