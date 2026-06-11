import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../services/cache.service.js', () => ({
  default: { get: vi.fn(), set: vi.fn().mockResolvedValue(true), invalidatePattern: vi.fn().mockResolvedValue(0) },
}));
vi.mock('../utils/logger.js', () => ({ default: { debug: vi.fn(), warn: vi.fn(), info: vi.fn(), error: vi.fn() } }));

import { apiCache, invalidateCacheMiddleware, noCacheMiddleware, cacheHeadersMiddleware, CACHE_TTL } from '../middlewares/cache.middleware.js';
import cacheService from '../services/cache.service.js';

describe('CACHE_TTL', () => {
  it('should have PRODUCTS_LIST = 300', () => {
    expect(CACHE_TTL.PRODUCTS_LIST).toBe(300);
  });

  it('should have PRODUCT_DETAIL = 300', () => {
    expect(CACHE_TTL.PRODUCT_DETAIL).toBe(300);
  });

  it('should have CATEGORIES = 3600', () => {
    expect(CACHE_TTL.CATEGORIES).toBe(3600);
  });

  it('should have NO_CACHE = 0', () => {
    expect(CACHE_TTL.NO_CACHE).toBe(0);
  });
});

describe('apiCache', () => {
  let req, res, next;

  beforeEach(() => {
    vi.clearAllMocks();
    req = { method: 'GET', path: '/products', query: { limit: '8' }, user: null };
    res = {
      set: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      statusCode: 200,
    };
    next = vi.fn();
  });

  it('should skip caching for non-GET requests', async () => {
    req.method = 'POST';
    const middleware = apiCache(300);
    await middleware(req, res, next);
    expect(res.set).toHaveBeenCalledWith('Cache-Control', 'no-store');
    expect(next).toHaveBeenCalled();
  });

  it('should skip caching when ttl is 0', async () => {
    const middleware = apiCache(0);
    await middleware(req, res, next);
    expect(res.set).toHaveBeenCalledWith('Cache-Control', 'no-store');
    expect(next).toHaveBeenCalled();
  });

  it('should return cached response on cache HIT', async () => {
    const cachedBody = { status: 'success', data: [] };
    cacheService.get.mockResolvedValue({ _body: cachedBody, _statusCode: 200, _cachedAt: Date.now() });

    const middleware = apiCache(300);
    await middleware(req, res, next);

    expect(res.set).toHaveBeenCalledWith('X-Cache-Status', 'HIT');
    expect(res.json).toHaveBeenCalledWith(cachedBody);
    expect(next).not.toHaveBeenCalled();
  });

  it('should fall through to handler on cache MISS', async () => {
    cacheService.get.mockResolvedValue(null);

    const middleware = apiCache(300);
    await middleware(req, res, next);

    expect(res.set).toHaveBeenCalledWith('X-Cache-Status', 'MISS');
    expect(next).toHaveBeenCalled();
  });

  it('should populate cache on successful response', async () => {
    cacheService.get.mockResolvedValue(null);
    const body = { status: 'success' };

    const middleware = apiCache(300);
    await middleware(req, res, next);

    res.json(body);

    await vi.waitFor(() => {
      expect(cacheService.set).toHaveBeenCalledWith(
        expect.stringContaining('GET:/products:'),
        expect.objectContaining({ _body: body }),
        300,
      );
    });
  });

  it('should vary cache key by user when varyByUser is set', async () => {
    req.user = { _id: 'user123' };
    cacheService.get.mockResolvedValue(null);

    const middleware = apiCache(300, { varyByUser: true });
    await middleware(req, res, next);

    expect(cacheService.get).toHaveBeenCalledWith(expect.stringContaining(':user:user123'));
  });

  it('should handle cache read errors gracefully', async () => {
    cacheService.get.mockRejectedValue(new Error('cache down'));

    const middleware = apiCache(300);
    await middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});

describe('invalidateCacheMiddleware', () => {
  let req, res, next;

  beforeEach(() => {
    vi.clearAllMocks();
    req = {};
    res = { json: vi.fn().mockReturnThis(), statusCode: 200, set: vi.fn().mockReturnThis() };
    next = vi.fn();
  });

  it('should invalidate cache on success response', async () => {
    const middleware = invalidateCacheMiddleware(['GET:/products*']);
    middleware(req, res, next);

    res.json({ status: 'success' });

    await vi.waitFor(() => {
      expect(cacheService.invalidatePattern).toHaveBeenCalledWith('GET:/products*');
    });
  });

  it('should not invalidate on error response', () => {
    res.statusCode = 400;
    const middleware = invalidateCacheMiddleware(['GET:/products*']);
    middleware(req, res, next);

    res.json({ error: 'bad request' });

    expect(cacheService.invalidatePattern).not.toHaveBeenCalled();
  });
});

describe('noCacheMiddleware', () => {
  it('should set no-cache headers', () => {
    const req = {};
    const res = { set: vi.fn().mockReturnThis() };
    const next = vi.fn();

    noCacheMiddleware(req, res, next);

    expect(res.set).toHaveBeenCalledWith('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    expect(res.set).toHaveBeenCalledWith('Pragma', 'no-cache');
    expect(res.set).toHaveBeenCalledWith('Expires', '0');
    expect(next).toHaveBeenCalled();
  });
});

describe('cacheHeadersMiddleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {};
    res = { set: vi.fn().mockReturnThis() };
    next = vi.fn();
  });

  it('should set no-cache headers when noCache is true', () => {
    const middleware = cacheHeadersMiddleware({ noCache: true });
    middleware(req, res, next);

    expect(res.set).toHaveBeenCalledWith('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    expect(next).toHaveBeenCalled();
  });

  it('should set public cache control by default', () => {
    const middleware = cacheHeadersMiddleware();
    middleware(req, res, next);

    expect(res.set).toHaveBeenCalledWith('Cache-Control', 'public, max-age=300');
    expect(next).toHaveBeenCalled();
  });

  it('should set private cache control when isPrivate is true', () => {
    const middleware = cacheHeadersMiddleware({ isPrivate: true });
    middleware(req, res, next);

    expect(res.set).toHaveBeenCalledWith('Cache-Control', 'private, max-age=300');
  });

  it('should include must-revalidate when set', () => {
    const middleware = cacheHeadersMiddleware({ mustRevalidate: true });
    middleware(req, res, next);

    expect(res.set).toHaveBeenCalledWith('Cache-Control', 'public, max-age=300, must-revalidate');
  });

  it('should accept custom maxAge', () => {
    const middleware = cacheHeadersMiddleware({ maxAge: 600 });
    middleware(req, res, next);

    expect(res.set).toHaveBeenCalledWith('Cache-Control', 'public, max-age=600');
  });
});
