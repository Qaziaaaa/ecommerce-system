import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
vi.mock('../utils/logger.js', () => ({ default: mockLogger }));

let cacheService;

beforeEach(async () => {
  vi.clearAllMocks();
  cacheService = (await import('./cache.service.js')).default;
});

describe('CacheService (MemoryStore)', () => {
  it('get returns null for missing key', async () => {
    const result = await cacheService.get('missing');
    expect(result).toBeNull();
  });

  it('set and get roundtrip', async () => {
    await cacheService.set('key1', { foo: 'bar' });
    const result = await cacheService.get('key1');
    expect(result).toEqual({ foo: 'bar' });
  });

  it('get returns null after TTL expires', async () => {
    vi.useFakeTimers();
    await cacheService.set('temp', 'value', 1);
    vi.advanceTimersByTime(1500);
    const result = await cacheService.get('temp');
    expect(result).toBeNull();
    vi.useRealTimers();
  });

  it('del removes key', async () => {
    await cacheService.set('key2', 'value');
    await cacheService.del('key2');
    const result = await cacheService.get('key2');
    expect(result).toBeNull();
  });

  it('invalidatePattern removes keys by pattern', async () => {
    await cacheService.set('product:123', 'a');
    await cacheService.set('product:456', 'b');
    await cacheService.set('category:789', 'c');
    const count = await cacheService.invalidatePattern('product:*');
    expect(count).toBe(2);
    expect(await cacheService.get('product:123')).toBeNull();
    expect(await cacheService.get('category:789')).toBe('c');
  });

  it('invalidateEntity invalidates by entity type', async () => {
    await cacheService.set('product:1', 'a');
    await cacheService.set('products:list', 'b');
    await cacheService.set('user:1', 'c');
    const total = await cacheService.invalidateEntity('product');
    expect(total).toBe(2);
  });

  it('getOrSet calls loader on miss and returns result', async () => {
    const loader = vi.fn().mockResolvedValue('loaded');
    const result = await cacheService.getOrSet('miss', loader);
    expect(result).toBe('loaded');
    expect(loader).toHaveBeenCalled();
  });

  it('getOrSet returns cached value on hit', async () => {
    await cacheService.set('hit', 'cached');
    const loader = vi.fn().mockResolvedValue('loaded');
    const result = await cacheService.getOrSet('hit', loader);
    expect(result).toBe('cached');
    expect(loader).not.toHaveBeenCalled();
  });

  it('warmCache populates missing keys', async () => {
    await cacheService.set('existing', 'val');
    const loader1 = vi.fn().mockResolvedValue('fresh');
    const loader2 = vi.fn().mockResolvedValue('new');
    await cacheService.warmCache([
      { key: 'existing', loader: loader1 },
      { key: 'newkey', loader: loader2, ttl: 600 },
    ]);
    expect(loader1).not.toHaveBeenCalled();
    expect(loader2).toHaveBeenCalled();
    expect(await cacheService.get('newkey')).toBe('new');
  });

  it('getStats returns memory store info', async () => {
    await cacheService.set('a', 1);
    const stats = await cacheService.getStats();
    expect(stats.type).toBe('memory');
    expect(stats.size).toBeGreaterThanOrEqual(1);
    expect(stats.isRedis).toBe(false);
  });
});
