import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => {
  const perfSummary = vi.fn(() => ({
    database: {}, api: {}, errorRate: 0.005, totalRequests: 100, avgResponseTime: 150,
  }));
  return {
    mockGetPerformanceSummary: perfSummary,
    mockGetMetrics: vi.fn(),
    mockTrackAPIResponseTime: vi.fn(),
    mockTriggerAlert: vi.fn(),
    mockAlertStats: vi.fn(() => ({ total: 5, bySeverity: { low: 3, high: 2 } })),
  };
});

vi.mock('../services/performance.service.js', () => ({
  default: {
    getPerformanceSummary: h.mockGetPerformanceSummary,
    getMetrics: h.mockGetMetrics,
    trackAPIResponseTime: h.mockTrackAPIResponseTime,
    triggerAlert: h.mockTriggerAlert,
  },
}));

vi.mock('../services/alerting.service.js', () => ({
  default: {
    getAlertStatistics: h.mockAlertStats,
    addAlertRule: vi.fn(),
    addAlertChannel: vi.fn().mockReturnValue('channel-1'),
  },
}));

vi.mock('../utils/database-performance.js', () => ({
  default: { getPerformanceStats: vi.fn(() => ({ connectionState: 'connected' })) },
}));

vi.mock('../utils/circuit-breaker.js', () => ({
  circuitBreakers: {
    'api-breaker': { getStatus: vi.fn(() => ({ state: 'closed' })) },
    'db-breaker': { getStatus: vi.fn(() => ({ state: 'half-open' })) },
  },
}));

vi.mock('../middlewares/resilience.middleware.js', () => ({
  errorRateMonitor: { getStats: vi.fn(() => ({ currentRate: 0.01 })) },
  degradationManager: { getStatus: vi.fn(() => ({ degraded: false })) },
}));

vi.mock('../services/deployment.service.js', () => ({
  default: { getDeploymentReport: vi.fn(() => ({ deployments: [] })) },
}));

vi.mock('../utils/logger.js', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import {
  receiveMetrics,
  getPerformanceSummary,
  getMetrics,
  getAlerts,
  configureAlerts,
  addAlertChannel,
  getDeploymentReport,
  getDailyReport,
  healthCheck,
} from '../controllers/performance.controller.js';
import performanceService from '../services/performance.service.js';
import alertingService from '../services/alerting.service.js';

describe('performance.controller', () => {
  let req, res;

  beforeEach(() => {
    vi.clearAllMocks();
    req = { body: {}, query: {} };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
  });

  describe('receiveMetrics', () => {
    it('should return 400 when type is missing', async () => {
      req.body = { data: {} };
      await receiveMetrics(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'error' }));
    });

    it('should return 400 when data is missing', async () => {
      req.body = { type: 'metric' };
      await receiveMetrics(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should handle metric type', async () => {
      req.body = {
        type: 'metric',
        data: { name: 'LCP', value: 2500, rating: 'needs-improvement', sessionId: 's1', url: '/home' },
      };
      await receiveMetrics(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(performanceService.trackAPIResponseTime).toHaveBeenCalledWith(
        'frontend_lcp', 2500, 300, false, 'METRIC', '', '',
      );
    });

    it('should trigger alert for poor web vitals', async () => {
      req.body = {
        type: 'metric',
        data: { name: 'LCP', value: 5000, rating: 'poor', sessionId: 's1', url: '/home' },
      };
      await receiveMetrics(req, res);
      expect(performanceService.triggerAlert).toHaveBeenCalledWith('poor_web_vital', expect.any(Object));
    });

    it('should handle navigation type', async () => {
      req.body = {
        type: 'navigation',
        data: { loadComplete: 3000, domContentLoaded: 1500, sessionId: 's1', url: '/home' },
      };
      await receiveMetrics(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(performanceService.trackAPIResponseTime).toHaveBeenCalledWith(
        'frontend_page_load', 3000, 200, false, 'NAVIGATION', '', '',
      );
    });

    it('should handle slow-resource type', async () => {
      req.body = {
        type: 'slow-resource',
        data: { name: 'bundle.js', type: 'script', loadTime: 2000, size: 500000, cached: false, sessionId: 's1', url: '/home' },
      };
      await receiveMetrics(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(performanceService.trackAPIResponseTime).toHaveBeenCalled();
    });

    it('should handle page-load type', async () => {
      req.body = {
        type: 'page-load',
        data: { pageName: 'home', loadTime: 1500, sessionId: 's1', url: '/home' },
      };
      await receiveMetrics(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(performanceService.trackAPIResponseTime).toHaveBeenCalledWith(
        'frontend_page_home', 1500, 200, false, 'PAGE_LOAD', '', '',
      );
    });

    it('should handle interaction type', async () => {
      req.body = {
        type: 'interaction',
        data: { action: 'click', element: 'button', duration: 200, sessionId: 's1', url: '/home' },
      };
      await receiveMetrics(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(performanceService.trackAPIResponseTime).toHaveBeenCalledWith(
        'frontend_interaction_click', 200, 200, false, 'INTERACTION', '', '',
      );
    });

    it('should warn on unknown metric type', async () => {
      req.body = { type: 'unknown-type', data: {} };
      await receiveMetrics(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 500 on error', async () => {
      req.body = { type: 'metric', data: {} };
      await receiveMetrics(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getPerformanceSummary', () => {
    it('should return summary with all components', async () => {
      await getPerformanceSummary(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: expect.objectContaining({
            performance: expect.any(Object),
            database: expect.any(Object),
            alerts: expect.any(Object),
            errorRate: expect.any(Object),
            circuitBreakers: expect.any(Object),
            degradation: expect.any(Object),
            timestamp: expect.any(String),
          }),
        }),
      );
    });
  });

  describe('getMetrics', () => {
    it('should return 400 when no endpoint or type', async () => {
      req.query = {};
      await getMetrics(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return metrics for endpoint', async () => {
      req.query = { endpoint: 'api/products' };
      h.mockGetMetrics.mockReturnValue([{ timestamp: Date.now(), responseTime: 100 }]);
      await getMetrics(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'success' }));
    });

    it('should return metrics for type', async () => {
      req.query = { type: 'frontend_lcp' };
      h.mockGetMetrics.mockReturnValue([]);
      await getMetrics(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should pass limit from query', async () => {
      req.query = { endpoint: 'api/products', limit: '50' };
      h.mockGetMetrics.mockReturnValue([]);
      await getMetrics(req, res);
      expect(performanceService.getMetrics).toHaveBeenCalledWith('api/products', 50);
    });
  });

  describe('getAlerts', () => {
    it('should return alert statistics', async () => {
      h.mockAlertStats.mockReturnValue({ total: 5, bySeverity: { low: 3, high: 2 } });
      await getAlerts(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'success' }));
    });
  });

  describe('configureAlerts', () => {
    it('should return 400 if missing type', async () => {
      req.body = { rule: {} };
      await configureAlerts(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 if missing rule', async () => {
      req.body = { type: 'error_rate' };
      await configureAlerts(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should configure alert rule', async () => {
      req.body = { type: 'error_rate', rule: { threshold: 0.05 } };
      await configureAlerts(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(alertingService.addAlertRule).toHaveBeenCalledWith('error_rate', { threshold: 0.05 });
    });
  });

  describe('addAlertChannel', () => {
    it('should return 400 if missing type', async () => {
      req.body = { config: {} };
      await addAlertChannel(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 if missing config', async () => {
      req.body = { type: 'email' };
      await addAlertChannel(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should add alert channel', async () => {
      req.body = { type: 'email', config: { to: 'admin@test.com' }, severityFilter: 'high' };
      await addAlertChannel(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(alertingService.addAlertChannel).toHaveBeenCalledWith({
        type: 'email', config: { to: 'admin@test.com' }, severityFilter: 'high',
      });
    });
  });

  describe('getDeploymentReport', () => {
    it('should return deployment report', async () => {
      await getDeploymentReport(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'success', data: { deployments: [] } }),
      );
    });
  });

  describe('getDailyReport', () => {
    it('should return daily report with recommendations', async () => {
      h.mockGetPerformanceSummary.mockReturnValue({
        errorRate: 0.02,
        api: {
          '/api/products': { avgResponseTime: 300, maxResponseTime: 500 },
          '/api/orders': { avgResponseTime: 100, maxResponseTime: 200 },
        },
        database: {
          'products.find': { avgQueryTime: 100, maxQueryTime: 200 },
          'orders.find': { avgQueryTime: 50, maxQueryTime: 100 },
        },
      });
      h.mockAlertStats.mockReturnValue({ total: 10, bySeverity: { low: 8, high: 2 } });

      await getDailyReport(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      const callArg = res.json.mock.calls[0][0];
      expect(callArg.status).toBe('success');
      expect(callArg.data.recommendations).toBeDefined();
      expect(callArg.data.period).toBe('24h');
    });

    it('should flag high error rate', async () => {
      h.mockGetPerformanceSummary.mockReturnValue({
        errorRate: 0.03, api: {}, database: {},
      });
      h.mockAlertStats.mockReturnValue({ total: 0, bySeverity: {} });

      await getDailyReport(req, res);
      const callArg = res.json.mock.calls[0][0];
      expect(callArg.data.recommendations.length).toBeGreaterThan(0);
      expect(callArg.data.recommendations[0].area).toBe('Error Rate');
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status', async () => {
      await healthCheck(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      const callArg = res.json.mock.calls[0][0];
      expect(callArg.status).toBe('healthy');
      expect(callArg.uptime).toBeGreaterThanOrEqual(0);
      expect(callArg.memory).toBeDefined();
    });

    it('should return degraded when memory > 90%', async () => {
      const origMemoryUsage = process.memoryUsage;
      process.memoryUsage = vi.fn(() => ({ heapUsed: 950, heapTotal: 1000 }));
      await healthCheck(req, res);
      const callArg = res.json.mock.calls[0][0];
      expect(callArg.status).toBe('degraded');
      process.memoryUsage = origMemoryUsage;
    });

    it('should return 503 on error', async () => {
      h.mockGetPerformanceSummary.mockImplementation(() => { throw new Error('fail'); });
      await healthCheck(req, res);
      expect(res.status).toHaveBeenCalledWith(503);
    });
  });
});
