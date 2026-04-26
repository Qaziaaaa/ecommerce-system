import logger from '../utils/logger.js';

/**
 * Performance monitoring service for tracking API response times,
 * database query performance, and system metrics
 */
class PerformanceService {
  constructor() {
    this.metrics = new Map();
    this.thresholds = {
      apiResponseTime: {
        cached: 200, // 200ms for cached responses
        uncached: 500, // 500ms for non-cached responses
      },
      databaseQueryTime: {
        simple: 100, // 100ms for simple queries
        aggregation: 300, // 300ms for aggregation queries
        slow: 200, // 200ms threshold for slow query logging
      },
      errorRate: 0.01, // 1% error rate threshold
      resourceUsage: {
        cpu: 80, // 80% CPU usage threshold
        memory: 80, // 80% memory usage threshold
      },
    };
    this.alertCallbacks = [];
  }

  /**
   * Track API response time
   * @param {string} endpoint - API endpoint
   * @param {number} duration - Response time in milliseconds
   * @param {number} statusCode - HTTP status code
   * @param {boolean} cacheHit - Whether response was served from cache
   * @param {string} method - HTTP method
   * @param {string} userAgent - User agent string
   * @param {string} ipAddress - Client IP address
   */
  trackAPIResponseTime(endpoint, duration, statusCode, cacheHit = false, method = 'GET', userAgent = '', ipAddress = '') {
    const timestamp = new Date();
    const metricKey = `api_${endpoint}_${method}`;
    
    // Store metric
    if (!this.metrics.has(metricKey)) {
      this.metrics.set(metricKey, []);
    }
    
    const metric = {
      timestamp,
      endpoint,
      method,
      duration,
      statusCode,
      cacheHit,
      userAgent,
      ipAddress,
    };
    
    this.metrics.get(metricKey).push(metric);
    
    // Keep only last 1000 metrics per endpoint to prevent memory leaks
    const metrics = this.metrics.get(metricKey);
    if (metrics.length > 1000) {
      metrics.shift();
    }
    
    // Log performance metric
    logger.info('API Performance Metric', {
      endpoint,
      method,
      duration,
      statusCode,
      cacheHit,
      userAgent: userAgent.substring(0, 50), // Truncate for log readability
      ipAddress,
    });
    
    // Check thresholds and trigger alerts
    this.checkAPIResponseTimeThreshold(endpoint, duration, cacheHit);
    
    return metric;
  }

  /**
   * Track database query performance
   * @param {string} operation - Database operation (find, aggregate, etc.)
   * @param {string} collection - Collection name
   * @param {number} duration - Query execution time in milliseconds
   * @param {number} documentsExamined - Number of documents examined
   * @param {number} documentsReturned - Number of documents returned
   * @param {boolean} indexUsed - Whether an index was used
   */
  trackDatabaseQueryTime(operation, collection, duration, documentsExamined = 0, documentsReturned = 0, indexUsed = false) {
    const timestamp = new Date();
    const metricKey = `db_${collection}_${operation}`;
    
    // Store metric
    if (!this.metrics.has(metricKey)) {
      this.metrics.set(metricKey, []);
    }
    
    const metric = {
      timestamp,
      operation,
      collection,
      duration,
      documentsExamined,
      documentsReturned,
      indexUsed,
    };
    
    this.metrics.get(metricKey).push(metric);
    
    // Keep only last 1000 metrics per collection/operation
    const metrics = this.metrics.get(metricKey);
    if (metrics.length > 1000) {
      metrics.shift();
    }
    
    // Log database performance metric
    logger.info('Database Performance Metric', {
      operation,
      collection,
      duration,
      documentsExamined,
      documentsReturned,
      indexUsed,
    });
    
    // Check for slow queries
    if (duration > this.thresholds.databaseQueryTime.slow) {
      logger.warn('Slow Database Query Detected', {
        operation,
        collection,
        duration,
        threshold: this.thresholds.databaseQueryTime.slow,
        documentsExamined,
        indexUsed,
      });
      
      this.triggerAlert('slow_query', {
        operation,
        collection,
        duration,
        threshold: this.thresholds.databaseQueryTime.slow,
      });
    }
    
    return metric;
  }

  /**
   * Track system resource usage
   * @param {number} cpuUsage - CPU usage percentage
   * @param {number} memoryUsage - Memory usage percentage
   * @param {number} heapUsed - Heap memory used in bytes
   * @param {number} heapTotal - Total heap memory in bytes
   */
  trackResourceUsage(cpuUsage, memoryUsage, heapUsed, heapTotal) {
    const timestamp = new Date();
    const metricKey = 'system_resources';
    
    if (!this.metrics.has(metricKey)) {
      this.metrics.set(metricKey, []);
    }
    
    const metric = {
      timestamp,
      cpuUsage,
      memoryUsage,
      heapUsed,
      heapTotal,
    };
    
    this.metrics.get(metricKey).push(metric);
    
    // Keep only last 100 resource metrics
    const metrics = this.metrics.get(metricKey);
    if (metrics.length > 100) {
      metrics.shift();
    }
    
    // Log resource usage
    logger.info('System Resource Usage', {
      cpuUsage,
      memoryUsage,
      heapUsed,
      heapTotal,
    });
    
    // Check resource thresholds
    if (cpuUsage > this.thresholds.resourceUsage.cpu) {
      this.triggerAlert('high_cpu_usage', {
        cpuUsage,
        threshold: this.thresholds.resourceUsage.cpu,
      });
    }
    
    if (memoryUsage > this.thresholds.resourceUsage.memory) {
      this.triggerAlert('high_memory_usage', {
        memoryUsage,
        threshold: this.thresholds.resourceUsage.memory,
      });
    }
    
    return metric;
  }

  /**
   * Check API response time threshold and trigger alerts
   * @param {string} endpoint - API endpoint
   * @param {number} duration - Response time in milliseconds
   * @param {boolean} cacheHit - Whether response was served from cache
   */
  checkAPIResponseTimeThreshold(endpoint, duration, cacheHit) {
    const threshold = cacheHit 
      ? this.thresholds.apiResponseTime.cached 
      : this.thresholds.apiResponseTime.uncached;
    
    if (duration > threshold) {
      logger.warn('API Response Time Threshold Exceeded', {
        endpoint,
        duration,
        threshold,
        cacheHit,
      });
      
      this.triggerAlert('slow_api_response', {
        endpoint,
        duration,
        threshold,
        cacheHit,
      });
    }
  }

  /**
   * Calculate error rate for a given time period
   * @param {number} timeWindowMs - Time window in milliseconds (default: 5 minutes)
   * @returns {number} Error rate as a percentage
   */
  calculateErrorRate(timeWindowMs = 5 * 60 * 1000) {
    const now = new Date();
    const cutoff = new Date(now.getTime() - timeWindowMs);
    
    let totalRequests = 0;
    let errorRequests = 0;
    
    // Iterate through all API metrics
    for (const [key, metrics] of this.metrics.entries()) {
      if (key.startsWith('api_')) {
        const recentMetrics = metrics.filter(m => m.timestamp >= cutoff);
        totalRequests += recentMetrics.length;
        errorRequests += recentMetrics.filter(m => m.statusCode >= 400).length;
      }
    }
    
    if (totalRequests === 0) return 0;
    
    const errorRate = errorRequests / totalRequests;
    
    // Check error rate threshold
    if (errorRate > this.thresholds.errorRate) {
      logger.warn('High Error Rate Detected', {
        errorRate: errorRate * 100,
        threshold: this.thresholds.errorRate * 100,
        totalRequests,
        errorRequests,
        timeWindowMs,
      });
      
      this.triggerAlert('high_error_rate', {
        errorRate: errorRate * 100,
        threshold: this.thresholds.errorRate * 100,
        totalRequests,
        errorRequests,
      });
    }
    
    return errorRate;
  }

  /**
   * Get performance metrics for a specific endpoint or operation
   * @param {string} metricKey - Metric key (e.g., 'api_/products_GET')
   * @param {number} limit - Maximum number of metrics to return
   * @returns {Array} Array of metrics
   */
  getMetrics(metricKey, limit = 100) {
    const metrics = this.metrics.get(metricKey) || [];
    return metrics.slice(-limit);
  }

  /**
   * Get performance summary for all endpoints
   * @returns {Object} Performance summary
   */
  getPerformanceSummary() {
    const summary = {
      api: {},
      database: {},
      system: {},
      errorRate: this.calculateErrorRate(),
    };
    
    // Summarize API metrics
    for (const [key, metrics] of this.metrics.entries()) {
      if (key.startsWith('api_')) {
        const recentMetrics = metrics.slice(-100);
        if (recentMetrics.length > 0) {
          const durations = recentMetrics.map(m => m.duration);
          summary.api[key] = {
            count: recentMetrics.length,
            avgResponseTime: durations.reduce((a, b) => a + b, 0) / durations.length,
            minResponseTime: Math.min(...durations),
            maxResponseTime: Math.max(...durations),
            cacheHitRate: recentMetrics.filter(m => m.cacheHit).length / recentMetrics.length,
          };
        }
      } else if (key.startsWith('db_')) {
        const recentMetrics = metrics.slice(-100);
        if (recentMetrics.length > 0) {
          const durations = recentMetrics.map(m => m.duration);
          summary.database[key] = {
            count: recentMetrics.length,
            avgQueryTime: durations.reduce((a, b) => a + b, 0) / durations.length,
            minQueryTime: Math.min(...durations),
            maxQueryTime: Math.max(...durations),
            indexUsageRate: recentMetrics.filter(m => m.indexUsed).length / recentMetrics.length,
          };
        }
      } else if (key === 'system_resources') {
        const recentMetrics = metrics.slice(-10);
        if (recentMetrics.length > 0) {
          const latest = recentMetrics[recentMetrics.length - 1];
          summary.system = {
            cpuUsage: latest.cpuUsage,
            memoryUsage: latest.memoryUsage,
            heapUsed: latest.heapUsed,
            heapTotal: latest.heapTotal,
          };
        }
      }
    }
    
    return summary;
  }

  /**
   * Register an alert callback function
   * @param {Function} callback - Function to call when alert is triggered
   */
  onAlert(callback) {
    this.alertCallbacks.push(callback);
  }

  /**
   * Trigger an alert
   * @param {string} type - Alert type
   * @param {Object} data - Alert data
   */
  triggerAlert(type, data) {
    const alert = {
      type,
      severity: this.getAlertSeverity(type, data),
      message: this.getAlertMessage(type, data),
      data,
      timestamp: new Date(),
    };
    
    logger.warn('Performance Alert Triggered', alert);
    
    // Call all registered alert callbacks
    this.alertCallbacks.forEach(callback => {
      try {
        callback(alert);
      } catch (error) {
        logger.error('Error in alert callback', { error: error.message });
      }
    });
  }

  /**
   * Get alert severity based on type and data
   * @param {string} type - Alert type
   * @param {Object} data - Alert data
   * @returns {string} Severity level
   */
  getAlertSeverity(type, data) {
    switch (type) {
      case 'slow_api_response':
        return data.duration > data.threshold * 2 ? 'high' : 'medium';
      case 'slow_query':
        return data.duration > data.threshold * 3 ? 'high' : 'medium';
      case 'high_error_rate':
        return data.errorRate > 5 ? 'critical' : 'high';
      case 'high_cpu_usage':
      case 'high_memory_usage':
        return data.cpuUsage > 90 || data.memoryUsage > 90 ? 'critical' : 'high';
      default:
        return 'medium';
    }
  }

  /**
   * Get alert message based on type and data
   * @param {string} type - Alert type
   * @param {Object} data - Alert data
   * @returns {string} Alert message
   */
  getAlertMessage(type, data) {
    switch (type) {
      case 'slow_api_response':
        return `API endpoint ${data.endpoint} responded in ${data.duration}ms (threshold: ${data.threshold}ms)`;
      case 'slow_query':
        return `Database query on ${data.collection} took ${data.duration}ms (threshold: ${data.threshold}ms)`;
      case 'high_error_rate':
        return `Error rate is ${data.errorRate.toFixed(2)}% (threshold: ${data.threshold}%)`;
      case 'high_cpu_usage':
        return `CPU usage is ${data.cpuUsage}% (threshold: ${data.threshold}%)`;
      case 'high_memory_usage':
        return `Memory usage is ${data.memoryUsage}% (threshold: ${data.threshold}%)`;
      default:
        return `Performance alert: ${type}`;
    }
  }

  /**
   * Clear old metrics to prevent memory leaks
   * @param {number} maxAgeMs - Maximum age of metrics in milliseconds (default: 1 hour)
   */
  clearOldMetrics(maxAgeMs = 60 * 60 * 1000) {
    const cutoff = new Date(Date.now() - maxAgeMs);
    
    for (const [key, metrics] of this.metrics.entries()) {
      const filteredMetrics = metrics.filter(m => m.timestamp >= cutoff);
      this.metrics.set(key, filteredMetrics);
    }
  }
}

// Create singleton instance
const performanceService = new PerformanceService();

// Set up periodic cleanup of old metrics (every 30 minutes)
setInterval(() => {
  performanceService.clearOldMetrics();
}, 30 * 60 * 1000);

// Proactive resource monitoring every 30 seconds (Requirements: 6.7 — Property 25)
// This runs independently of requests so alerts fire even during idle periods
setInterval(() => {
  const mem = process.memoryUsage();
  const cpu = process.cpuUsage();
  const totalMem = mem.heapTotal + mem.external + mem.arrayBuffers;
  const usedMem = mem.heapUsed + mem.external + mem.arrayBuffers;
  const memPct = (usedMem / totalMem) * 100;
  const cpuPct = Math.min(((cpu.user + cpu.system) / 1_000_000) * 100, 100);

  performanceService.trackResourceUsage(cpuPct, memPct, mem.heapUsed, mem.heapTotal);
}, 30 * 1000);

export default performanceService;