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

vi.mock('../services/order.service.js', () => ({
  calculateOrderAmountService: vi.fn(),
  createPendingOrderService: vi.fn(),
  checkoutOrderService: vi.fn(),
  getUserOrdersService: vi.fn(),
  getSingleOrderService: vi.fn(),
  updateOrderStatusService: vi.fn(),
  getAllOrdersService: vi.fn(),
  deleteOrderService: vi.fn(),
}));

vi.mock('../services/audit.service.js', () => ({ logAuditAction: vi.fn() }));

vi.mock('stripe', () => ({ default: vi.fn() }));

const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
vi.mock('../utils/logger.js', () => ({ default: mockLogger }));

let orderService, controller, mockStripe, CircuitOpenError;

beforeEach(async () => {
  vi.clearAllMocks();
  process.env.STRIPE_SECRET_KEY = 'sk_test';

  mockStripe = {
    paymentIntents: { create: vi.fn(), cancel: vi.fn() },
  };
  const Stripe = (await import('stripe')).default;
  Stripe.mockImplementation(function () { return mockStripe; });

  orderService = await import('../services/order.service.js');
  controller = await import('./order.controller.js');

  const cbModule = await import('../utils/circuit-breaker.js');
  CircuitOpenError = cbModule.CircuitOpenError;
});

function mockReqRes() {
  return {
    req: { body: {}, params: {}, query: {}, user: { _id: 'u1' }, get: vi.fn(), ip: '127.0.0.1' },
    res: { status: vi.fn().mockReturnThis(), json: vi.fn() },
    next: vi.fn(),
  };
}

describe('checkoutOrder', () => {
  it('creates order for logged-in user', async () => {
    const { req, res, next } = mockReqRes();
    req.body = { shippingAddress: {}, paymentMethod: 'cod', orderItems: [{}] };
    orderService.checkoutOrderService.mockResolvedValue({ _id: 'o1' });
    await controller.checkoutOrder(req, res, next);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('returns 400 for missing fields', async () => {
    const { req, res, next } = mockReqRes();
    req.body = {};
    await controller.checkoutOrder(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});

describe('createPaymentIntent', () => {
  it('creates payment intent for logged-in user', async () => {
    const { req, res, next } = mockReqRes();
    req.body = { orderItems: [{ product: 'p1', quantity: 1 }] };
    orderService.calculateOrderAmountService.mockResolvedValue(75);
    orderService.createPendingOrderService.mockResolvedValue({ _id: 'po1', stripePaymentIntentId: null, save: vi.fn().mockResolvedValue(true) });
    mockStripe.paymentIntents.create.mockResolvedValue({ client_secret: 'cs_456', id: 'pi_456' });
    await controller.createPaymentIntent(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe('cancelPaymentIntent', () => {
  it('cancels a payment intent', async () => {
    const { req, res, next } = mockReqRes();
    req.body = { paymentIntentId: 'pi_1' };
    mockStripe.paymentIntents.cancel.mockResolvedValue({});
    await controller.cancelPaymentIntent(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('returns 400 if no ID', async () => {
    const { req, res, next } = mockReqRes();
    req.body = {};
    await controller.cancelPaymentIntent(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('getMyOrders', () => {
  it('returns user orders', async () => {
    const { req, res, next } = mockReqRes();
    orderService.getUserOrdersService.mockResolvedValue([]);
    await controller.getMyOrders(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe('getSingleOrder', () => {
  it('returns order', async () => {
    const { req, res, next } = mockReqRes();
    req.params.id = 'o1';
    orderService.getSingleOrderService.mockResolvedValue({ _id: 'o1' });
    await controller.getSingleOrder(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('handles missing order', async () => {
    const { req, res, next } = mockReqRes();
    req.params.id = 'missing';
    orderService.getSingleOrderService.mockRejectedValue(new Error('Order not found'));
    await controller.getSingleOrder(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});

describe('updateOrderStatus', () => {
  it('updates order status', async () => {
    const { req, res, next } = mockReqRes();
    req.params.id = 'o1';
    req.body = { orderStatus: 'shipped' };
    orderService.updateOrderStatusService.mockResolvedValue({ _id: 'o1', orderStatus: 'shipped' });
    await controller.updateOrderStatus(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('returns 400 if no status', async () => {
    const { req, res, next } = mockReqRes();
    req.params.id = 'o1';
    req.body = {};
    await controller.updateOrderStatus(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});

describe('getAllOrders', () => {
  it('returns paginated orders', async () => {
    const { req, res, next } = mockReqRes();
    req.query = { page: '1', limit: '20' };
    orderService.getAllOrdersService.mockResolvedValue({ orders: [], total: 0, totalPages: 0, currentPage: 1 });
    await controller.getAllOrders(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe('deleteOrder', () => {
  it('deletes order', async () => {
    const { req, res, next } = mockReqRes();
    req.params.id = 'o1';
    orderService.deleteOrderService.mockResolvedValue(true);
    await controller.deleteOrder(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
