import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import performanceService from '../services/performance.service.js';

describe('Performance Monitoring Integration Tests', () => {
  beforeEach(() => {
    // Clear metrics before each test
    performanceService.metrics.clear();
  });

  afterEach(() => {
    // Clean up after each test
    performanceService.metrics.clear();
  });

  describe('Performance Service Integration', () => {
    it('should track and retrieve API metrics correctly', () => {
      // Track some API metrics
      performanceService.trackAPIResponseTime('/products', 120, 200, false, 'GET');
      performanceService.trackAPIResponseTime('/orders', 80, 200, true, 'GET');
      
      // Verify metrics are stored
      const productMetrics = performanceService.getMetrics('api_/products_GET');
      const orderMetrics = performanceService.getMetrics('api_/orders_GET');
      
      expect(productMetrics).toHaveLength(1);
      expect(orderMetrics).toHaveLength(1);
      
      expect(productMetrics[0].duration).toBe(120);
      expect(productMetrics[0].cacheHit).toBe(false);
      expect(orderMetrics[0].duration).toBe(80);
      expect(orderMetrics[0].cacheHit).toBe(true);
    });

    it('should track database metrics correctly', () => {
      // Track database operations
      performanceService.trackDatabaseQueryTime('find', 'products', 45, 50, 10, true);
      performanceService.trackDatabaseQueryTime('aggregate', 'orders', 180, 200, 5, false);
      
      // Verify metrics are stored
      const productDbMetrics = performanceService.getMetrics('db_products_find');
      const orderDbMetrics = performanceService.getMetrics('db_orders_aggregate');
      
      expect(productDbMetrics).toHaveLength(1);
      expect(orderDbMetrics).toHaveLength(1);
      
      expect(productDbMetrics[0].duration).toBe(45);
      expect(productDbMetrics[0].indexUsed).toBe(true);
      expect(orderDbMetrics[0].duration).toBe(180);
      expect(orderDbMetrics[0].indexUsed).toBe(false);
    });

    it('should generate comprehensive performance summary', () => {
      // Generate various metrics
      performanceService.trackAPIResponseTime('/products', 120, 200, false, 'GET');
      performanceService.trackAPIResponseTime('/orders', 80, 200, true, 'GET');
      performanceService.trackDatabaseQueryTime('find', 'products', 45, 50, 10, true);
      performanceService.trackResourceUsage(45, 60, 50000000, 100000000);
      
      // Get summary
      const summary = performanceService.getPerformanceSummary();
      
      // Verify summary structure
      expect(summary.api).toBeDefined();
      expect(summary.database).toBeDefined();
      expect(summary.system).toBeDefined();
      expect(summary.errorRate).toBeDefined();
      
      // Verify API metrics in summary
      expect(Object.keys(summary.api).length).toBeGreaterThan(0);
      expect(summary.api['api_/products_GET']).toBeDefined();
      expect(summary.api['api_/orders_GET']).toBeDefined();
      
      // Verify database metrics in summary
      expect(Object.keys(summary.database).length).toBeGreaterThan(0);
      expect(summary.database['db_products_find']).toBeDefined();
      
      // Verify system metrics
      expect(summary.system.cpuUsage).toBe(45);
      expect(summary.system.memoryUsage).toBe(60);
    });

    it('should calculate error rates correctly', () => {
      // Track mixed success and error responses
      performanceService.trackAPIResponseTime('/test', 100, 200, false, 'GET'); // success
      performanceService.trackAPIResponseTime('/test', 150, 200, false, 'GET'); // success
      performanceService.trackAPIResponseTime('/test', 120, 404, false, 'GET'); // error
      performanceService.trackAPIResponseTime('/test', 110, 500, false, 'GET'); // error
      
      // Calculate error rate
      const errorRate = performanceService.calculateErrorRate();
      
      // Should be 50% (2 errors out of 4 requests)
      expect(errorRate).toBe(0.5);
    });

    it('should trigger alerts for performance thresholds', (done) => {
      let alertCount = 0;
      
      const alertCallback = (alert) => {
        alertCount++;
        
        if (alert.type === 'slow_api_response') {
          expect(alert.data.duration).toBeGreaterThan(500);
          expect(alert.severity).toBeDefined();
        } else if (alert.type === 'slow_query') {
          expect(alert.data.duration).toBeGreaterThan(200);
        }
        
        // Complete test after receiving expected alerts
        if (alertCount === 2) {
          done();
        }
      };
      
      performanceService.onAlert(alertCallback);
      
      // Trigger alerts
      performanceService.trackAPIResponseTime('/slow', 600, 200, false, 'GET'); // Should trigger slow API alert
      performanceService.trackDatabaseQueryTime('find', 'test', 250, 100, 10, false); // Should trigger slow query alert
      
      // Timeout if alerts don't fire
      setTimeout(() => {
        if (alertCount < 2) {
          done(new Error(`Expected 2 alerts, got ${alertCount}`));
        }
      }, 1000);
    });
  });
});