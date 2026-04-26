import logger from '../utils/logger.js';
import performanceService from './performance.service.js';

/**
 * Deployment Performance Tracking Service.
 *
 * Captures a performance snapshot at startup (representing "before" state
 * from the previous deployment's metrics), then tracks metrics during the
 * current deployment's lifetime and exposes a comparison endpoint.
 *
 * Requirements: 10.5 — Property 36: Deployment Performance Impact Tracking
 */
class DeploymentService {
  constructor() {
    this.deploymentId = this._generateDeploymentId();
    this.startTime = Date.now();
    this.startupSnapshot = null;
    this.checkpoints = []; // Periodic snapshots during deployment lifetime
    this.checkpointIntervalMs = 5 * 60 * 1000; // Every 5 minutes

    // Capture initial snapshot after a short warm-up period
    const warmupTimer = setTimeout(() => {
      this.startupSnapshot = this._captureSnapshot('startup');
      logger.info('Deployment performance baseline captured', {
        deploymentId: this.deploymentId,
        startTime: new Date(this.startTime).toISOString(),
      });
    }, 10_000); // 10s warm-up
    warmupTimer.unref(); // Don't prevent process exit

    // Periodic checkpoints
    const checkpointTimer = setInterval(() => {
      const checkpoint = this._captureSnapshot('checkpoint');
      this.checkpoints.push(checkpoint);
      // Keep only last 12 checkpoints (1 hour of data at 5-min intervals)
      if (this.checkpoints.length > 12) {
        this.checkpoints.shift();
      }
    }, this.checkpointIntervalMs);
    checkpointTimer.unref(); // Don't prevent process exit
  }

  /**
   * Capture a performance snapshot at a given phase.
   * @param {'startup'|'checkpoint'|'manual'} phase
   */
  _captureSnapshot(phase) {
    const mem = process.memoryUsage();
    const summary = performanceService.getPerformanceSummary();

    // Calculate avg response time across all tracked endpoints
    const apiMetrics = Object.values(summary.api);
    const avgResponseTime = apiMetrics.length > 0
      ? apiMetrics.reduce((sum, m) => sum + m.avgResponseTime, 0) / apiMetrics.length
      : null;

    const snapshot = {
      phase,
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      memory: {
        heapUsedMB: (mem.heapUsed / 1024 / 1024).toFixed(2),
        heapTotalMB: (mem.heapTotal / 1024 / 1024).toFixed(2),
        heapUsedPct: ((mem.heapUsed / mem.heapTotal) * 100).toFixed(1),
      },
      performance: {
        errorRate: (summary.errorRate * 100).toFixed(3) + '%',
        trackedEndpoints: Object.keys(summary.api).length,
        avgResponseTimeMs: avgResponseTime ? avgResponseTime.toFixed(1) : 'N/A',
      },
    };

    logger.debug('Deployment snapshot captured', { phase, deploymentId: this.deploymentId });
    return snapshot;
  }

  /**
   * Get the full deployment performance report.
   * Requirements: 10.5
   */
  getDeploymentReport() {
    const currentSnapshot = this._captureSnapshot('current');
    const uptimeMs = Date.now() - this.startTime;

    const report = {
      deploymentId: this.deploymentId,
      startTime: new Date(this.startTime).toISOString(),
      uptimeMs,
      uptimeFormatted: this._formatUptime(uptimeMs),
      nodeVersion: process.version,
      platform: process.platform,
      environment: process.env.NODE_ENV || 'unknown',
      snapshots: {
        startup: this.startupSnapshot,
        current: currentSnapshot,
        checkpoints: this.checkpoints,
      },
      trend: this._calculateTrend(this.startupSnapshot, currentSnapshot),
    };

    return report;
  }

  /**
   * Calculate performance trend between two snapshots.
   */
  _calculateTrend(before, after) {
    if (!before || !after) {
      return { status: 'insufficient_data', message: 'Waiting for baseline data' };
    }

    const memBefore = parseFloat(before.memory.heapUsedPct);
    const memAfter = parseFloat(after.memory.heapUsedPct);
    const memDelta = memAfter - memBefore;

    const errBefore = parseFloat(before.performance.errorRate);
    const errAfter = parseFloat(after.performance.errorRate);
    const errDelta = errAfter - errBefore;

    const issues = [];
    if (memDelta > 20) issues.push(`Memory usage increased by ${memDelta.toFixed(1)}%`);
    if (errDelta > 1) issues.push(`Error rate increased by ${errDelta.toFixed(2)}%`);

    return {
      status: issues.length === 0 ? 'healthy' : 'degraded',
      memoryDeltaPct: memDelta.toFixed(1),
      errorRateDelta: errDelta.toFixed(3),
      issues,
      recommendation: issues.length > 0
        ? 'Consider rolling back or investigating the issues above'
        : 'Deployment is performing within normal parameters',
    };
  }

  _formatUptime(ms) {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    const d = Math.floor(h / 24);
    if (d > 0) return `${d}d ${h % 24}h`;
    if (h > 0) return `${h}h ${m % 60}m`;
    if (m > 0) return `${m}m ${s % 60}s`;
    return `${s}s`;
  }

  _generateDeploymentId() {
    const ts = Date.now().toString(36);
    const rand = Math.random().toString(36).substring(2, 7);
    return `deploy-${ts}-${rand}`;
  }
}

// Singleton
const deploymentService = new DeploymentService();
export default deploymentService;
