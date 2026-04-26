import logger from '../utils/logger.js';

/**
 * CacheService — unified cache layer.
 *
 * Uses Redis when REDIS_URL is set, otherwise falls back to an in-memory
 * Map-based store. This lets the app run on Render (no Redis) while being
 * production-ready when Redis is provisioned.
 *
 * Requirements: 4.1, 4.3, 4.7, 4.8
 */

// ─── In-Memory Store (fallback) ───────────────────────────────────────────────

class MemoryStore {
  constructor() {
    this.store = new Map();
    // Cleanup expired entries every 5 minutes
    setInterval(() => this._cleanup(), 5 * 60 * 1000);
  }

  async get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    entry.hitCount = (entry.hitCount || 0) + 1;
    entry.lastAccessed = Date.now();
    return entry.value;
  }

  async set(key, value, ttlSeconds = 300) {
    this.store.set(key, {
      value,
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      expiresAt: Date.now() + ttlSeconds * 1000,
      hitCount: 0,
    });
  }

  async del(key) {
    this.store.delete(key);
  }

  async invalidatePattern(pattern) {
    // Convert glob-style pattern to regex (support * wildcard)
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    let count = 0;
    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        this.store.delete(key);
        count++;
      }
    }
    return count;
  }

  async keys(pattern = '*') {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return [...this.store.keys()].filter((k) => regex.test(k));
  }

  getStats() {
    const now = Date.now();
    let totalHits = 0;
    let expired = 0;
    for (const entry of this.store.values()) {
      totalHits += entry.hitCount || 0;
      if (now > entry.expiresAt) expired++;
    }
    return {
      size: this.store.size,
      totalHits,
      expired,
      type: 'memory',
    };
  }

  _cleanup() {
    const now = Date.now();
    let removed = 0;
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
        removed++;
      }
    }
    if (removed > 0) {
      logger.debug('Memory cache cleanup', { removed, remaining: this.store.size });
    }
  }
}

// ─── Redis Store ──────────────────────────────────────────────────────────────

class RedisStore {
  constructor(client) {
    this.client = client;
  }

  async get(key) {
    try {
      const raw = await this.client.get(key);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (err) {
      logger.warn('Redis GET error', { key, error: err.message });
      return null;
    }
  }

  async set(key, value, ttlSeconds = 300) {
    try {
      await this.client.setEx(key, ttlSeconds, JSON.stringify(value));
    } catch (err) {
      logger.warn('Redis SET error', { key, error: err.message });
    }
  }

  async del(key) {
    try {
      await this.client.del(key);
    } catch (err) {
      logger.warn('Redis DEL error', { key, error: err.message });
    }
  }

  async invalidatePattern(pattern) {
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length === 0) return 0;
      await this.client.del(keys);
      return keys.length;
    } catch (err) {
      logger.warn('Redis pattern invalidation error', { pattern, error: err.message });
      return 0;
    }
  }

  async keys(pattern = '*') {
    try {
      return await this.client.keys(pattern);
    } catch {
      return [];
    }
  }

  async getStats() {
    try {
      const info = await this.client.info('stats');
      const keyspace = await this.client.info('keyspace');
      return { type: 'redis', info: info.substring(0, 200), keyspace };
    } catch {
      return { type: 'redis', error: 'stats unavailable' };
    }
  }
}

// ─── CacheService ─────────────────────────────────────────────────────────────

class CacheService {
  constructor() {
    this.store = null;
    this.isRedis = false;
    this._initialized = false;
  }

  /**
   * Initialize the cache store.
   * Tries Redis if REDIS_URL is set, falls back to memory.
   */
  async initialize() {
    if (this._initialized) return;

    const redisUrl = process.env.REDIS_URL;

    if (redisUrl) {
      try {
        // Dynamic import so the app doesn't crash if redis isn't installed
        const { createClient } = await import('redis');
        const client = createClient({ url: redisUrl });

        client.on('error', (err) => {
          logger.warn('Redis client error — falling back to memory cache', { error: err.message });
          if (this.isRedis) {
            this.store = new MemoryStore();
            this.isRedis = false;
          }
        });

        await client.connect();
        this.store = new RedisStore(client);
        this.isRedis = true;
        logger.info('Cache initialized with Redis', { url: redisUrl.replace(/:\/\/.*@/, '://***@') });
      } catch (err) {
        logger.warn('Redis unavailable — using in-memory cache', { error: err.message });
        this.store = new MemoryStore();
        this.isRedis = false;
      }
    } else {
      this.store = new MemoryStore();
      this.isRedis = false;
      logger.info('Cache initialized with in-memory store (set REDIS_URL for Redis)');
    }

    this._initialized = true;
  }

  _ensureInit() {
    if (!this._initialized || !this.store) {
      // Auto-initialize synchronously with memory store if not done yet
      this.store = new MemoryStore();
      this._initialized = true;
    }
  }

  /**
   * Get a cached value. Returns null on miss or error.
   * @param {string} key
   */
  async get(key) {
    this._ensureInit();
    try {
      const value = await this.store.get(key);
      if (value !== null) {
        logger.debug('Cache HIT', { key });
      }
      return value;
    } catch (err) {
      logger.warn('Cache GET failed', { key, error: err.message });
      return null;
    }
  }

  /**
   * Set a cached value with TTL.
   * @param {string} key
   * @param {any} value
   * @param {number} ttlSeconds
   */
  async set(key, value, ttlSeconds = 300) {
    this._ensureInit();
    try {
      await this.store.set(key, value, ttlSeconds);
      logger.debug('Cache SET', { key, ttl: ttlSeconds });
    } catch (err) {
      logger.warn('Cache SET failed', { key, error: err.message });
    }
  }

  /**
   * Delete a specific key.
   * @param {string} key
   */
  async del(key) {
    this._ensureInit();
    try {
      await this.store.del(key);
      logger.debug('Cache DEL', { key });
    } catch (err) {
      logger.warn('Cache DEL failed', { key, error: err.message });
    }
  }

  /**
   * Invalidate all keys matching a pattern (supports * wildcard).
   * Requirements: 4.3 — cache invalidation on data updates
   * @param {string} pattern
   */
  async invalidatePattern(pattern) {
    this._ensureInit();
    try {
      const count = await this.store.invalidatePattern(pattern);
      if (count > 0) {
        logger.debug('Cache invalidated by pattern', { pattern, count });
      }
      return count;
    } catch (err) {
      logger.warn('Cache invalidation failed', { pattern, error: err.message });
      return 0;
    }
  }

  /**
   * Invalidate all cache entries for a given entity type.
   * Requirements: 4.3
   * @param {'product'|'category'|'order'|'user'} entity
   * @param {string} [id] - Optional specific ID
   */
  async invalidateEntity(entity, id = null) {
    const patterns = {
      product: ['product:*', 'products:*'],
      category: ['category:*', 'categories:*'],
      order: id ? [`order:${id}`, `orders:user:*`] : ['order:*', 'orders:*'],
      user: id ? [`user:${id}`] : ['user:*'],
    };

    const entityPatterns = patterns[entity] || [`${entity}:*`];
    let total = 0;
    for (const pattern of entityPatterns) {
      total += await this.invalidatePattern(pattern);
    }
    logger.debug('Entity cache invalidated', { entity, id, total });
    return total;
  }

  /**
   * Get or set pattern — fetch from cache, or call loader and cache result.
   * Requirements: 4.7 — async cache population
   * @param {string} key
   * @param {Function} loader - Async function that returns the value
   * @param {number} ttlSeconds
   */
  async getOrSet(key, loader, ttlSeconds = 300) {
    this._ensureInit();
    const cached = await this.get(key);
    if (cached !== null) return cached;

    // Cache miss — call loader and populate asynchronously
    const value = await loader();

    // Populate cache without blocking the caller
    setImmediate(() => {
      this.set(key, value, ttlSeconds).catch(() => {});
    });

    return value;
  }

  /**
   * Warm the cache with critical data on startup.
   * Requirements: 4.7
   * @param {Array<{key: string, loader: Function, ttl: number}>} entries
   */
  async warmCache(entries) {
    logger.info('Warming cache...', { entries: entries.length });
    const results = await Promise.allSettled(
      entries.map(async ({ key, loader, ttl }) => {
        try {
          const existing = await this.get(key);
          if (existing !== null) return; // Already warm
          const value = await loader();
          await this.set(key, value, ttl);
          logger.debug('Cache warmed', { key });
        } catch (err) {
          logger.warn('Cache warm failed for key', { key, error: err.message });
        }
      })
    );
    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    logger.info('Cache warming complete', { succeeded, total: entries.length });
  }

  /**
   * Get cache statistics.
   */
  async getStats() {
    this._ensureInit();
    try {
      const stats = await this.store.getStats();
      return { ...stats, isRedis: this.isRedis };
    } catch {
      return { type: 'unknown', isRedis: this.isRedis };
    }
  }
}

// Singleton
const cacheService = new CacheService();

// Auto-initialize on import (non-blocking)
cacheService.initialize().catch((err) => {
  logger.warn('Cache initialization error', { error: err.message });
});

export default cacheService;
