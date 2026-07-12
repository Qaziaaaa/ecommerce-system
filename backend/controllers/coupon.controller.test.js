import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../models/Coupon.js', () => ({ default: { findOne: vi.fn() } }));

let Coupon, controller;

beforeEach(async () => {
  vi.clearAllMocks();
  Coupon = (await import('../models/Coupon.js')).default;
  controller = await import('./coupon.controller.js');
});

function mockReqRes() {
  return { req: { body: {} }, res: { status: vi.fn().mockReturnThis(), json: vi.fn() }, next: vi.fn() };
}

describe('applyCoupon', () => {
  it('applies valid percentage coupon', async () => {
    const { req, res, next } = mockReqRes();
    req.body = { code: 'SAVE10', cartTotal: 100 };
    Coupon.findOne.mockResolvedValue({ code: 'SAVE10', isActive: true, expiryDate: new Date(Date.now() + 86400000), discountType: 'percentage', discountValue: 10, minOrderValue: 0, toObject: () => ({ code: 'SAVE10', discountType: 'percentage' }) });

    await controller.applyCoupon(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'success' }));
  });

  it('returns 400 if no code provided', async () => {
    const { req, res, next } = mockReqRes();
    req.body = {};
    await controller.applyCoupon(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 404 if coupon not found', async () => {
    const { req, res, next } = mockReqRes();
    req.body = { code: 'INVALID', cartTotal: 100 };
    Coupon.findOne.mockResolvedValue(null);
    await controller.applyCoupon(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 400 if cart total below minimum', async () => {
    const { req, res, next } = mockReqRes();
    req.body = { code: 'SAVE10', cartTotal: 10 };
    Coupon.findOne.mockResolvedValue({ code: 'SAVE10', isActive: true, expiryDate: new Date(Date.now() + 86400000), minOrderValue: 50 });
    await controller.applyCoupon(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});
