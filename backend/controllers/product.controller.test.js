import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../services/product.service.js', () => ({
  createProductService: vi.fn(),
  getAllProductsService: vi.fn(),
  getProductByIdService: vi.fn(),
  updateProductService: vi.fn(),
  deleteProductService: vi.fn(),
}));

vi.mock('../utils/AppError.js', () => {
  function AppError(message, statusCode) {
    this.message = message;
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
  }
  return { default: AppError };
});

vi.mock('../services/audit.service.js', () => ({ logAuditAction: vi.fn() }));

import * as productService from '../services/product.service.js';
import * as controller from './product.controller.js';

function mockReq(overrides = {}) {
  return { body: {}, params: {}, query: {}, user: { _id: 'admin1', role: 'admin' }, get: vi.fn(() => 'agent'), ip: '127.0.0.1', ...overrides };
}

function mockRes() {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe('createProduct', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('creates product and returns 201', async () => {
    const req = mockReq({ body: { name: 'New', price: 50 } });
    const res = mockRes();
    const next = vi.fn();
    productService.createProductService.mockResolvedValue({ _id: 'p1', name: 'New', price: 50 });

    await controller.createProduct(req, res, next);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'success' }));
  });

  it('calls next on error', async () => {
    const req = mockReq({ body: {} });
    const res = mockRes();
    const next = vi.fn();
    productService.createProductService.mockRejectedValue(new Error('DB error'));

    await controller.createProduct(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'DB error' }));
  });
});

describe('getProducts', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns paginated products', async () => {
    const req = mockReq({ query: { page: '1' } });
    const res = mockRes();
    const next = vi.fn();
    productService.getAllProductsService.mockResolvedValue({ products: [{ _id: 'p1' }], pagination: { currentPage: 1 } });

    await controller.getProducts(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'success', results: 1 }));
  });
});

describe('getProductById', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns product when found', async () => {
    const req = mockReq({ params: { id: 'p1' } });
    const res = mockRes();
    const next = vi.fn();
    productService.getProductByIdService.mockResolvedValue({ _id: 'p1', name: 'Test' });

    await controller.getProductById(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('returns 404 when not found', async () => {
    const req = mockReq({ params: { id: 'nonexistent' } });
    const res = mockRes();
    const next = vi.fn();
    productService.getProductByIdService.mockResolvedValue(null);

    await controller.getProductById(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
  });
});

describe('updateProduct', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('updates and returns product', async () => {
    const req = mockReq({ params: { id: 'p1' }, body: { name: 'Updated' } });
    const res = mockRes();
    const next = vi.fn();
    productService.updateProductService.mockResolvedValue({ _id: 'p1', name: 'Updated' });

    await controller.updateProduct(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('returns 404 when product not found', async () => {
    const req = mockReq({ params: { id: 'nonexistent' }, body: { name: 'Updated' } });
    const res = mockRes();
    const next = vi.fn();
    productService.updateProductService.mockResolvedValue(null);

    await controller.updateProduct(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
  });
});

describe('deleteProduct', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('deletes and returns success', async () => {
    const req = mockReq({ params: { id: 'p1' } });
    const res = mockRes();
    const next = vi.fn();
    productService.deleteProductService.mockResolvedValue({ _id: 'p1', name: 'Test' });

    await controller.deleteProduct(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('returns 404 when product not found', async () => {
    const req = mockReq({ params: { id: 'nonexistent' } });
    const res = mockRes();
    const next = vi.fn();
    productService.deleteProductService.mockResolvedValue(null);

    await controller.deleteProduct(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
  });
});
