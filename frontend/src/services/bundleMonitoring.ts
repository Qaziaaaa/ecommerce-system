/**
 * Bundle Size Monitoring Service
 * Automated monitoring and alerting for bundle size changes
 */

import { bundleAnalysisService, BundleReport } from './bundleAnalysis';

export interface BundleSizeAlert {
  type: 'size_increase' | 'threshold_exceeded' | 'optimization_opportunity';
  severity: 'info' | 'warning' | 'error';
  message: string;
  currentSize: number;
  previousSize?: number;
  threshold?: number;
  timestamp: Date;
}

export interface BundleMonitoringConfig {
  enabled: boolean;
  checkInterval: number; // milliseconds
  sizeIncreaseThreshold: number; // percentage
  alertCallback?: (alert: BundleSizeAlert) => void;
  persistHistory: boolean;
}

export class BundleMonitoringService {
  private static instance: BundleMonitoringService;
  private config: BundleMonitoringConfig;
  private previousReport: BundleReport | null = null;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private sizeHistory: Array<{ timestamp: Date; size: number }> = [];

  private constructor() {
    this.config = {
      enabled: process.env.NODE_ENV === 'production',
      checkInterval: 60000, // 1 minute
      sizeIncreaseThreshold: 10, // 10% increase triggers alert
      persistHistory: true,
    };
  }

  public static getInstance(): BundleMonitoringService {
    if (!BundleMonitoringService.instance) {
      BundleMonitoringService.instance = new BundleMonitoringService();
    }
    return BundleMonitoringService.instance;
  }

  /**
   * Start automated bundle size monitoring
   */
  public startMonitoring(config?: Partial<BundleMonitoringConfig>): void {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    if (!this.config.enabled) {
      console.log('Bundle monitoring disabled');
      return;
    }

    console.log('🔍 Starting bundle size monitoring...');
    
    // Initial check
    this.performSizeCheck();

    // Set up periodic monitoring
    this.monitoringInterval = setInterval(() => {
      this.performSizeCheck();
    }, this.config.checkInterval);

    // Load previous size history
    this.loadSizeHistory();
  }

  /**
   * Stop monitoring
   */
  public stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('Bundle monitoring stopped');
    }
  }

  /**
   * Perform immediate size check
   */
  public async performSizeCheck(): Promise<void> {
    try {
      const currentReport = await bundleAnalysisService.analyzeBundle();
      
      // Record size in history
      this.recordSizeHistory(currentReport.totalSize);
      
      // Compare with previous report
      if (this.previousReport) {
        this.compareReports(this.previousReport, currentReport);
      }
      
      // Check against thresholds
      this.checkThresholds(currentReport);
      
      this.previousReport = currentReport;
      
      // Persist history if enabled
      if (this.config.persistHistory) {
        this.saveSizeHistory();
      }
    } catch (error) {
      console.error('Bundle size check failed:', error);
      this.sendAlert({
        type: 'optimization_opportunity',
        severity: 'error',
        message: 'Bundle size monitoring failed',
        currentSize: 0,
        timestamp: new Date(),
      });
    }
  }

  /**
   * Get bundle size trend analysis
   */
  public getSizeTrend(): {
    trend: 'increasing' | 'decreasing' | 'stable';
    changePercentage: number;
    recommendation: string;
  } {
    if (this.sizeHistory.length < 2) {
      return {
        trend: 'stable',
        changePercentage: 0,
        recommendation: 'Insufficient data for trend analysis',
      };
    }

    const recent = this.sizeHistory.slice(-5); // Last 5 measurements
    const first = recent[0].size;
    const last = recent[recent.length - 1].size;
    const changePercentage = ((last - first) / first) * 100;

    let trend: 'increasing' | 'decreasing' | 'stable';
    let recommendation: string;

    if (Math.abs(changePercentage) < 2) {
      trend = 'stable';
      recommendation = 'Bundle size is stable. Continue monitoring.';
    } else if (changePercentage > 0) {
      trend = 'increasing';
      recommendation = `Bundle size increased by ${changePercentage.toFixed(1)}%. Consider optimization.`;
    } else {
      trend = 'decreasing';
      recommendation = `Bundle size decreased by ${Math.abs(changePercentage).toFixed(1)}%. Good optimization work!`;
    }

    return { trend, changePercentage, recommendation };
  }

  /**
   * Generate monitoring report
   */
  public generateMonitoringReport(): string {
    const trend = this.getSizeTrend();
    const currentSize = this.sizeHistory[this.sizeHistory.length - 1]?.size || 0;
    
    let report = '# Bundle Size Monitoring Report\n\n';
    report += `**Current Size**: ${this.formatBytes(currentSize)}\n`;
    report += `**Trend**: ${trend.trend} (${trend.changePercentage > 0 ? '+' : ''}${trend.changePercentage.toFixed(1)}%)\n`;
    report += `**Recommendation**: ${trend.recommendation}\n\n`;
    
    if (this.sizeHistory.length > 0) {
      report += '## Size History (Last 10 measurements)\n';
      this.sizeHistory.slice(-10).forEach((entry, index) => {
        report += `${index + 1}. ${entry.timestamp.toLocaleString()}: ${this.formatBytes(entry.size)}\n`;
      });
    }
    
    return report;
  }

  /**
   * Set custom alert callback
   */
  public setAlertCallback(callback: (alert: BundleSizeAlert) => void): void {
    this.config.alertCallback = callback;
  }

  private compareReports(previous: BundleReport, current: BundleReport): void {
    const sizeDiff = current.totalSize - previous.totalSize;
    const percentageChange = (sizeDiff / previous.totalSize) * 100;

    if (Math.abs(percentageChange) > this.config.sizeIncreaseThreshold) {
      const severity = percentageChange > 0 ? 'warning' : 'info';
      const type = percentageChange > 0 ? 'size_increase' : 'optimization_opportunity';
      
      this.sendAlert({
        type,
        severity,
        message: `Bundle size ${percentageChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(percentageChange).toFixed(1)}% (${this.formatBytes(Math.abs(sizeDiff))})`,
        currentSize: current.totalSize,
        previousSize: previous.totalSize,
        timestamp: new Date(),
      });
    }
  }

  private checkThresholds(report: BundleReport): void {
    const thresholds = {
      warning: 500 * 1024, // 500KB
      error: 1024 * 1024, // 1MB
    };

    if (report.totalSize > thresholds.error) {
      this.sendAlert({
        type: 'threshold_exceeded',
        severity: 'error',
        message: `Bundle size exceeds critical threshold: ${this.formatBytes(report.totalSize)}`,
        currentSize: report.totalSize,
        threshold: thresholds.error,
        timestamp: new Date(),
      });
    } else if (report.totalSize > thresholds.warning) {
      this.sendAlert({
        type: 'threshold_exceeded',
        severity: 'warning',
        message: `Bundle size exceeds warning threshold: ${this.formatBytes(report.totalSize)}`,
        currentSize: report.totalSize,
        threshold: thresholds.warning,
        timestamp: new Date(),
      });
    }
  }

  private sendAlert(alert: BundleSizeAlert): void {
    // Log to console
    const emoji = alert.severity === 'error' ? '🚨' : alert.severity === 'warning' ? '⚠️' : 'ℹ️';
    console.log(`${emoji} Bundle Alert: ${alert.message}`);

    // Call custom callback if provided
    if (this.config.alertCallback) {
      this.config.alertCallback(alert);
    }

    // In production, this could send to monitoring service
    if (process.env.NODE_ENV === 'production') {
      // Send to monitoring service (e.g., Sentry, DataDog, etc.)
      this.sendToMonitoringService(alert);
    }
  }

  private sendToMonitoringService(alert: BundleSizeAlert): void {
    // Placeholder for integration with monitoring services
    // This would typically send to your monitoring/alerting system
    console.log('Sending alert to monitoring service:', alert);
  }

  private recordSizeHistory(size: number): void {
    this.sizeHistory.push({
      timestamp: new Date(),
      size,
    });

    // Keep only last 100 measurements
    if (this.sizeHistory.length > 100) {
      this.sizeHistory = this.sizeHistory.slice(-100);
    }
  }

  private loadSizeHistory(): void {
    if (typeof window !== 'undefined' && this.config.persistHistory) {
      try {
        const stored = localStorage.getItem('bundle-size-history');
        if (stored) {
          const parsed = JSON.parse(stored);
          this.sizeHistory = parsed.map((entry: any) => ({
            ...entry,
            timestamp: new Date(entry.timestamp),
          }));
        }
      } catch (error) {
        console.warn('Failed to load bundle size history:', error);
      }
    }
  }

  private saveSizeHistory(): void {
    if (typeof window !== 'undefined' && this.config.persistHistory) {
      try {
        localStorage.setItem('bundle-size-history', JSON.stringify(this.sizeHistory));
      } catch (error) {
        console.warn('Failed to save bundle size history:', error);
      }
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Export singleton instance
export const bundleMonitoringService = BundleMonitoringService.getInstance();