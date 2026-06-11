import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
vi.mock('../utils/logger.js', () => ({ default: mockLogger }));

const getPerformanceSummary = vi.fn(() => ({ errorRate: 0, api: {}, database: {} }));
vi.mock('./performance.service.js', () => ({
  default: { getPerformanceSummary },
}));

let deploymentService;

beforeEach(async () => {
  vi.clearAllMocks();
  deploymentService = (await import('./deployment.service.js')).default;
});

describe('DeploymentService', () => {
  it('exports a singleton with deploymentId', () => {
    expect(deploymentService.deploymentId).toMatch(/^deploy-/);
    expect(deploymentService.startTime).toBeDefined();
  });

  it('getDeploymentReport returns full report structure', () => {
    const report = deploymentService.getDeploymentReport();
    expect(report.deploymentId).toMatch(/^deploy-/);
    expect(report).toHaveProperty('startTime');
    expect(report).toHaveProperty('uptimeMs');
    expect(report).toHaveProperty('snapshots');
    expect(report).toHaveProperty('trend');
    expect(report.nodeVersion).toBeDefined();
    expect(report.environment).toBeDefined();
  });

  it('trend returns insufficient_data when no startup snapshot', () => {
    const report = deploymentService.getDeploymentReport();
    expect(report.trend.status).toBe('insufficient_data');
  });

  it('_captureSnapshot returns snapshot with phase', () => {
    const snapshot = deploymentService._captureSnapshot('manual');
    expect(snapshot.phase).toBe('manual');
    expect(snapshot.timestamp).toBeDefined();
    expect(snapshot.memory).toHaveProperty('heapUsedMB');
    expect(snapshot.performance).toHaveProperty('errorRate');
  });

  it('_formatUptime formats correctly', () => {
    const fmt = deploymentService._formatUptime;
    expect(fmt(5000)).toBe('5s');
    expect(fmt(65000)).toBe('1m 5s');
    expect(fmt(3600000)).toBe('1h 0m');
    expect(fmt(86400000)).toBe('1d 0h');
  });

  it('_generateDeploymentId returns deploy- prefix', () => {
    const id = deploymentService._generateDeploymentId();
    expect(id).toMatch(/^deploy-/);
  });
});
