import performanceService from '../services/performance.service.js';
import alertingService from '../services/alerting.service.js';
import dbPerformanceTracker from '../utils/database-performance.js';
import { circuitBreakers } from '../utils/circuit-breaker.js';
import { errorRateMonitor, degradationManager } from '../middlewares/resilience.middleware.js';
import deploymentService from '../services/deployment.service.js';
import logger from '../utils/logger.js';

/**
 * Performance monitoring controller for handling performance-related API endpoints
 */

/**
 * Receive performance metrics from frontend
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const receiveMetrics = async (req, res) => {
  try {
    const { type, data } = req.body;
    
    if (!type || !data) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields: type and data'
      });
    }

    // Process different types of frontend metrics
    switch (type) {
      case 'metric':
        await processCoreWebVital(data);
        break;
      case 'navigation':
        await processNavigationTiming(data);
        break;
      case 'slow-resource':
        await processSlowResource(data);
        break;
      case 'page-load':
        await processPageLoad(data);
        break;
      case 'interaction':
        await processUserInteraction(data);
        break;
      default:
        logger.warn('Unknown metric type received', { type, data });
    }

    res.status(200).json({
      status: 'success',
      message: 'Metrics received successfully'
    });

  } catch (error) {
    logger.error('Error processing performance metrics', {
      error: error.message,
      body: req.body
    });

    res.status(500).json({
      status: 'error',
      message: 'Failed to process performance metrics'
    });
  }
};

/**
 * Process Core Web Vitals metric
 * @param {Object} data - Metric data
 */
async function processCoreWebVital(data) {
  const { name, value, rating, sessionId, url } = data;
  
  logger.info('Core Web Vital received', {
    name,
    value,
    rating,
    sessionId,
    url
  });

  // Track frontend performance metric
  performanceService.trackAPIResponseTime(
    `frontend_${name.toLowerCase()}`,
    value,
    rating === 'good' ? 200 : rating === 'needs-improvement' ? 300 : 400,
    false,
    'METRIC',
    data.userAgent || '',
    ''
  );

  // Trigger alerts for poor Core Web Vitals
  if (rating === 'poor') {
    const thresholds = {
      'LCP': 4000, // 4 seconds
      'FID': 300,  // 300ms
      'CLS': 0.25, // 0.25
      'INP': 500,  // 500ms
      'TTFB': 1800, // 1.8 seconds
      'FCP': 3000  // 3 seconds
    };

    const threshold = thresholds[name];
    if (threshold && value > threshold) {
      performanceService.triggerAlert('poor_web_vital', {
        metric: name,
        value,
        threshold,
        rating,
        url,
        sessionId
      });
    }
  }
}

/**
 * Process navigation timing data
 * @param {Object} data - Navigation timing data
 */
async function processNavigationTiming(data) {
  const { navigationStart, domContentLoaded, loadComplete, sessionId, url } = data;
  
  logger.info('Navigation timing received', {
    domContentLoaded,
    loadComplete,
    sessionId,
    url
  });

  // Track page load performance
  performanceService.trackAPIResponseTime(
    'frontend_page_load',
    loadComplete,
    200,
    false,
    'NAVIGATION',
    '',
    ''
  );

  // Alert on slow page loads
  if (loadComplete > 5000) { // 5 seconds
    performanceService.triggerAlert('slow_page_load', {
      loadTime: loadComplete,
      domContentLoaded,
      url,
      sessionId
    });
  }
}

/**
 * Process slow resource loading data
 * @param {Object} data - Slow resource data
 */
async function processSlowResource(data) {
  const { name, type, loadTime, size, cached, sessionId, url } = data;
  
  logger.warn('Slow resource detected', {
    name,
    type,
    loadTime,
    size,
    cached,
    sessionId,
    url
  });

  // Track slow resource as performance metric
  performanceService.trackAPIResponseTime(
    `frontend_resource_${type}`,
    loadTime,
    400, // Treat as warning status
    cached,
    'RESOURCE',
    '',
    ''
  );

  // Alert on very slow resources
  if (loadTime > 3000) { // 3 seconds
    performanceService.triggerAlert('slow_resource_load', {
      resourceName: name,
      resourceType: type,
      loadTime,
      size,
      cached,
      url,
      sessionId
    });
  }
}

/**
 * Process page load timing
 * @param {Object} data - Page load data
 */
async function processPageLoad(data) {
  const { pageName, loadTime, sessionId, url } = data;
  
  logger.info('Page load tracked', {
    pageName,
    loadTime,
    sessionId,
    url
  });

  // Track page-specific load time
  performanceService.trackAPIResponseTime(
    `frontend_page_${pageName}`,
    loadTime,
    200,
    false,
    'PAGE_LOAD',
    '',
    ''
  );
}

/**
 * Process user interaction timing
 * @param {Object} data - User interaction data
 */
async function processUserInteraction(data) {
  const { action, element, duration, sessionId, url } = data;
  
  logger.debug('User interaction tracked', {
    action,
    element,
    duration,
    sessionId,
    url
  });

  // Track interaction performance if duration is provided
  if (duration > 0) {
    performanceService.trackAPIResponseTime(
      `frontend_interaction_${action}`,
      duration,
      200,
      false,
      'INTERACTION',
      '',
      ''
    );

    // Alert on slow interactions
    if (duration > 500) { // 500ms
      performanceService.triggerAlert('slow_interaction', {
        action,
        element,
        duration,
        url,
        sessionId
      });
    }
  }
}

/**
 * Get performance summary
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getPerformanceSummary = async (req, res) => {
  try {
    const summary = performanceService.getPerformanceSummary();
    const dbStats = dbPerformanceTracker.getPerformanceStats();
    const alertStats = alertingService.getAlertStatistics();
    const errorRateStats = errorRateMonitor.getStats();
    const degradationStatus = degradationManager.getStatus();

    // Circuit breaker statuses (Requirements: 5.3)
    const circuitBreakerStatus = {};
    for (const [name, breaker] of Object.entries(circuitBreakers)) {
      circuitBreakerStatus[name] = breaker.getStatus();
    }

    res.status(200).json({
      status: 'success',
      data: {
        performance: summary,
        database: dbStats,
        alerts: alertStats,
        errorRate: errorRateStats,
        circuitBreakers: circuitBreakerStatus,
        degradation: degradationStatus,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Error getting performance summary', { error: error.message });
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to get performance summary'
    });
  }
};

/**
 * Get performance metrics for a specific endpoint or time range
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getMetrics = async (req, res) => {
  try {
    const { endpoint, limit = 100, type } = req.query;
    
    if (!endpoint && !type) {
      return res.status(400).json({
        status: 'error',
        message: 'Either endpoint or type parameter is required'
      });
    }

    const metricKey = endpoint || type;
    const metrics = performanceService.getMetrics(metricKey, parseInt(limit));

    res.status(200).json({
      status: 'success',
      data: {
        metricKey,
        metrics,
        count: metrics.length
      }
    });

  } catch (error) {
    logger.error('Error getting metrics', { error: error.message });
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to get metrics'
    });
  }
};

/**
 * Get alert history and statistics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getAlerts = async (req, res) => {
  try {
    const { timeWindow = 24 * 60 * 60 * 1000 } = req.query; // 24 hours default
    
    const alertStats = alertingService.getAlertStatistics(parseInt(timeWindow));

    res.status(200).json({
      status: 'success',
      data: {
        statistics: alertStats,
        timeWindow: parseInt(timeWindow)
      }
    });

  } catch (error) {
    logger.error('Error getting alerts', { error: error.message });
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to get alerts'
    });
  }
};

/**
 * Configure alert rules
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const configureAlerts = async (req, res) => {
  try {
    const { type, rule } = req.body;
    
    if (!type || !rule) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields: type and rule'
      });
    }

    alertingService.addAlertRule(type, rule);

    logger.info('Alert rule configured', { type, rule });

    res.status(200).json({
      status: 'success',
      message: 'Alert rule configured successfully'
    });

  } catch (error) {
    logger.error('Error configuring alert rule', { error: error.message });
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to configure alert rule'
    });
  }
};

/**
 * Add alert channel
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const addAlertChannel = async (req, res) => {
  try {
    const { type, config, severityFilter } = req.body;
    
    if (!type || !config) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields: type and config'
      });
    }

    const channelId = alertingService.addAlertChannel({
      type,
      config,
      severityFilter
    });

    logger.info('Alert channel added', { type, channelId });

    res.status(200).json({
      status: 'success',
      message: 'Alert channel added successfully',
      data: { channelId }
    });

  } catch (error) {
    logger.error('Error adding alert channel', { error: error.message });
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to add alert channel'
    });
  }
};

/**
 * Get deployment performance impact report.
 * Requirements: 10.5 — Property 36: Deployment Performance Impact Tracking
 */
export const getDeploymentReport = async (req, res) => {
  try {
    const report = deploymentService.getDeploymentReport();
    res.status(200).json({ status: 'success', data: report });
  } catch (error) {
    logger.error('Error getting deployment report', { error: error.message });
    res.status(500).json({ status: 'error', message: 'Failed to get deployment report' });
  }
};

/**
 * Generate daily performance report with trends and recommendations.
 * Requirements: 7.6
 */
export const getDailyReport = async (req, res) => {
  try {
    const summary = performanceService.getPerformanceSummary();
    const alertStats = alertingService.getAlertStatistics(24 * 60 * 60 * 1000);
    const errorRateStats = errorRateMonitor.getStats();

    // Build recommendations based on current metrics
    const recommendations = [];

    if (summary.errorRate > 0.01) {
      recommendations.push({
        severity: 'high',
        area: 'Error Rate',
        message: `Error rate is ${(summary.errorRate * 100).toFixed(2)}% — investigate recent errors`,
      });
    }

    // Check for slow API endpoints
    for (const [key, apiMetrics] of Object.entries(summary.api)) {
      if (apiMetrics.avgResponseTime > 500) {
        recommendations.push({
          severity: 'medium',
          area: 'API Performance',
          message: `${key} has avg response time of ${apiMetrics.avgResponseTime.toFixed(0)}ms — consider caching or query optimization`,
        });
      }
    }

    // Check for slow DB operations
    for (const [key, dbMetrics] of Object.entries(summary.database)) {
      if (dbMetrics.avgQueryTime > 200) {
        recommendations.push({
          severity: 'medium',
          area: 'Database',
          message: `${key} has avg query time of ${dbMetrics.avgQueryTime.toFixed(0)}ms — review indexes`,
        });
      }
    }

    if (alertStats.total > 50) {
      recommendations.push({
        severity: 'high',
        area: 'Alerts',
        message: `${alertStats.total} alerts in the last 24h — review alert thresholds and system health`,
      });
    }

    const report = {
      generatedAt: new Date().toISOString(),
      period: '24h',
      summary: {
        errorRate: (summary.errorRate * 100).toFixed(2) + '%',
        totalAlerts: alertStats.total,
        alertsBySeverity: alertStats.bySeverity,
        trackedEndpoints: Object.keys(summary.api).length,
        trackedDbOps: Object.keys(summary.database).length,
        errorRateWindow: errorRateStats,
      },
      topSlowEndpoints: Object.entries(summary.api)
        .sort((a, b) => b[1].avgResponseTime - a[1].avgResponseTime)
        .slice(0, 5)
        .map(([key, m]) => ({ endpoint: key, avgMs: m.avgResponseTime.toFixed(0), maxMs: m.maxResponseTime.toFixed(0) })),
      topSlowDbOps: Object.entries(summary.database)
        .sort((a, b) => b[1].avgQueryTime - a[1].avgQueryTime)
        .slice(0, 5)
        .map(([key, m]) => ({ operation: key, avgMs: m.avgQueryTime.toFixed(0), maxMs: m.maxQueryTime.toFixed(0) })),
      recommendations,
    };

    logger.info('Daily performance report generated', { recommendations: recommendations.length });

    res.status(200).json({ status: 'success', data: report });
  } catch (error) {
    logger.error('Error generating daily report', { error: error.message });
    res.status(500).json({ status: 'error', message: 'Failed to generate daily report' });
  }
};
export const healthCheck = async (req, res) => {
  try {
    const performanceSummary = performanceService.getPerformanceSummary();
    const memUsage = process.memoryUsage();
    
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        used: memUsage.heapUsed,
        total: memUsage.heapTotal,
        percentage: (memUsage.heapUsed / memUsage.heapTotal) * 100
      },
      performance: {
        errorRate: performanceSummary.errorRate * 100,
        apiEndpoints: Object.keys(performanceSummary.api).length,
        databaseOperations: Object.keys(performanceSummary.database).length
      }
    };

    // Determine health status
    if (performanceSummary.errorRate > 0.05) { // 5%
      health.status = 'unhealthy';
      health.reason = 'High error rate';
    } else if (health.memory.percentage > 90) {
      health.status = 'degraded';
      health.reason = 'High memory usage';
    }

    const statusCode = health.status === 'healthy' ? 200 : 
                      health.status === 'degraded' ? 200 : 503;

    res.status(statusCode).json(health);

  } catch (error) {
    logger.error('Health check failed', { error: error.message });
    
    res.status(503).json({
      status: 'unhealthy',
      message: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
};