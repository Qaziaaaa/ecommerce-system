import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../utils/AppError.js', () => {
  function AppError(message, statusCode) {
    this.message = message;
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
  }
  return { default: AppError };
});

vi.mock('../services/admin.service.js', () => ({
  getDashboardOverview: vi.fn(),
  getMonthlySales: vi.fn(),
  getCategoryDistribution: vi.fn(),
  getOrderStatusDistribution: vi.fn(),
  getTopProducts: vi.fn(),
  getRecentOrders: vi.fn(),
  getLowStockAlerts: vi.fn(),
  getAllUsers: vi.fn(),
  updateUserRoleService: vi.fn(),
}));

vi.mock('../services/audit.service.js', () => ({ logAuditAction: vi.fn() }));

let adminService, controller;

beforeEach(async () => {
  vi.clearAllMocks();
  adminService = await import('../services/admin.service.js');
  controller = await import('./admin.controller.js');
});

function mockReqRes(overrides = {}) {
  const req = { body: {}, params: {}, user: { _id: 'admin1' }, ip: '127.0.0.1', get: vi.fn(), ...overrides };
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
  const next = vi.fn();
  return { req, res, next };
}

describe('getDashboardOverview', () => {
  it('returns dashboard data', async () => {
    const { req, res, next } = mockReqRes();
    adminService.getDashboardOverview.mockResolvedValue({ totalUsers: 10 });
    await controller.getDashboardOverview(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: { totalUsers: 10 } }));
  });
});

describe('getMonthlySales', () => {
  it('returns sales data', async () => {
    const { req, res, next } = mockReqRes();
    adminService.getMonthlySales.mockResolvedValue([]);
    await controller.getMonthlySales(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe('getCategoryDistribution', () => {
  it('returns category data', async () => {
    const { req, res, next } = mockReqRes();
    adminService.getCategoryDistribution.mockResolvedValue([]);
    await controller.getCategoryDistribution(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe('getTopProducts', () => {
  it('returns top products', async () => {
    const { req, res, next } = mockReqRes();
    adminService.getTopProducts.mockResolvedValue([]);
    await controller.getTopProducts(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe('getRecentOrders', () => {
  it('returns recent orders', async () => {
    const { req, res, next } = mockReqRes();
    adminService.getRecentOrders.mockResolvedValue([]);
    await controller.getRecentOrders(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe('getLowStockAlerts', () => {
  it('returns low stock products', async () => {
    const { req, res, next } = mockReqRes();
    adminService.getLowStockAlerts.mockResolvedValue([]);
    await controller.getLowStockAlerts(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe('getAllUsers', () => {
  it('returns all users', async () => {
    const { req, res, next } = mockReqRes();
    adminService.getAllUsers.mockResolvedValue([]);
    await controller.getAllUsers(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe('updateUserRole', () => {
  it('updates user role and logs audit', async () => {
    const { req, res, next } = mockReqRes({ params: { id: 'u1' }, body: { role: 'admin' } });
    adminService.updateUserRoleService.mockResolvedValue({ _id: 'u1', name: 'User', role: 'admin' });

    await controller.updateUserRole(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('blocks self-demotion', async () => {
    const { req, res, next } = mockReqRes({ params: { id: 'admin1' }, body: { role: 'user' } });
    await controller.updateUserRole(req, res, next);
    expect(next).toHaveBeenCalled();
    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(403);
  });

  it('handles user not found', async () => {
    const { req, res, next } = mockReqRes({ params: { id: 'missing' }, body: { role: 'admin' } });
    adminService.updateUserRoleService.mockResolvedValue(null);
    await controller.updateUserRole(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
