import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
vi.mock('../utils/logger.js', () => ({ default: mockLogger }));

const trackAPIResponseTime = vi.fn();
const trackResourceUsage = vi.fn();
const getPerformanceSummary = vi.fn(() => ({ errorRate: 0, api: {}, database: {} }));
const triggerAlert = vi.fn();
vi.mock('../services/performance.service.js', () => ({
  default: { trackAPIResponseTime, trackResourceUsage, getPerformanceSummary, triggerAlert },
}));

let perf;

beforeEach(async () => {
  vi.clearAllMocks();
  perf = await import('./performance.middleware.js');
});

describe('performanceMiddleware', () => {
  it('adds X-Response-Time header and tracks metrics', () => {
    const req = { path: '/test', method: 'GET', route: { path: '/test' }, get: vi.fn(() => 'agent'), ip: '127.0.0.1', socket: {} };
    const res = { statusCode: 200, set: vi.fn(), get: vi.fn(() => 'BYPASS'), end: vi.fn() };
    const next = vi.fn();

    perf.performanceMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();

    res.end('chunk');
    expect(res.set).toHaveBeenCalledWith('X-Response-Time', expect.any(String));
    expect(trackAPIResponseTime).toHaveBeenCalled();
  });

  it('skips log for health paths', () => {
    const req = { path: '/health', method: 'GET', route: null, get: vi.fn(), ip: '', socket: {} };
    const res = { statusCode: 200, set: vi.fn(), get: vi.fn(() => 'BYPASS'), end: vi.fn() };
    const next = vi.fn();

    perf.performanceMiddleware(req, res, next);
    res.end('chunk');
  });
});

describe('resourceMonitoringMiddleware', () => {
  it('calls next', () => {
    const req = {};
    const res = {};
    const next = vi.fn();
    perf.resourceMonitoringMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});

describe('cacheHeadersMiddleware', () => {
  it('sets default cache headers', () => {
    const req = {};
    const res = { set: vi.fn() };
    const next = vi.fn();
    const mw = perf.cacheHeadersMiddleware({ maxAge: 600 });
    mw(req, res, next);
    expect(res.set).toHaveBeenCalledWith('Cache-Control', 'public, max-age=600');
    expect(next).toHaveBeenCalled();
  });

  it('sets no-cache headers when noCache is true', () => {
    const req = {};
    const res = { set: vi.fn() };
    const next = vi.fn();
    const mw = perf.cacheHeadersMiddleware({ noCache: true });
    mw(req, res, next);
    expect(res.set).toHaveBeenCalledWith('Cache-Control', expect.stringContaining('no-store'));
  });
});

describe('healthCheckMiddleware', () => {
  it('returns health status for /health path', async () => {
    const req = { path: '/health' };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    await perf.healthCheckMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'healthy' }));
  });

  it('calls next for non-health paths', async () => {
    const req = { path: '/products' };
    const res = {};
    const next = vi.fn();

    await perf.healthCheckMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});

describe('performanceErrorHandler', () => {
  it('handles PerformanceError', () => {
    const err = { name: 'PerformanceError', message: 'test', type: 'performance' };
    const req = { path: '/test', method: 'GET' };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    perf.performanceErrorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('passes unknown errors to next', () => {
    const err = new Error('regular');
    const req = {};
    const res = {};
    const next = vi.fn();

    perf.performanceErrorHandler(err, req, res, next);
    expect(next).toHaveBeenCalledWith(err);
  });
});
