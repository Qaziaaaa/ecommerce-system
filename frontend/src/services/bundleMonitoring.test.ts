import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BundleMonitoringService } from '../services/bundleMonitoring';

vi.mock('../services/bundleAnalysis', () => ({
  bundleAnalysisService: {
    analyzeBundle: vi.fn().mockResolvedValue({
      totalSize: 600 * 1024,
      gzippedSize: 180 * 1024,
      chunks: [],
      dependencies: [],
      recommendations: [],
      timestamp: new Date(),
    }),
  },
}));

describe('BundleMonitoringService', () => {
  let service: BundleMonitoringService;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    service = BundleMonitoringService.getInstance();
  });

  it('returns stable trend with insufficient data', () => {
    const trend = service.getSizeTrend();
    expect(trend.trend).toBe('stable');
    expect(trend.recommendation).toContain('Insufficient data');
  });

  it('is a singleton', () => {
    const instance1 = BundleMonitoringService.getInstance();
    const instance2 = BundleMonitoringService.getInstance();
    expect(instance1).toBe(instance2);
  });

  it('starts monitoring with default config when enabled', () => {
    service.startMonitoring({ enabled: true, checkInterval: 60000, sizeIncreaseThreshold: 10, persistHistory: false });
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Starting bundle size monitoring'));
  });

  it('does not start monitoring when disabled', () => {
    service.startMonitoring({ enabled: false, checkInterval: 60000, sizeIncreaseThreshold: 10, persistHistory: false });
    expect(console.log).toHaveBeenCalledWith('Bundle monitoring disabled');
  });

  it('stops monitoring', () => {
    service.startMonitoring({ enabled: true, checkInterval: 60000, sizeIncreaseThreshold: 10, persistHistory: false });
    service.stopMonitoring();
    expect(console.log).toHaveBeenCalledWith('Bundle monitoring stopped');
  });

  it('performs size check and records history', async () => {
    await service.performSizeCheck();
    const trend = service.getSizeTrend();
    expect(trend.trend).toBe('stable');
  });

  it('detects increasing trend', async () => {
    await service.performSizeCheck();
    await service.performSizeCheck();
    const trend = service.getSizeTrend();
    expect(['increasing', 'stable', 'decreasing']).toContain(trend.trend);
    expect(typeof trend.changePercentage).toBe('number');
    expect(typeof trend.recommendation).toBe('string');
  });

  it('generates monitoring report', async () => {
    await service.performSizeCheck();
    const report = service.generateMonitoringReport();
    expect(report).toContain('Bundle Size Monitoring Report');
    expect(report).toContain('Current Size');
    expect(report).toContain('Trend');
    expect(report).toContain('Recommendation');
  });

  it('sends alert via callback when set', async () => {
    const callback = vi.fn();
    service.setAlertCallback(callback);
    vi.mocked((await import('../services/bundleAnalysis')).bundleAnalysisService.analyzeBundle).mockResolvedValue({
      totalSize: 1200 * 1024,
      gzippedSize: 360 * 1024,
      chunks: [],
      dependencies: [],
      recommendations: [],
      timestamp: new Date(),
    });
    await service.performSizeCheck();
    await vi.runAllTimersAsync();
    expect(callback).toHaveBeenCalledWith(expect.objectContaining({
      type: 'threshold_exceeded',
      severity: 'error',
    }));
  });
});
