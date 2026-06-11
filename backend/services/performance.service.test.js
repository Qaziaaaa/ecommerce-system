import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
vi.mock('../utils/logger.js', () => ({ default: mockLogger }));

let performanceService;

beforeEach(async () => {
  vi.clearAllMocks();
  performanceService = (await import('./performance.service.js')).default;
  performanceService.metrics.clear();
});

describe('PerformanceService', () => {
  it('exports a singleton', () => {
    expect(performanceService.constructor.name).toBe('PerformanceService');
    expect(performanceService.thresholds).toBeDefined();
  });

  it('trackAPIResponseTime stores and logs metric', () => {
    const metric = performanceService.trackAPIResponseTime('/test', 150, 200, false, 'GET', 'test-agent', '127.0.0.1');
    expect(metric.endpoint).toBe('/test');
    expect(metric.duration).toBe(150);
    expect(metric.method).toBe('GET');
    expect(mockLogger.info).toHaveBeenCalledWith('API Performance Metric', expect.any(Object));
  });

  it('trackAPIResponseTime triggers alert for slow uncached response', () => {
    const alertSpy = vi.spyOn(performanceService, 'triggerAlert');
    performanceService.trackAPIResponseTime('/slow', 600, 200, false);
    expect(alertSpy).toHaveBeenCalledWith('slow_api_response', expect.any(Object));
    alertSpy.mockRestore();
  });

  it('tracks API with cacheHit', () => {
    const metric = performanceService.trackAPIResponseTime('/fast', 50, 200, true, 'GET');
    expect(metric.cacheHit).toBe(true);
  });

  it('trackDatabaseQueryTime stores and logs metric', () => {
    const metric = performanceService.trackDatabaseQueryTime('find', 'users', 50, 10, 5, true);
    expect(metric.operation).toBe('find');
    expect(metric.collection).toBe('users');
    expect(mockLogger.info).toHaveBeenCalledWith('Database Performance Metric', expect.any(Object));
  });

  it('trackDatabaseQueryTime warns on slow query', () => {
    performanceService.trackDatabaseQueryTime('aggregate', 'orders', 500, 100, 10, false);
    expect(mockLogger.warn).toHaveBeenCalledWith('Slow Database Query Detected', expect.any(Object));
  });

  it('trackResourceUsage stores metric', () => {
    const metric = performanceService.trackResourceUsage(50, 60, 1000000, 2000000);
    expect(metric.cpuUsage).toBe(50);
    expect(metric.memoryUsage).toBe(60);
  });

  it('trackResourceUsage triggers alert for high CPU', () => {
    const alertSpy = vi.spyOn(performanceService, 'triggerAlert');
    performanceService.trackResourceUsage(95, 50, 1, 2);
    expect(alertSpy).toHaveBeenCalledWith('high_cpu_usage', expect.any(Object));
    alertSpy.mockRestore();
  });

  it('calculateErrorRate returns 0 with no metrics', () => {
    expect(performanceService.calculateErrorRate()).toBe(0);
  });

  it('getMetrics returns stored metrics', () => {
    performanceService.trackAPIResponseTime('/ep', 100, 200, false);
    const metrics = performanceService.getMetrics('api_/ep_GET');
    expect(metrics).toHaveLength(1);
  });

  it('getPerformanceSummary returns summary structure', () => {
    const summary = performanceService.getPerformanceSummary();
    expect(summary).toHaveProperty('api');
    expect(summary).toHaveProperty('database');
    expect(summary).toHaveProperty('system');
    expect(summary).toHaveProperty('errorRate');
  });

  it('onAlert registers callback', () => {
    const cb = vi.fn();
    performanceService.onAlert(cb);
    performanceService.triggerAlert('test', { msg: 'hello' });
    expect(cb).toHaveBeenCalled();
  });

  it('clearOldMetrics removes old entries', () => {
    performanceService.trackAPIResponseTime('/old', 100, 200, false);
    performanceService.clearOldMetrics(-1);
    for (const [, metrics] of performanceService.metrics) {
      expect(metrics).toHaveLength(0);
    }
  });

  it('getAlertSeverity returns correct levels', () => {
    expect(performanceService.getAlertSeverity('slow_api_response', { duration: 200, threshold: 100 })).toBe('medium');
    expect(performanceService.getAlertSeverity('slow_api_response', { duration: 300, threshold: 100 })).toBe('high');
    expect(performanceService.getAlertSeverity('high_error_rate', { errorRate: 10 })).toBe('critical');
    expect(performanceService.getAlertSeverity('high_cpu_usage', { cpuUsage: 95 })).toBe('critical');
    expect(performanceService.getAlertSeverity('unknown', {})).toBe('medium');
  });
});
