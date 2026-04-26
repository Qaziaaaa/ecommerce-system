import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fc from 'fast-check';
import performanceService from '../services/performance.service.js';
import alertingService from '../services/alerting.service.js';

describe('Performance Monitoring Foundation - Property-Based Tests', () => {
  let originalConsoleLog, originalConsoleWarn, originalConsoleError;

  beforeEach(() => {
    // Mock console methods to avoid noise in test output
    originalConsoleLog = console.log;
    originalConsoleWarn = console.warn;
    originalConsoleError = console.error;
    console.log = vi.fn();
    console.warn = vi.fn();
    console.error = vi.fn();

    // Clear any existing metrics and alerts
    performanceService.metrics.clear();
    alertingService.alertHistory = [];
  });

  afterEach(() => {
    // Restore console methods
    console.log = originalConsoleLog;
    console.warn = originalConsoleWarn;
    console.error = originalConsoleError;
  });

  describe('Property 26: API Response Time Tracking Completeness', () => {
    /**
     * **Validates: Requirements 7.1**
     * 
     * For any API endpoint receiving requests, the Performance Monitor SHALL track 
     * and record response times for all requests to that endpoint.
     */
    it('should track response times for all API requests', () => {
      fc.assert(fc.property(
        fc.record({
          endpoint: fc.constantFrom('/products', '/orders', '/users', '/cart', '/auth/login'),
          method: fc.constantFrom('GET', 'POST', 'PUT', 'DELETE', 'PATCH'),
          duration: fc.integer({ min: 1, max: 5000 }), // 1ms to 5s
          statusCode: fc.constantFrom(200, 201, 400, 401, 404, 500),
          cacheHit: fc.boolean(),
          userAgent: fc.string({ minLength: 10, maxLength: 100 }),
          ipAddress: fc.ipV4()
        }),
        (requestData) => {
          // Clear metrics before test
          const metricKey = `api_${requestData.endpoint}_${requestData.method}`;
          performanceService.metrics.delete(metricKey);
          
          // Track the API response time
          const metric = performanceService.trackAPIResponseTime(
            requestData.endpoint,
            requestData.duration,
            requestData.statusCode,
            requestData.cacheHit,
            requestData.method,
            requestData.userAgent,
            requestData.ipAddress
          );

          // Verify that the metric was recorded
          expect(metric).toBeDefined();
          expect(metric.endpoint).toBe(requestData.endpoint);
          expect(metric.method).toBe(requestData.method);
          expect(metric.duration).toBe(requestData.duration);
          expect(metric.statusCode).toBe(requestData.statusCode);
          expect(metric.cacheHit).toBe(requestData.cacheHit);
          expect(metric.userAgent).toBe(requestData.userAgent);
          expect(metric.ipAddress).toBe(requestData.ipAddress);
          expect(metric.timestamp).toBeInstanceOf(Date);

          // Verify that the metric is stored in the service
          const storedMetrics = performanceService.getMetrics(metricKey, 1);
          expect(storedMetrics).toHaveLength(1);
          expect(storedMetrics[0]).toEqual(metric);
        }
      ), { numRuns: 50 });
    });

    it('should maintain separate tracking for different endpoint-method combinations', () => {
      fc.assert(fc.property(
        fc.array(fc.record({
          endpoint: fc.constantFrom('/products', '/orders', '/users'),
          method: fc.constantFrom('GET', 'POST', 'PUT'),
          duration: fc.integer({ min: 50, max: 1000 })
        }), { minLength: 3, maxLength: 10 }),
        (requests) => {
          // Clear all metrics before test
          performanceService.metrics.clear();
          
          // Track all requests
          requests.forEach(req => {
            performanceService.trackAPIResponseTime(
              req.endpoint,
              req.duration,
              200,
              false,
              req.method
            );
          });

          // Group requests by endpoint-method combination
          const groupedRequests = requests.reduce((acc, req) => {
            const key = `api_${req.endpoint}_${req.method}`;
            if (!acc[key]) acc[key] = [];
            acc[key].push(req);
            return acc;
          }, {});

          // Verify each group is tracked separately
          Object.entries(groupedRequests).forEach(([key, groupRequests]) => {
            const storedMetrics = performanceService.getMetrics(key);
            expect(storedMetrics.length).toBe(groupRequests.length);
          });
        }
      ), { numRuns: 20 });
    });
  });

  describe('Property 27: Performance Alert Timing', () => {
    /**
     * **Validates: Requirements 7.2**
     * 
     * For any performance metric exceeding configured thresholds, the Performance Monitor 
     * SHALL send alerts within 1 minute of threshold breach.
     */
    it('should trigger alerts immediately when thresholds are exceeded', () => {
      fc.assert(fc.property(
        fc.record({
          endpoint: fc.constantFrom('/products', '/orders', '/users'),
          method: fc.constantFrom('GET', 'POST'),
          // Generate durations that exceed thresholds
          duration: fc.integer({ min: 501, max: 2000 }), // Above 500ms threshold
          cacheHit: fc.boolean()
        }),
        (requestData) => {
          let alertTriggered = false;
          let alertData = null;
          let alertTimestamp = null;

          // Clear any existing alert callbacks to avoid interference
          performanceService.alertCallbacks = [];

          // Set up alert callback to capture alerts
          const alertCallback = (alert) => {
            if (alert.type === 'slow_api_response') {
              alertTriggered = true;
              alertData = alert;
              alertTimestamp = new Date();
            }
          };

          performanceService.onAlert(alertCallback);

          // Record the time before tracking the metric
          const beforeTracking = new Date();

          // Track a slow API response
          performanceService.trackAPIResponseTime(
            requestData.endpoint,
            requestData.duration,
            200,
            requestData.cacheHit,
            requestData.method
          );

          // Record the time after tracking
          const afterTracking = new Date();

          // Verify alert was triggered
          expect(alertTriggered).toBe(true);
          expect(alertData).toBeDefined();
          expect(alertData.type).toBe('slow_api_response');
          expect(alertData.data.endpoint).toBe(requestData.endpoint);
          expect(alertData.data.duration).toBe(requestData.duration);

          // Verify alert timing (should be immediate, within the same millisecond range)
          expect(alertTimestamp.getTime()).toBeGreaterThanOrEqual(beforeTracking.getTime());
          expect(alertTimestamp.getTime()).toBeLessThanOrEqual(afterTracking.getTime() + 100); // Allow 100ms buffer
        }
      ), { numRuns: 50 });
    });

    it('should respect different thresholds for cached vs uncached responses', () => {
      fc.assert(fc.property(
        fc.record({
          endpoint: fc.constantFrom('/products', '/orders'),
          cachedDuration: fc.integer({ min: 201, max: 400 }), // Above 200ms cached threshold
          uncachedDuration: fc.integer({ min: 501, max: 800 }) // Above 500ms uncached threshold
        }),
        (testData) => {
          let cachedAlertTriggered = false;
          let uncachedAlertTriggered = false;

          // Clear any existing alert callbacks
          performanceService.alertCallbacks = [];

          const alertCallback = (alert) => {
            if (alert.type === 'slow_api_response') {
              if (alert.data.cacheHit) {
                cachedAlertTriggered = true;
              } else {
                uncachedAlertTriggered = true;
              }
            }
          };

          performanceService.onAlert(alertCallback);

          // Test cached response (should trigger alert above 200ms)
          performanceService.trackAPIResponseTime(
            testData.endpoint,
            testData.cachedDuration,
            200,
            true, // cached
            'GET'
          );

          // Test uncached response (should trigger alert above 500ms)
          performanceService.trackAPIResponseTime(
            testData.endpoint,
            testData.uncachedDuration,
            200,
            false, // not cached
            'GET'
          );

          // Both should trigger alerts due to exceeding their respective thresholds
          expect(cachedAlertTriggered).toBe(true);
          expect(uncachedAlertTriggered).toBe(true);
        }
      ), { numRuns: 30 });
    });
  });

  describe('Database Performance Metrics Collection', () => {
    /**
     * **Validates: Requirements 7.4**
     * 
     * For any database operation (query, connection pool usage), the Performance Monitor 
     * SHALL collect and track performance metrics.
     */
    it('should track all database operations with complete metrics', () => {
      fc.assert(fc.property(
        fc.record({
          operation: fc.constantFrom('find', 'aggregate', 'save', 'updateOne', 'deleteOne'),
          collection: fc.constantFrom('products', 'orders', 'users', 'categories'),
          duration: fc.integer({ min: 1, max: 1000 }),
          documentsExamined: fc.integer({ min: 0, max: 1000 }),
          documentsReturned: fc.integer({ min: 0, max: 100 }),
          indexUsed: fc.boolean()
        }),
        (dbOperation) => {
          // Track the database operation
          const metric = performanceService.trackDatabaseQueryTime(
            dbOperation.operation,
            dbOperation.collection,
            dbOperation.duration,
            dbOperation.documentsExamined,
            dbOperation.documentsReturned,
            dbOperation.indexUsed
          );

          // Verify that the metric was recorded with all required fields
          expect(metric).toBeDefined();
          expect(metric.operation).toBe(dbOperation.operation);
          expect(metric.collection).toBe(dbOperation.collection);
          expect(metric.duration).toBe(dbOperation.duration);
          expect(metric.documentsExamined).toBe(dbOperation.documentsExamined);
          expect(metric.documentsReturned).toBe(dbOperation.documentsReturned);
          expect(metric.indexUsed).toBe(dbOperation.indexUsed);
          expect(metric.timestamp).toBeInstanceOf(Date);

          // Verify that the metric is stored
          const metricKey = `db_${dbOperation.collection}_${dbOperation.operation}`;
          const storedMetrics = performanceService.getMetrics(metricKey, 1);
          expect(storedMetrics).toHaveLength(1);
          expect(storedMetrics[0]).toEqual(metric);
        }
      ), { numRuns: 100 });
    });

    it('should trigger slow query alerts when duration exceeds threshold', () => {
      fc.assert(fc.property(
        fc.record({
          operation: fc.constantFrom('find', 'aggregate', 'save'),
          collection: fc.constantFrom('products', 'orders', 'users'),
          // Generate durations that exceed the 200ms slow query threshold
          duration: fc.integer({ min: 201, max: 1000 })
        }),
        (slowQuery) => {
          let slowQueryAlertTriggered = false;
          let alertData = null;

          // Clear any existing alert callbacks
          performanceService.alertCallbacks = [];

          const alertCallback = (alert) => {
            if (alert.type === 'slow_query') {
              slowQueryAlertTriggered = true;
              alertData = alert;
            }
          };

          performanceService.onAlert(alertCallback);

          // Track a slow database query
          performanceService.trackDatabaseQueryTime(
            slowQuery.operation,
            slowQuery.collection,
            slowQuery.duration,
            100, // documentsExamined
            10,  // documentsReturned
            false // indexUsed
          );

          // Verify slow query alert was triggered
          expect(slowQueryAlertTriggered).toBe(true);
          expect(alertData).toBeDefined();
          expect(alertData.type).toBe('slow_query');
          expect(alertData.data.operation).toBe(slowQuery.operation);
          expect(alertData.data.collection).toBe(slowQuery.collection);
          expect(alertData.data.duration).toBe(slowQuery.duration);
          expect(alertData.data.threshold).toBe(200); // Default slow query threshold
        }
      ), { numRuns: 50 });
    });
  });

  describe('Error Rate Monitoring', () => {
    /**
     * Test error rate calculation and alerting
     */
    it('should calculate error rates correctly across different request patterns', () => {
      fc.assert(fc.property(
        fc.array(fc.record({
          endpoint: fc.constantFrom('/products', '/orders', '/users'),
          method: fc.constantFrom('GET', 'POST'),
          statusCode: fc.oneof(
            fc.constant(200), // success
            fc.constant(201), // success
            fc.constant(400), // client error
            fc.constant(500)  // server error
          ),
          duration: fc.integer({ min: 50, max: 300 })
        }), { minLength: 10, maxLength: 30 }),
        (requests) => {
          // Clear metrics before test
          performanceService.metrics.clear();
          
          // Track all requests
          requests.forEach(req => {
            performanceService.trackAPIResponseTime(
              req.endpoint,
              req.duration,
              req.statusCode,
              false,
              req.method
            );
          });

          // Calculate expected error rate
          const errorRequests = requests.filter(req => req.statusCode >= 400).length;
          const totalRequests = requests.length;
          const expectedErrorRate = errorRequests / totalRequests;

          // Get actual error rate from service
          const actualErrorRate = performanceService.calculateErrorRate(60000); // 1 minute window

          // Verify error rate calculation is accurate (within small tolerance for floating point)
          expect(Math.abs(actualErrorRate - expectedErrorRate)).toBeLessThan(0.001);
        }
      ), { numRuns: 20 });
    });
  });

  describe('Resource Usage Tracking', () => {
    /**
     * Test system resource monitoring
     */
    it('should track system resource usage and trigger alerts when thresholds are exceeded', () => {
      fc.assert(fc.property(
        fc.record({
          cpuUsage: fc.integer({ min: 0, max: 100 }),
          memoryUsage: fc.integer({ min: 0, max: 100 }),
          heapUsed: fc.integer({ min: 1000000, max: 100000000 }), // 1MB to 100MB
          heapTotal: fc.integer({ min: 2000000, max: 200000000 }) // 2MB to 200MB
        }),
        (resourceData) => {
          let cpuAlertTriggered = false;
          let memoryAlertTriggered = false;

          // Clear any existing alert callbacks
          performanceService.alertCallbacks = [];

          const alertCallback = (alert) => {
            if (alert.type === 'high_cpu_usage') {
              cpuAlertTriggered = true;
            } else if (alert.type === 'high_memory_usage') {
              memoryAlertTriggered = true;
            }
          };

          performanceService.onAlert(alertCallback);

          // Track resource usage
          const metric = performanceService.trackResourceUsage(
            resourceData.cpuUsage,
            resourceData.memoryUsage,
            resourceData.heapUsed,
            resourceData.heapTotal
          );

          // Verify metric was recorded
          expect(metric).toBeDefined();
          expect(metric.cpuUsage).toBe(resourceData.cpuUsage);
          expect(metric.memoryUsage).toBe(resourceData.memoryUsage);
          expect(metric.heapUsed).toBe(resourceData.heapUsed);
          expect(metric.heapTotal).toBe(resourceData.heapTotal);

          // Verify alerts are triggered appropriately
          if (resourceData.cpuUsage > 80) {
            expect(cpuAlertTriggered).toBe(true);
          } else {
            expect(cpuAlertTriggered).toBe(false);
          }

          if (resourceData.memoryUsage > 80) {
            expect(memoryAlertTriggered).toBe(true);
          } else {
            expect(memoryAlertTriggered).toBe(false);
          }
        }
      ), { numRuns: 50 });
    });
  });
});