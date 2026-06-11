import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../models/Review.js', () => ({ default: { find: vi.fn(), findOne: vi.fn(), create: vi.fn(), aggregate: vi.fn() } }));
vi.mock('../models/Product.js', () => ({ default: { findById: vi.fn() } }));

let Review, Product, controller;

beforeEach(async () => {
  vi.clearAllMocks();
  Review = (await import('../models/Review.js')).default;
  Product = (await import('../models/Product.js')).default;
  controller = await import('./review.controller.js');
});

function mockReqRes() {
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
  return { req: { params: {}, body: {}, user: { _id: 'u1' } }, res, next: vi.fn() };
}

describe('getProductReviews', () => {
  it('returns approved reviews for product', async () => {
    const { req, res, next } = mockReqRes();
    req.params.productId = 'p1';
    const populateFn = vi.fn().mockReturnThis();
    const sortFn = vi.fn().mockResolvedValue([{ _id: 'r1', rating: 5 }]);
    Review.find.mockReturnValue({ populate: populateFn, sort: sortFn });

    await controller.getProductReviews(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(Review.find).toHaveBeenCalledWith({ product: 'p1', isApproved: true });
  });
});

describe('addReview', () => {
  it('creates review and updates product rating', async () => {
    const { req, res, next } = mockReqRes();
    req.params.productId = 'p1';
    req.body = { rating: 5, comment: 'Great' };
    req.user._id = 'u1';

    Product.findById.mockResolvedValue({ _id: 'p1', ratingsAverage: 0, ratingsCount: 0, save: vi.fn().mockResolvedValue(true) });
    Review.findOne.mockResolvedValue(null);
    Review.create.mockResolvedValue({ _id: 'r1', rating: 5, comment: 'Great' });
    Review.aggregate.mockResolvedValue([{ avgRating: 4.5, count: 1 }]);

    await controller.addReview(req, res, next);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('returns 404 if product not found', async () => {
    const { req, res, next } = mockReqRes();
    req.params.productId = 'missing';
    Product.findById.mockResolvedValue(null);
    await controller.addReview(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 400 if already reviewed', async () => {
    const { req, res, next } = mockReqRes();
    req.params.productId = 'p1';
    Product.findById.mockResolvedValue({ _id: 'p1' });
    Review.findOne.mockResolvedValue({ _id: 'existing' });
    await controller.addReview(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});
