import performanceService from '../services/performance.service.js';
import logger from '../utils/logger.js';

// Slow request threshold — log a warning for anything over 500ms
const SLOW_REQUEST_THRESHOLD_MS = 500;

// Skip logging for these noisy paths
const SKIP_LOG_PATHS = new Set(['/health', '/api/v1/health', '/favicon.ico']);

/**
 * Core performance middleware.
 * Tracks response time, logs structured request/response metrics,
 * and adds X-Response-Time header to every response.
 * Requirements: 2.5, 7.1
 */
export const performanceMiddleware = (req, res, next) => {
  const startTime = process.hrtime.bigint();
  const startTimestamp = Date.now();

  // Store original end method
  const originalEnd = res.end;

  res.end = function (chunk, encoding) {
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1_000_000; // nanoseconds → ms

    const endpoint = req.route ? req.route.path : req.path;
    const method = req.method;
    const statusCode = res.statusCode;
    const userAgent = (req.get('User-Agent') || '').substring(0, 100);
    const ipAddress = req.ip || req.socket?.remoteAddress || '';
    const cacheStatus = res.get('X-Cache-Status') || 'BYPASS';
    const cacheHit = cacheStatus === 'HIT';
    const contentLength = res.get('Content-Length') || '0';

    // Add performance headers before sending
    res.set('X-Response-Time', `${duration.toFixed(2)}ms`);
    res.set('X-Timestamp', startTimestamp.toString());

    // Track in performance service
    performanceService.trackAPIResponseTime(
      endpoint,
      duration,
      statusCode,
      cacheHit,
      method,
      userAgent,
      ipAddress
    );

    // Structured request log (skip health checks to reduce noise)
    if (!SKIP_LOG_PATHS.has(req.path)) {
      const logData = {
        method,
        path: req.path,
        endpoint,
        statusCode,
        duration: `${duration.toFixed(2)}ms`,
        cacheStatus,
        contentLength,
        ip: ipAddress,
        userAgent,
      };

      if (statusCode >= 500) {
        logger.error('Request completed with server error', logData);
      } else if (statusCode >= 400) {
        logger.warn('Request completed with client error', logData);
      } else if (duration > SLOW_REQUEST_THRESHOLD_MS) {
        logger.warn('Slow request detected', { ...logData, threshold: `${SLOW_REQUEST_THRESHOLD_MS}ms` });
      } else {
        logger.info('Request completed', logData);
      }
    }

    originalEnd.call(this, chunk, encoding);
  };

  next();
};

/**
 * Resource monitoring middleware.
 * Samples system memory/CPU on ~10% of requests to avoid overhead.
 * Requirements: 6.7, 7.4
 */
export const resourceMonitoringMiddleware = (req, res, next) => {
  if (Math.random() < 0.1) {
    const mem = process.memoryUsage();
    const cpu = process.cpuUsage();

    const totalMem = mem.heapTotal + mem.external + mem.arrayBuffers;
    const usedMem = mem.heapUsed + mem.external + mem.arrayBuffers;
    const memPct = (usedMem / totalMem) * 100;

    // Simplified CPU % — microseconds used / 1s window
    const cpuPct = Math.min(((cpu.user + cpu.system) / 1_000_000) * 100, 100);

    performanceService.trackResourceUsage(cpuPct, memPct, mem.heapUsed, mem.heapTotal);
  }

  next();
};

/**
 * Cache-control header middleware factory.
 * Use this for routes that don't go through apiCache() but still need headers.
 * Requirements: 2.6
 */
export const cacheHeadersMiddleware = (options = {}) => {
  return (req, res, next) => {
    const {
      maxAge = 300,
      mustRevalidate = false,
      noCache = false,
      isPrivate = false,   // renamed from `private` (reserved word)
    } = options;

    if (noCache) {
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
    } else {
      let cc = isPrivate ? 'private' : 'public';
      cc += `, max-age=${maxAge}`;
      if (mustRevalidate) cc += ', must-revalidate';
      res.set('Cache-Control', cc);
    }

    next();
  };
};

/**
 * Health check middleware — returns rich health status for load balancers.
 * Requirements: 10.4
 */
export const healthCheckMiddleware = async (req, res, next) => {
  if (req.path === '/health' || req.path === '/api/v1/health') {
    const summary = performanceService.getPerformanceSummary();
    const mem = process.memoryUsage();
    const memPct = (mem.heapUsed / mem.heapTotal) * 100;

    // Import cacheService lazily to avoid circular deps
    let cacheStats = {};
    try {
      const { default: cacheService } = await import('../services/cache.service.js');
      cacheStats = await cacheService.getStats();
    } catch {
      cacheStats = { error: 'unavailable' };
    }

    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      memory: {
        used: mem.heapUsed,
        total: mem.heapTotal,
        percentage: memPct.toFixed(1),
      },
      performance: {
        errorRate: (summary.errorRate * 100).toFixed(2) + '%',
        trackedEndpoints: Object.keys(summary.api).length,
        trackedDbOps: Object.keys(summary.database).length,
      },
      cache: cacheStats,
    };

    if (summary.errorRate > 0.05) {
      health.status = 'unhealthy';
      health.reason = 'High error rate';
    } else if (memPct > 90) {
      health.status = 'degraded';
      health.reason = 'High memory usage';
    }

    const statusCode = health.status === 'unhealthy' ? 503 : 200;
    return res.status(statusCode).json(health);
  }

  next();
};

/**
 * Performance error handler — catches errors tagged as performance-related.
 */
export const performanceErrorHandler = (err, req, res, next) => {
  if (err.name === 'PerformanceError' || err.type === 'performance') {
    logger.error('Performance Error', {
      error: err.message,
      endpoint: req.path,
      method: req.method,
    });

    return res.status(500).json({
      status: 'error',
      message: 'A performance monitoring error occurred',
      timestamp: new Date().toISOString(),
    });
  }

  next(err);
};
