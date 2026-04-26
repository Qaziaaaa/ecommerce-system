import logger from '../utils/logger.js';
import performanceService from '../services/performance.service.js';

/**
 * Error Rate Monitor
 * Tracks request/error counts in a sliding time window and triggers alerts.
 * Requirements: 5.7 — Property 21: Error Rate Alert Triggering
 */
class ErrorRateMonitor {
  constructor() {
    this.windowMs = 5 * 60 * 1000; // 5-minute sliding window
    this.alertThreshold = 0.01;     // 1% error rate
    this.requests = [];             // { timestamp, isError }
    this.lastAlertTime = 0;
    this.alertCooldownMs = 60_000;  // Alert at most once per minute
  }

  record(isError) {
    const now = Date.now();
    this.requests.push({ timestamp: now, isError });
    this._prune(now);
    this._checkThreshold(now);
  }

  _prune(now) {
    const cutoff = now - this.windowMs;
    this.requests = this.requests.filter((r) => r.timestamp >= cutoff);
  }

  _checkThreshold(now) {
    if (this.requests.length < 10) return; // Need minimum sample size

    const errors = this.requests.filter((r) => r.isError).length;
    const errorRate = errors / this.requests.length;

    if (errorRate > this.alertThreshold && now - this.lastAlertTime > this.alertCooldownMs) {
      this.lastAlertTime = now;
      logger.warn('High error rate detected', {
        errorRate: (errorRate * 100).toFixed(2) + '%',
        threshold: (this.alertThreshold * 100).toFixed(2) + '%',
        totalRequests: this.requests.length,
        errors,
        windowMs: this.windowMs,
      });

      // Delegate to performance service alert system
      performanceService.triggerAlert('high_error_rate', {
        errorRate: errorRate * 100,
        threshold: this.alertThreshold * 100,
        totalRequests: this.requests.length,
        errorRequests: errors,
      });
    }
  }

  getStats() {
    const now = Date.now();
    this._prune(now);
    const errors = this.requests.filter((r) => r.isError).length;
    return {
      totalRequests: this.requests.length,
      errors,
      errorRate: this.requests.length > 0 ? errors / this.requests.length : 0,
      windowMs: this.windowMs,
    };
  }
}

export const errorRateMonitor = new ErrorRateMonitor();

/**
 * Middleware: record every request outcome for error rate tracking.
 * Requirements: 5.7
 */
export const errorRateMiddleware = (req, res, next) => {
  const originalEnd = res.end;

  res.end = function (chunk, encoding) {
    const isError = res.statusCode >= 500;
    errorRateMonitor.record(isError);
    originalEnd.call(this, chunk, encoding);
  };

  next();
};

// ─── Graceful Degradation ─────────────────────────────────────────────────────

/**
 * Non-critical features that can be disabled under high load.
 * Requirements: 5.8 — Property 22: Graceful Degradation Resource Thresholds
 */
const NON_CRITICAL_FEATURES = new Set([
  'recommendations',
  'analytics',
  'reviews-write',
  'wishlist',
]);

const CRITICAL_FEATURES = new Set([
  'auth',
  'products-read',
  'cart',
  'checkout',
  'orders',
]);

class GracefulDegradationManager {
  constructor() {
    this.disabledFeatures = new Set();
    this.cpuThreshold = 85;     // % — disable non-critical above this
    this.memThreshold = 85;     // %
    this.criticalCpuThreshold = 95;
    this.criticalMemThreshold = 95;
    this.checkIntervalMs = 30_000;

    // Start periodic resource checks
    setInterval(() => this._checkResources(), this.checkIntervalMs);
  }

  _checkResources() {
    const mem = process.memoryUsage();
    const memPct = (mem.heapUsed / mem.heapTotal) * 100;

    // Simplified CPU approximation
    const cpuUsage = process.cpuUsage();
    const cpuPct = Math.min(((cpuUsage.user + cpuUsage.system) / 1_000_000) * 100, 100);

    if (cpuPct > this.criticalCpuThreshold || memPct > this.criticalMemThreshold) {
      this._disableNonCritical('critical resource usage', { cpuPct, memPct });
    } else if (cpuPct > this.cpuThreshold || memPct > this.memThreshold) {
      this._disableNonCritical('high resource usage', { cpuPct, memPct });
    } else {
      this._restoreAll();
    }
  }

  _disableNonCritical(reason, metrics) {
    let changed = false;
    for (const feature of NON_CRITICAL_FEATURES) {
      if (!this.disabledFeatures.has(feature)) {
        this.disabledFeatures.add(feature);
        changed = true;
      }
    }
    if (changed) {
      logger.warn('Graceful degradation: non-critical features disabled', {
        reason,
        disabled: [...this.disabledFeatures],
        metrics,
      });
    }
  }

  _restoreAll() {
    if (this.disabledFeatures.size > 0) {
      logger.info('Graceful degradation: all features restored', {
        restored: [...this.disabledFeatures],
      });
      this.disabledFeatures.clear();
    }
  }

  isFeatureEnabled(feature) {
    return !this.disabledFeatures.has(feature);
  }

  getStatus() {
    return {
      disabledFeatures: [...this.disabledFeatures],
      criticalFeatures: [...CRITICAL_FEATURES],
      nonCriticalFeatures: [...NON_CRITICAL_FEATURES],
    };
  }
}

export const degradationManager = new GracefulDegradationManager();

/**
 * Middleware factory: guard a route with graceful degradation.
 * If the feature is disabled, returns 503 with a clear message.
 *
 * @param {string} featureName - Feature identifier (must be in NON_CRITICAL_FEATURES)
 */
export const requireFeature = (featureName) => {
  return (req, res, next) => {
    if (!degradationManager.isFeatureEnabled(featureName)) {
      logger.info('Feature disabled by graceful degradation', { feature: featureName, path: req.path });
      return res.status(503).json({
        status: 'fail',
        message: 'This feature is temporarily unavailable due to high server load. Please try again shortly.',
        code: 'FEATURE_DEGRADED',
        feature: featureName,
        timestamp: new Date().toISOString(),
      });
    }
    next();
  };
};
