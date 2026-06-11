import { describe, it, expect, vi } from 'vitest';
import {
  parsePaginationParams,
  buildPaginationMeta,
  paginateQuery,
  buildPaginatedResponse,
} from './pagination.service.js';

describe('parsePaginationParams', () => {
  it('returns defaults when query is empty', () => {
    expect(parsePaginationParams({})).toEqual({ page: 1, limit: 12, skip: 0 });
  });

  it('parses page and limit from query', () => {
    expect(parsePaginationParams({ page: '3', limit: '20' })).toEqual({ page: 3, limit: 20, skip: 40 });
  });

  it('caps limit at MAX_LIMIT (100)', () => {
    expect(parsePaginationParams({ limit: '999' }).limit).toBe(100);
  });

  it('ensures minimum page is 1', () => {
    expect(parsePaginationParams({ page: '0' }).page).toBe(1);
  });

  it('ensures minimum limit is 1', () => {
    expect(parsePaginationParams({ limit: '-5' }).limit).toBe(1);
  });
});

describe('buildPaginationMeta', () => {
  it('returns correct metadata for first page', () => {
    expect(buildPaginationMeta(50, 1, 10)).toEqual({
      currentPage: 1, totalPages: 5, totalItems: 50, itemsPerPage: 10, hasNext: true, hasPrev: false,
    });
  });

  it('returns correct metadata for last page', () => {
    const meta = buildPaginationMeta(50, 5, 10);
    expect(meta.hasNext).toBe(false);
    expect(meta.hasPrev).toBe(true);
  });

  it('returns 0 totalPages when limit is 0', () => {
    expect(buildPaginationMeta(10, 1, 0).totalPages).toBe(0);
  });

  it('handles single page', () => {
    const meta = buildPaginationMeta(3, 1, 10);
    expect(meta.totalPages).toBe(1);
    expect(meta.hasNext).toBe(false);
    expect(meta.hasPrev).toBe(false);
  });
});

describe('paginateQuery', () => {
  it('applies skip/limit and returns data with meta', async () => {
    const data = [{ id: 1 }, { id: 2 }];
    const query = {
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue(data),
    };
    const Model = { countDocuments: vi.fn().mockResolvedValue(20) };

    const result = await paginateQuery(query, Model, { isActive: true }, { page: 1, limit: 10, skip: 0 });

    expect(query.skip).toHaveBeenCalledWith(0);
    expect(query.limit).toHaveBeenCalledWith(10);
    expect(Model.countDocuments).toHaveBeenCalledWith({ isActive: true });
    expect(result.data).toEqual(data);
    expect(result.pagination.currentPage).toBe(1);
    expect(result.pagination.totalPages).toBe(2);
  });

  it('handles empty result set', async () => {
    const query = {
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };
    const Model = { countDocuments: vi.fn().mockResolvedValue(0) };

    const result = await paginateQuery(query, Model, {}, { page: 1, limit: 12, skip: 0 });
    expect(result.data).toEqual([]);
    expect(result.pagination.totalItems).toBe(0);
  });
});

describe('buildPaginatedResponse', () => {
  it('builds response with default dataKey', () => {
    const response = buildPaginatedResponse([{ id: 1 }], { currentPage: 1 }, 'items');
    expect(response).toEqual({
      status: 'success', results: 1, pagination: { currentPage: 1 }, data: { items: [{ id: 1 }] },
    });
  });

  it('uses custom dataKey', () => {
    const response = buildPaginatedResponse([], { currentPage: 1 }, 'products');
    expect(response.data).toHaveProperty('products');
  });
});
