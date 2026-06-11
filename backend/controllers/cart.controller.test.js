import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../services/cart.service.js', () => ({
  addToCartService: vi.fn(),
  getCartService: vi.fn(),
  updateCartItemService: vi.fn(),
  removeCartItemService: vi.fn(),
}));

let cartService, controller;

beforeEach(async () => {
  vi.clearAllMocks();
  cartService = await import('../services/cart.service.js');
  controller = await import('./cart.controller.js');
});

function mockReqRes(overrides = {}) {
  const req = { body: {}, params: {}, user: { _id: 'u1' }, ...overrides };
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
  const next = vi.fn();
  return { req, res, next };
}

describe('addToCart', () => {
  it('adds item and returns 200', async () => {
    const { req, res, next } = mockReqRes({ body: { productId: 'p1', quantity: 2 } });
    cartService.addToCartService.mockResolvedValue([{ product: 'p1', quantity: 2 }]);

    await controller.addToCart(req, res, next);
    expect(cartService.addToCartService).toHaveBeenCalledWith('u1', 'p1', 2);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'success' }));
  });

  it('returns 400 for missing productId', async () => {
    const { req, res, next } = mockReqRes({ body: { quantity: 1 } });
    await controller.addToCart(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 for invalid quantity', async () => {
    const { req, res, next } = mockReqRes({ body: { productId: 'p1', quantity: 0 } });
    await controller.addToCart(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('calls next on service error', async () => {
    const { req, res, next } = mockReqRes({ body: { productId: 'p1', quantity: 1 } });
    const error = new Error('Service error');
    cartService.addToCartService.mockRejectedValue(error);

    await controller.addToCart(req, res, next);
    expect(next).toHaveBeenCalledWith(error);
  });
});

describe('getCart', () => {
  it('returns cart data', async () => {
    const { req, res, next } = mockReqRes();
    const cartData = { cartItems: [], totalPrice: 0 };
    cartService.getCartService.mockResolvedValue(cartData);

    await controller.getCart(req, res, next);
    expect(cartService.getCartService).toHaveBeenCalledWith('u1');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: cartData }));
  });

  it('calls next on service error', async () => {
    const { req, res, next } = mockReqRes();
    cartService.getCartService.mockRejectedValue(new Error('Not found'));
    await controller.getCart(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});

describe('updateCartItem', () => {
  it('updates item and returns 200', async () => {
    const { req, res, next } = mockReqRes({ params: { productId: 'p1' }, body: { quantity: 3 } });
    cartService.updateCartItemService.mockResolvedValue([]);

    await controller.updateCartItem(req, res, next);
    expect(cartService.updateCartItemService).toHaveBeenCalledWith('u1', 'p1', 3);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('returns 400 for missing quantity', async () => {
    const { req, res, next } = mockReqRes({ params: { productId: 'p1' }, body: {} });
    await controller.updateCartItem(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('calls next on service error', async () => {
    const { req, res, next } = mockReqRes({ params: { productId: 'p1' }, body: { quantity: 1 } });
    cartService.updateCartItemService.mockRejectedValue(new Error('Fail'));
    await controller.updateCartItem(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});

describe('removeCartItem', () => {
  it('removes item and returns 200', async () => {
    const { req, res, next } = mockReqRes({ params: { productId: 'p1' } });
    cartService.removeCartItemService.mockResolvedValue([]);

    await controller.removeCartItem(req, res, next);
    expect(cartService.removeCartItemService).toHaveBeenCalledWith('u1', 'p1');
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('calls next on service error', async () => {
    const { req, res, next } = mockReqRes({ params: { productId: 'p1' } });
    cartService.removeCartItemService.mockRejectedValue(new Error('Fail'));
    await controller.removeCartItem(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
