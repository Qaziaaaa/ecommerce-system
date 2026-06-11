import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateCreateProduct, validateUpdateProduct } from './product.validator.js';

let mockReq, mockRes, mockNext;

beforeEach(() => {
  mockReq = { body: {} };
  mockRes = { status: vi.fn().mockReturnThis(), json: vi.fn() };
  mockNext = vi.fn();
});

describe('validateCreateProduct', () => {
  it('calls next when all required fields present', () => {
    mockReq.body = { name: 'Shoe', description: 'Nice', price: 99, category: 'cat1' };
    validateCreateProduct(mockReq, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalled();
  });

  it('returns 400 when name is missing', () => {
    mockReq.body = { description: 'Nice', price: 99, category: 'cat1' };
    validateCreateProduct(mockReq, mockRes, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when description is missing', () => {
    mockReq.body = { name: 'Shoe', price: 99, category: 'cat1' };
    validateCreateProduct(mockReq, mockRes, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when price is missing', () => {
    mockReq.body = { name: 'Shoe', description: 'Nice', category: 'cat1' };
    validateCreateProduct(mockReq, mockRes, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when category is missing', () => {
    mockReq.body = { name: 'Shoe', description: 'Nice', price: 99 };
    validateCreateProduct(mockReq, mockRes, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(400);
  });
});

describe('validateUpdateProduct', () => {
  it('calls next when body has fields', () => {
    mockReq.body = { name: 'Updated' };
    validateUpdateProduct(mockReq, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalled();
  });

  it('returns 400 when body is empty', () => {
    validateUpdateProduct(mockReq, mockRes, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(400);
  });
});
