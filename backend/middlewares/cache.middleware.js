import logger from '../utils/logger.js';
import cacheService from '../services/cache.service.js';

/**
 * Cache TTL constants (in seconds)
 * Requirements: 4.1, 4.5
 */
export const CACHE_TTL = {
  PRODUCTS_LIST: 300,      // 5 minutes — cache invalidation handles freshness
  PRODUCT_DETAIL: 300,     // 5 minutes
  CATEGORIES: 3600,        // 1 hour
  PUBLIC_SHORT: 60,        // 1 minute
  NO_CACHE: 0,
};

/**
 * Generate a deterministic cache key from the request.
 */
const getCacheKey = (req) => {
  const query = JSON.stringify(req.query);
  return `${req.method}:${req.path}:${query}`;
};

/**
 * API response cache middleware — cache-first with async population.
 * Backed by cacheService (Redis or in-memory fallback).
 * Requirements: 2.6, 4.1, 4.4, 4.7
 *
 * @param {number} ttlSeconds - Cache TTL in seconds
 * @param {Object} options
 * @param {boolean} options.varyByUser - Include user ID in cache key
 */
export const apiCache = (ttlSeconds, options = {}) => {
  return async (req, res, next) => {
    // Skip cache for admin users (e.g. admin product listing always needs fresh data)
    if (options.skipAdmin && req.user?.role === 'admin') {
      res.set('Cache-Control', 'no-store');
      return next();
    }

    // Only cache GET requests
    if (req.method !== 'GET' || ttlSeconds === 0) {
      res.set('Cache-Control', 'no-store');
      return next();
    }

    const userSuffix = options.varyByUser && req.user?._id ? `:user:${req.user._id}` : '';
    const key = getCacheKey(req) + userSuffix;

    try {
      const cached = await cacheService.get(key);

      if (cached !== null) {
        // Cache HIT — serve immediately with headers
        res.set('X-Cache-Status', 'HIT');
        res.set('Cache-Control', `public, max-age=${ttlSeconds}, stale-while-revalidate=60`);
        res.set('X-Cache-Age', cached._cachedAt
          ? Math.floor((Date.now() - cached._cachedAt) / 1000).toString()
          : '0');
        logger.debug('Cache HIT', { key, path: req.path });
        return res.status(cached._statusCode || 200).json(cached._body);
      }
    } catch (err) {
      // Cache read failure — proceed to handler, don't block request
      logger.warn('Cache read error', { key, error: err.message });
    }

    // Cache MISS — set headers and intercept response to populate cache
    res.set('X-Cache-Status', 'MISS');
    res.set('Cache-Control', `public, max-age=${ttlSeconds}, stale-while-revalidate=60`);

    const originalJson = res.json.bind(res);
    res.json = (body) => {
      // Async population — never blocks the response (Requirements: 4.7)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        setImmediate(() => {
          cacheService.set(key, {
            _body: body,
            _statusCode: res.statusCode,
            _cachedAt: Date.now(),
          }, ttlSeconds).catch(() => {});
        });
      }
      return originalJson(body);
    };

    next();
  };
};

/**
 * Invalidate cache entries matching a pattern prefix.
 * Requirements: 4.3
 *
 * @param {string} prefix - Key prefix / glob pattern (supports * wildcard)
 */
export const invalidateCache = async (prefix) => {
  const count = await cacheService.invalidatePattern(prefix);
  return count;
};

/**
 * Middleware factory: invalidate cache after a mutating request succeeds.
 * Attach to POST/PUT/PATCH/DELETE routes that modify cacheable resources.
 * Requirements: 4.3
 *
 * @param {string[]} prefixes - Cache key prefixes to invalidate
 */
export const invalidateCacheMiddleware = (prefixes) => {
  return (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        setImmediate(() => {
          prefixes.forEach((prefix) => {
            cacheService.invalidatePattern(prefix).catch(() => {});
          });
        });
      }
      return originalJson(body);
    };
    next();
  };
};

/**
 * No-cache headers for sensitive/private endpoints (auth, orders, cart).
 */
export const noCacheMiddleware = (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
};

/**
 * Cache-control header middleware factory (for routes not using apiCache).
 * Requirements: 2.6
 */
export const cacheHeadersMiddleware = (options = {}) => {
  return (req, res, next) => {
    const { maxAge = 300, mustRevalidate = false, noCache = false, isPrivate = false } = options;

    if (noCache) {
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
    } else {
      let cc = isPrivate ? 'private' : 'public';
      cc += `, max-age=${maxAge}`;
      if (mustRevalidate) cc += ', must-revalidate';
      res.set('Cache-Control', cc);
    }

    next();
  };
};

export default { apiCache, invalidateCache, invalidateCacheMiddleware, noCacheMiddleware, cacheHeadersMiddleware, CACHE_TTL };
