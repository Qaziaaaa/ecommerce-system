import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
vi.mock('../utils/logger.js', () => ({ default: mockLogger }));

const getPerformanceSummary = vi.fn(() => ({ errorRate: 0, api: {}, database: {} }));
vi.mock('./performance.service.js', () => ({
  default: {
    onAlert: vi.fn(),
    getPerformanceSummary,
    triggerAlert: vi.fn(),
  },
}));

let alertingService;

beforeEach(async () => {
  vi.clearAllMocks();
  alertingService = (await import('./alerting.service.js')).default;
});

describe('AlertingService', () => {
  it('exports a singleton with alert rules', () => {
    expect(alertingService.alertRules.size).toBeGreaterThan(0);
    expect(alertingService.alertRules.has('slow_api_response')).toBe(true);
  });

  it('addAlertRule adds a rule', () => {
    alertingService.addAlertRule('custom', { threshold: 100, severity: 'low' });
    expect(alertingService.alertRules.has('custom')).toBe(true);
  });

  it('addAlertChannel adds a channel', () => {
    alertingService.addAlertChannel({ type: 'console', config: {}, severityFilter: ['high'] });
    expect(alertingService.alertChannels.length).toBeGreaterThanOrEqual(1);
  });

  it('processAlert handles an alert via console channel', async () => {
    const result = await alertingService.processAlert({ type: 'test_alert', severity: 'medium', data: {} });
    expect(result).toBeUndefined();
  });

  it('shouldSuppressAlert returns false for unknown type', () => {
    expect(alertingService.shouldSuppressAlert({ type: 'unknown' })).toBe(false);
  });

  it('isInCooldown returns false for unknown type', () => {
    expect(alertingService.isInCooldown({ type: 'unknown' })).toBe(false);
  });

  it('enrichAlert adds system context', async () => {
    const enriched = await alertingService.enrichAlert({ type: 'test', severity: 'high', data: {} });
    expect(enriched.systemContext).toBeDefined();
    expect(enriched.systemContext.memoryUsage).toBeDefined();
  });

  it('sendToConsole logs to console.warn for high severity', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    alertingService.sendToConsole({ severity: 'high', message: 'Test alert', data: {} });
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('getAlertStatistics returns counts', () => {
    const stats = alertingService.getAlertStatistics(3600000);
    expect(stats).toHaveProperty('total');
    expect(stats).toHaveProperty('bySeverity');
    expect(stats).toHaveProperty('escalated');
  });

  it('getEscalatedSeverity returns next level', () => {
    expect(alertingService.getEscalatedSeverity('low')).toBe('medium');
    expect(alertingService.getEscalatedSeverity('high')).toBe('critical');
    expect(alertingService.getEscalatedSeverity('critical')).toBe('critical');
  });
});
