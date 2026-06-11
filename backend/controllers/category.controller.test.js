import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../services/category.service.js', () => ({
  getAllCategoriesService: vi.fn(),
  createCategoryService: vi.fn(),
}));

let categoryService, controller;

beforeEach(async () => {
  vi.clearAllMocks();
  categoryService = await import('../services/category.service.js');
  controller = await import('./category.controller.js');
});

function mockReqRes() {
  return { req: { body: {} }, res: { status: vi.fn().mockReturnThis(), json: vi.fn() }, next: vi.fn() };
}

describe('getAllCategories', () => {
  it('returns categories with count', async () => {
    const { req, res, next } = mockReqRes();
    categoryService.getAllCategoriesService.mockResolvedValue([{ name: 'A' }]);
    await controller.getAllCategories(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ results: 1 }));
  });
});

describe('createCategory', () => {
  it('creates category and returns 201', async () => {
    const { req, res, next } = mockReqRes();
    req.body = { name: 'New Cat' };
    categoryService.createCategoryService.mockResolvedValue({ _id: 'c1', name: 'New Cat' });
    await controller.createCategory(req, res, next);
    expect(res.status).toHaveBeenCalledWith(201);
  });
});
