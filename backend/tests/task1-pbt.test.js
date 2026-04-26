import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fc from 'fast-check';
import performanceService from '../services/performance.service.js';
import alertingService from '../services/alerting.service.js';

/**
 * Property-Based Tests for Task 1: Set up performance monitoring foundation
 * 
 * These tests validate the specific properties mentioned in the task requirements:
 * - Task 1.1: Property 26 - API Response Time Tracking Completeness
 * - Task 1.2: Property 27 - Performance Alert Timing
 */

describe('Task 1 Property-Based Tests', () => {
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
    performanceService.alertCallbacks = [];
    alertingService.alertHistory = [];
  });

  afterEach(() => {
    // Restore console methods
    console.log = originalConsoleLog;
    console.warn = originalConsoleWarn;
    console.error = originalConsoleError;
  });

  describe('Task 1.1: Property 26 - API Response Time Tracking Completeness', () => {
    /**
     * **Validates: Requirements 7.1**
     * 
     * For any API endpoint receiving requests, the Performance Monitor SHALL track 
     * and record response times for all requests to that endpoint.
     */
    it('Property 26: API Response Time Tracking Completeness', () => {
      fc.assert(fc.property(
        fc.record({
          endpoint: fc.constantFrom('/products', '/orders', '/users', '/cart', '/categories'),
          method: fc.constantFrom('GET', 'POST', 'PUT', 'DELETE'),
          duration: fc.integer({ min: 1, max: 3000 }),
          statusCode: fc.constantFrom(200, 201, 400, 404, 500),
          cacheHit: fc.boolean(),
          userAgent: fc.string({ minLength: 5, maxLength: 50 }),
          ipAddress: fc.ipV4()
        }),
        (requestData) => {
          // Clear any existing metrics for this endpoint
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

          // Property: All API requests MUST be tracked with complete information
          expect(metric).toBeDefined();
          expect(metric.endpoint).toBe(requestData.endpoint);
          expect(metric.method).toBe(requestData.method);
          expect(metric.duration).toBe(requestData.duration);
          expect(metric.statusCode).toBe(requestData.statusCode);
          expect(metric.cacheHit).toBe(requestData.cacheHit);
          expect(metric.userAgent).toBe(requestData.userAgent);
          expect(metric.ipAddress).toBe(requestData.ipAddress);
          expect(metric.timestamp).toBeInstanceOf(Date);

          // Property: Metrics MUST be retrievable from the service
          const storedMetrics = performanceService.getMetrics(metricKey);
          expect(storedMetrics).toHaveLength(1);
          expect(storedMetrics[0]).toEqual(metric);

          // Property: Metric timestamp MUST be recent (within last second)
          const now = new Date();
          const timeDiff = now.getTime() - metric.timestamp.getTime();
          expect(timeDiff).toBeLessThan(1000); // Within 1 second
        }
      ), { numRuns: 100 });
    });

    it('Property 26 Extension: Separate tracking for different endpoint-method combinations', () => {
      fc.assert(fc.property(
        fc.array(fc.record({
          endpoint: fc.constantFrom('/products', '/orders', '/users'),
          method: fc.constantFrom('GET', 'POST'),
          duration: fc.integer({ min: 10, max: 500 })
        }), { minLength: 2, maxLength: 8 }),
        (requests) => {
          // Clear all metrics
          performanceService.metrics.clear();

          // Track all requests
          const trackedMetrics = requests.map(req => 
            performanceService.trackAPIResponseTime(
              req.endpoint,
              req.duration,
              200,
              false,
              req.method
            )
          );

          // Property: Each unique endpoint-method combination MUST be tracked separately
          const groupedRequests = requests.reduce((acc, req) => {
            const key = `api_${req.endpoint}_${req.method}`;
            if (!acc[key]) acc[key] = [];
            acc[key].push(req);
            return acc;
          }, {});

          // Verify separate tracking
          Object.entries(groupedRequests).forEach(([key, groupRequests]) => {
            const storedMetrics = performanceService.getMetrics(key);
            expect(storedMetrics.length).toBe(groupRequests.length);
            
            // Property: Metrics MUST maintain order and accuracy
            storedMetrics.forEach((metric, index) => {
              expect(metric.endpoint).toBe(groupRequests[index].endpoint);
              expect(metric.method).toBe(groupRequests[index].method);
              expect(metric.duration).toBe(groupRequests[index].duration);
            });
          });

          // Property: Total tracked metrics MUST equal total requests
          const totalStoredMetrics = Object.keys(groupedRequests)
            .reduce((sum, key) => sum + performanceService.getMetrics(key).length, 0);
          expect(totalStoredMetrics).toBe(requests.length);
        }
      ), { numRuns: 50 });
    });
  });

  describe('Task 1.2: Property 27 - Performance Alert Timing', () => {
    /**
     * **Validates: Requirements 7.2**
     * 
     * For any performance metric exceeding configured thresholds, the Performance Monitor 
     * SHALL send alerts within 1 minute of threshold breach.
     */
    it('Property 27: Performance Alert Timing for API Response Times', () => {
      fc.assert(fc.property(
        fc.record({
          endpoint: fc.constantFrom('/products', '/orders', '/users'),
          method: fc.constantFrom('GET', 'POST'),
          // Generate durations that exceed thresholds (500ms for uncached, 200ms for cached)
          slowDuration: fc.integer({ min: 501, max: 2000 }),
          cacheHit: fc.boolean()
        }),
        (testData) => {
          let alertTriggered = false;
          let alertTimestamp = null;
          let alertData = null;

          // Clear existing callbacks
          performanceService.alertCallbacks = [];

          // Set up alert monitoring
          const alertCallback = (alert) => {
            if (alert.type === 'slow_api_response') {
              alertTriggered = true;
              alertTimestamp = new Date();
              alertData = alert;
            }
          };

          performanceService.onAlert(alertCallback);

          // Record timing before tracking
          const beforeTracking = new Date();

          // Track slow API response
          performanceService.trackAPIResponseTime(
            testData.endpoint,
            testData.slowDuration,
            200,
            testData.cacheHit,
            testData.method
          );

          // Record timing after tracking
          const afterTracking = new Date();

          // Property: Alert MUST be triggered for slow responses
          expect(alertTriggered).toBe(true);
          expect(alertData).toBeDefined();
          expect(alertData.type).toBe('slow_api_response');
          expect(alertData.data.endpoint).toBe(testData.endpoint);
          expect(alertData.data.duration).toBe(testData.slowDuration);
          expect(alertData.data.cacheHit).toBe(testData.cacheHit);

          // Property: Alert MUST be triggered immediately (within processing time)
          expect(alertTimestamp).toBeDefined();
          expect(alertTimestamp.getTime()).toBeGreaterThanOrEqual(beforeTracking.getTime());
          expect(alertTimestamp.getTime()).toBeLessThanOrEqual(afterTracking.getTime() + 50); // 50ms buffer

          // Property: Alert severity MUST be appropriate for duration
          const expectedThreshold = testData.cacheHit ? 200 : 500;
          expect(alertData.data.threshold).toBe(expectedThreshold);
          
          if (testData.slowDuration > expectedThreshold * 2) {
            expect(alertData.severity).toBe('high');
          } else {
            expect(alertData.severity).toBe('medium');
          }
        }
      ), { numRuns: 50 });
    });

    it('Property 27: Performance Alert Timing for Database Queries', () => {
      fc.assert(fc.property(
        fc.record({
          operation: fc.constantFrom('find', 'aggregate', 'updateOne', 'deleteOne'),
          collection: fc.constantFrom('products', 'orders', 'users', 'categories'),
          // Generate durations that exceed the 200ms slow query threshold
          slowDuration: fc.integer({ min: 201, max: 1000 }),
          documentsExamined: fc.integer({ min: 1, max: 1000 }),
          documentsReturned: fc.integer({ min: 0, max: 100 }),
          indexUsed: fc.boolean()
        }),
        (queryData) => {
          let alertTriggered = false;
          let alertTimestamp = null;
          let alertData = null;

          // Clear existing callbacks
          performanceService.alertCallbacks = [];

          const alertCallback = (alert) => {
            if (alert.type === 'slow_query') {
              alertTriggered = true;
              alertTimestamp = new Date();
              alertData = alert;
            }
          };

          performanceService.onAlert(alertCallback);

          const beforeTracking = new Date();

          // Track slow database query
          performanceService.trackDatabaseQueryTime(
            queryData.operation,
            queryData.collection,
            queryData.slowDuration,
            queryData.documentsExamined,
            queryData.documentsReturned,
            queryData.indexUsed
          );

          const afterTracking = new Date();

          // Property: Alert MUST be triggered for slow queries
          expect(alertTriggered).toBe(true);
          expect(alertData).toBeDefined();
          expect(alertData.type).toBe('slow_query');
          expect(alertData.data.operation).toBe(queryData.operation);
          expect(alertData.data.collection).toBe(queryData.collection);
          expect(alertData.data.duration).toBe(queryData.slowDuration);
          expect(alertData.data.threshold).toBe(200);

          // Property: Alert timing MUST be immediate
          expect(alertTimestamp.getTime()).toBeGreaterThanOrEqual(beforeTracking.getTime());
          expect(alertTimestamp.getTime()).toBeLessThanOrEqual(afterTracking.getTime() + 50);

          // Property: Alert severity MUST scale with duration
          if (queryData.slowDuration > 600) { // 3x threshold
            expect(alertData.severity).toBe('high');
          } else {
            expect(alertData.severity).toBe('medium');
          }
        }
      ), { numRuns: 30 });
    });

    it('Property 27: Alert Threshold Differentiation', () => {
      fc.assert(fc.property(
        fc.record({
          endpoint: fc.constantFrom('/api/test', '/api/data'),
          cachedDuration: fc.integer({ min: 201, max: 400 }), // Above 200ms cached threshold
          uncachedDuration: fc.integer({ min: 501, max: 800 }) // Above 500ms uncached threshold
        }),
        (testData) => {
          let cachedAlert = null;
          let uncachedAlert = null;

          performanceService.alertCallbacks = [];

          const alertCallback = (alert) => {
            if (alert.type === 'slow_api_response') {
              if (alert.data.cacheHit) {
                cachedAlert = alert;
              } else {
                uncachedAlert = alert;
              }
            }
          };

          performanceService.onAlert(alertCallback);

          // Test cached response threshold
          performanceService.trackAPIResponseTime(
            testData.endpoint,
            testData.cachedDuration,
            200,
            true, // cached
            'GET'
          );

          // Test uncached response threshold
          performanceService.trackAPIResponseTime(
            testData.endpoint,
            testData.uncachedDuration,
            200,
            false, // not cached
            'GET'
          );

          // Property: Different thresholds MUST be applied correctly
          expect(cachedAlert).toBeDefined();
          expect(cachedAlert.data.threshold).toBe(200);
          expect(cachedAlert.data.cacheHit).toBe(true);

          expect(uncachedAlert).toBeDefined();
          expect(uncachedAlert.data.threshold).toBe(500);
          expect(uncachedAlert.data.cacheHit).toBe(false);

          // Property: Both alerts MUST be triggered for their respective thresholds
          expect(cachedAlert.data.duration).toBeGreaterThan(200);
          expect(uncachedAlert.data.duration).toBeGreaterThan(500);
        }
      ), { numRuns: 25 });
    });
  });

  describe('Database Performance Metrics Collection (Requirements 7.4)', () => {
    /**
     * **Validates: Requirements 7.4**
     * 
     * For any database operation (query, connection pool usage), the Performance Monitor 
     * SHALL collect and track performance metrics.
     */
    it('Property 28: Database Performance Metrics Collection Completeness', () => {
      fc.assert(fc.property(
        fc.record({
          operation: fc.constantFrom('find', 'aggregate', 'save', 'updateOne', 'updateMany', 'deleteOne', 'deleteMany'),
          collection: fc.constantFrom('products', 'orders', 'users', 'categories', 'reviews'),
          duration: fc.integer({ min: 1, max: 2000 }),
          documentsExamined: fc.integer({ min: 0, max: 10000 }),
          documentsReturned: fc.integer({ min: 0, max: 1000 }),
          indexUsed: fc.boolean()
        }),
        (dbOperation) => {
          // Clear existing metrics for this operation
          const metricKey = `db_${dbOperation.collection}_${dbOperation.operation}`;
          performanceService.metrics.delete(metricKey);

          // Track database operation
          const metric = performanceService.trackDatabaseQueryTime(
            dbOperation.operation,
            dbOperation.collection,
            dbOperation.duration,
            dbOperation.documentsExamined,
            dbOperation.documentsReturned,
            dbOperation.indexUsed
          );

          // Property: All database operations MUST be tracked with complete metrics
          expect(metric).toBeDefined();
          expect(metric.operation).toBe(dbOperation.operation);
          expect(metric.collection).toBe(dbOperation.collection);
          expect(metric.duration).toBe(dbOperation.duration);
          expect(metric.documentsExamined).toBe(dbOperation.documentsExamined);
          expect(metric.documentsReturned).toBe(dbOperation.documentsReturned);
          expect(metric.indexUsed).toBe(dbOperation.indexUsed);
          expect(metric.timestamp).toBeInstanceOf(Date);

          // Property: Metrics MUST be stored and retrievable
          const storedMetrics = performanceService.getMetrics(metricKey);
          expect(storedMetrics).toHaveLength(1);
          expect(storedMetrics[0]).toEqual(metric);

          // Property: Performance summary MUST include database metrics
          const summary = performanceService.getPerformanceSummary();
          expect(summary.database).toBeDefined();
          expect(summary.database[metricKey]).toBeDefined();
          expect(summary.database[metricKey].count).toBe(1);
          expect(summary.database[metricKey].avgQueryTime).toBe(dbOperation.duration);
        }
      ), { numRuns: 75 });
    });
  });

  describe('System Resource Monitoring', () => {
    /**
     * Test system resource usage tracking and alerting
     */
    it('Property: Resource Usage Alert Triggering', () => {
      fc.assert(fc.property(
        fc.record({
          cpuUsage: fc.integer({ min: 0, max: 100 }),
          memoryUsage: fc.integer({ min: 0, max: 100 }),
          heapUsed: fc.integer({ min: 1000000, max: 500000000 }),
          heapTotal: fc.integer({ min: 2000000, max: 1000000000 })
        }),
        (resourceData) => {
          let cpuAlertTriggered = false;
          let memoryAlertTriggered = false;

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

          // Property: Resource metrics MUST be recorded accurately
          expect(metric.cpuUsage).toBe(resourceData.cpuUsage);
          expect(metric.memoryUsage).toBe(resourceData.memoryUsage);
          expect(metric.heapUsed).toBe(resourceData.heapUsed);
          expect(metric.heapTotal).toBe(resourceData.heapTotal);

          // Property: Alerts MUST be triggered when thresholds are exceeded
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