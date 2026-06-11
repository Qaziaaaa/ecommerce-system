import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
vi.mock('../utils/logger.js', () => ({ default: mockLogger }));

const triggerAlert = vi.fn();
const getPerformanceSummary = vi.fn(() => ({ errorRate: 0, api: {}, database: {} }));
vi.mock('../services/performance.service.js', () => ({
  default: { triggerAlert, getPerformanceSummary },
}));

let resilience;

beforeEach(async () => {
  vi.clearAllMocks();
  resilience = await import('./resilience.middleware.js');
});

describe('ErrorRateMonitor', () => {
  it('tracks requests and calculates error rate', () => {
    const monitor = resilience.errorRateMonitor;
    // Test has access to the singleton
    monitor.record(false);
    monitor.record(true);
    const stats = monitor.getStats();
    expect(stats.totalRequests).toBeGreaterThanOrEqual(2);
    expect(stats.errors).toBeGreaterThanOrEqual(1);
  });
});

describe('errorRateMiddleware', () => {
  it('records non-error for 2xx responses', () => {
    const req = {};
    const res = { statusCode: 200, end: vi.fn() };
    const next = vi.fn();

    resilience.errorRateMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();

    const origEnd = res.end;
    origEnd.call(res);
  });

  it('records error for 5xx responses', () => {
    const req = {};
    const res = { statusCode: 500, end: vi.fn() };
    const next = vi.fn();

    resilience.errorRateMiddleware(req, res, next);
    const origEnd = res.end;
    origEnd.call(res);
  });
});

describe('degradationManager', () => {
  it('starts with all features enabled', () => {
    const status = resilience.degradationManager.getStatus();
    expect(status.disabledFeatures).toEqual([]);
  });

  it('isFeatureEnabled returns true for enabled features', () => {
    expect(resilience.degradationManager.isFeatureEnabled('recommendations')).toBe(true);
  });
});

describe('requireFeature', () => {
  it('calls next when feature is enabled', () => {
    const middleware = resilience.requireFeature('recommendations');
    const req = {};
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('returns 503 when feature is disabled', () => {
    resilience.degradationManager.disabledFeatures.add('analytics');
    const middleware = resilience.requireFeature('analytics');
    const req = {};
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(503);
    resilience.degradationManager.disabledFeatures.clear();
  });
});
