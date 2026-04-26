import logger from '../utils/logger.js';
import performanceService from './performance.service.js';

/**
 * Alerting service for performance monitoring and notifications
 */
class AlertingService {
  constructor() {
    this.alertChannels = [];
    this.alertHistory = [];
    this.alertRules = new Map();
    this.suppressionRules = new Map();
    this.escalationRules = new Map();
    
    // Initialize default alert rules
    this.initializeDefaultRules();
    
    // Register with performance service
    performanceService.onAlert((alert) => {
      this.processAlert(alert);
    });
  }

  /**
   * Initialize default alerting rules
   */
  initializeDefaultRules() {
    // API Response Time Rules
    this.addAlertRule('slow_api_response', {
      threshold: 500,
      severity: 'medium',
      cooldown: 300000, // 5 minutes
      escalationTime: 900000, // 15 minutes
      maxOccurrences: 5
    });

    // Database Query Rules
    this.addAlertRule('slow_query', {
      threshold: 200,
      severity: 'medium',
      cooldown: 300000,
      escalationTime: 600000, // 10 minutes
      maxOccurrences: 3
    });

    // Error Rate Rules
    this.addAlertRule('high_error_rate', {
      threshold: 1, // 1%
      severity: 'high',
      cooldown: 180000, // 3 minutes
      escalationTime: 300000, // 5 minutes
      maxOccurrences: 2
    });

    // Resource Usage Rules
    this.addAlertRule('high_cpu_usage', {
      threshold: 80,
      severity: 'high',
      cooldown: 300000,
      escalationTime: 600000,
      maxOccurrences: 3
    });

    this.addAlertRule('high_memory_usage', {
      threshold: 80,
      severity: 'high',
      cooldown: 300000,
      escalationTime: 600000,
      maxOccurrences: 3
    });
  }

  /**
   * Add an alert rule
   * @param {string} type - Alert type
   * @param {Object} rule - Alert rule configuration
   */
  addAlertRule(type, rule) {
    this.alertRules.set(type, {
      threshold: rule.threshold,
      severity: rule.severity || 'medium',
      cooldown: rule.cooldown || 300000, // 5 minutes default
      escalationTime: rule.escalationTime || 900000, // 15 minutes default
      maxOccurrences: rule.maxOccurrences || 5,
      enabled: rule.enabled !== false
    });
  }

  /**
   * Add an alert channel (email, webhook, etc.)
   * @param {Object} channel - Alert channel configuration
   */
  addAlertChannel(channel) {
    this.alertChannels.push({
      id: channel.id || this.generateChannelId(),
      type: channel.type, // 'email', 'webhook', 'slack', 'console'
      config: channel.config,
      severityFilter: channel.severityFilter || ['low', 'medium', 'high', 'critical'],
      enabled: channel.enabled !== false
    });
  }

  /**
   * Process an incoming alert
   * @param {Object} alert - Alert object from performance service
   */
  async processAlert(alert) {
    try {
      // Check if alert should be suppressed
      if (this.shouldSuppressAlert(alert)) {
        logger.debug('Alert suppressed', { type: alert.type, reason: 'suppression rule' });
        return;
      }

      // Check cooldown period
      if (this.isInCooldown(alert)) {
        logger.debug('Alert in cooldown period', { type: alert.type });
        return;
      }

      // Enrich alert with additional context
      const enrichedAlert = await this.enrichAlert(alert);

      // Store alert in history
      this.alertHistory.push({
        ...enrichedAlert,
        id: this.generateAlertId(),
        processedAt: new Date()
      });

      // Keep only last 1000 alerts in memory
      if (this.alertHistory.length > 1000) {
        this.alertHistory.shift();
      }

      // Send alert through all configured channels
      await this.sendAlert(enrichedAlert);

      // Check for escalation
      this.checkEscalation(enrichedAlert);

      logger.info('Alert processed successfully', {
        type: alert.type,
        severity: alert.severity,
        channelsSent: this.alertChannels.filter(c => c.enabled).length
      });

    } catch (error) {
      logger.error('Error processing alert', {
        error: error.message,
        alert: alert.type
      });
    }
  }

  /**
   * Check if alert should be suppressed
   * @param {Object} alert - Alert object
   * @returns {boolean} Whether alert should be suppressed
   */
  shouldSuppressAlert(alert) {
    const suppressionRule = this.suppressionRules.get(alert.type);
    if (!suppressionRule) return false;

    // Check if suppression is active
    if (suppressionRule.until && new Date() < suppressionRule.until) {
      return true;
    }

    // Check occurrence-based suppression
    if (suppressionRule.maxOccurrences) {
      const recentAlerts = this.getRecentAlerts(alert.type, suppressionRule.timeWindow || 3600000); // 1 hour default
      if (recentAlerts.length >= suppressionRule.maxOccurrences) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if alert is in cooldown period
   * @param {Object} alert - Alert object
   * @returns {boolean} Whether alert is in cooldown
   */
  isInCooldown(alert) {
    const rule = this.alertRules.get(alert.type);
    if (!rule || !rule.cooldown) return false;

    const recentAlerts = this.getRecentAlerts(alert.type, rule.cooldown);
    return recentAlerts.length > 0;
  }

  /**
   * Get recent alerts of a specific type
   * @param {string} type - Alert type
   * @param {number} timeWindow - Time window in milliseconds
   * @returns {Array} Recent alerts
   */
  getRecentAlerts(type, timeWindow) {
    const cutoff = new Date(Date.now() - timeWindow);
    return this.alertHistory.filter(alert => 
      alert.type === type && alert.processedAt >= cutoff
    );
  }

  /**
   * Enrich alert with additional context
   * @param {Object} alert - Original alert
   * @returns {Object} Enriched alert
   */
  async enrichAlert(alert) {
    const enriched = { ...alert };

    // Add system context
    const memUsage = process.memoryUsage();
    enriched.systemContext = {
      memoryUsage: {
        used: memUsage.heapUsed,
        total: memUsage.heapTotal,
        percentage: (memUsage.heapUsed / memUsage.heapTotal) * 100
      },
      uptime: process.uptime(),
      nodeVersion: process.version,
      platform: process.platform
    };

    // Add basic performance context without calling getPerformanceSummary to avoid circular calls
    enriched.performanceContext = {
      alertType: alert.type,
      severity: alert.severity
    };

    // Add alert rule context
    const rule = this.alertRules.get(alert.type);
    if (rule) {
      enriched.ruleContext = {
        threshold: rule.threshold,
        maxOccurrences: rule.maxOccurrences,
        recentOccurrences: this.getRecentAlerts(alert.type, 3600000).length // Last hour
      };
    }

    return enriched;
  }

  /**
   * Send alert through all configured channels
   * @param {Object} alert - Enriched alert object
   */
  async sendAlert(alert) {
    const promises = this.alertChannels
      .filter(channel => 
        channel.enabled && 
        channel.severityFilter.includes(alert.severity)
      )
      .map(channel => this.sendToChannel(channel, alert));

    await Promise.allSettled(promises);
  }

  /**
   * Send alert to a specific channel
   * @param {Object} channel - Alert channel
   * @param {Object} alert - Alert object
   */
  async sendToChannel(channel, alert) {
    try {
      switch (channel.type) {
        case 'console':
          this.sendToConsole(alert);
          break;
        case 'webhook':
          await this.sendToWebhook(channel.config, alert);
          break;
        case 'email':
          await this.sendToEmail(channel.config, alert);
          break;
        case 'slack':
          await this.sendToSlack(channel.config, alert);
          break;
        default:
          logger.warn('Unknown alert channel type', { type: channel.type });
      }
    } catch (error) {
      logger.error('Failed to send alert to channel', {
        channelType: channel.type,
        channelId: channel.id,
        error: error.message
      });
    }
  }

  /**
   * Send alert to console (for development/debugging)
   * @param {Object} alert - Alert object
   */
  sendToConsole(alert) {
    const message = `🚨 PERFORMANCE ALERT [${alert.severity.toUpperCase()}]: ${alert.message}`;
    
    switch (alert.severity) {
      case 'critical':
        console.error(message, alert.data);
        break;
      case 'high':
        console.warn(message, alert.data);
        break;
      default:
        console.log(message, alert.data);
    }
  }

  /**
   * Send alert to webhook
   * @param {Object} config - Webhook configuration
   * @param {Object} alert - Alert object
   */
  async sendToWebhook(config, alert) {
    const payload = {
      alert,
      timestamp: new Date().toISOString(),
      service: 'ecommerce-performance-monitor'
    };

    const response = await fetch(config.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...config.headers
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Webhook request failed: ${response.status} ${response.statusText}`);
    }
  }

  /**
   * Send alert via email (placeholder - would integrate with email service)
   * @param {Object} config - Email configuration
   * @param {Object} alert - Alert object
   */
  async sendToEmail(config, alert) {
    // This would integrate with an email service like SendGrid, AWS SES, etc.
    logger.info('Email alert would be sent', {
      to: config.recipients,
      subject: `Performance Alert: ${alert.message}`,
      severity: alert.severity
    });
  }

  /**
   * Send alert to Slack (placeholder - would integrate with Slack API)
   * @param {Object} config - Slack configuration
   * @param {Object} alert - Alert object
   */
  async sendToSlack(config, alert) {
    // This would integrate with Slack webhook or API
    logger.info('Slack alert would be sent', {
      channel: config.channel,
      message: alert.message,
      severity: alert.severity
    });
  }

  /**
   * Check for alert escalation
   * @param {Object} alert - Alert object
   */
  checkEscalation(alert) {
    const rule = this.alertRules.get(alert.type);
    if (!rule || !rule.escalationTime) return;

    const recentAlerts = this.getRecentAlerts(alert.type, rule.escalationTime);
    
    if (recentAlerts.length >= rule.maxOccurrences) {
      this.escalateAlert(alert, recentAlerts);
    }
  }

  /**
   * Escalate an alert to higher severity
   * @param {Object} alert - Original alert
   * @param {Array} recentAlerts - Recent alerts of same type
   */
  escalateAlert(alert, recentAlerts) {
    const escalatedAlert = {
      ...alert,
      type: `${alert.type}_escalated`,
      severity: this.getEscalatedSeverity(alert.severity),
      message: `ESCALATED: ${alert.message} (${recentAlerts.length} occurrences)`,
      escalationContext: {
        originalSeverity: alert.severity,
        occurrenceCount: recentAlerts.length,
        timeWindow: this.alertRules.get(alert.type)?.escalationTime
      }
    };

    logger.warn('Alert escalated', {
      originalType: alert.type,
      escalatedType: escalatedAlert.type,
      occurrences: recentAlerts.length
    });

    // Process escalated alert
    this.processAlert(escalatedAlert);
  }

  /**
   * Get escalated severity level
   * @param {string} currentSeverity - Current severity
   * @returns {string} Escalated severity
   */
  getEscalatedSeverity(currentSeverity) {
    const severityLevels = ['low', 'medium', 'high', 'critical'];
    const currentIndex = severityLevels.indexOf(currentSeverity);
    return severityLevels[Math.min(currentIndex + 1, severityLevels.length - 1)];
  }

  /**
   * Add alert suppression rule
   * @param {string} type - Alert type
   * @param {Object} rule - Suppression rule
   */
  addSuppressionRule(type, rule) {
    this.suppressionRules.set(type, {
      until: rule.until,
      maxOccurrences: rule.maxOccurrences,
      timeWindow: rule.timeWindow || 3600000 // 1 hour default
    });
  }

  /**
   * Remove alert suppression rule
   * @param {string} type - Alert type
   */
  removeSuppressionRule(type) {
    this.suppressionRules.delete(type);
  }

  /**
   * Get alert statistics
   * @param {number} timeWindow - Time window in milliseconds
   * @returns {Object} Alert statistics
   */
  getAlertStatistics(timeWindow = 24 * 60 * 60 * 1000) { // 24 hours default
    const cutoff = new Date(Date.now() - timeWindow);
    const recentAlerts = this.alertHistory.filter(alert => alert.processedAt >= cutoff);

    const stats = {
      total: recentAlerts.length,
      bySeverity: {},
      byType: {},
      escalated: recentAlerts.filter(alert => alert.type.includes('_escalated')).length
    };

    // Count by severity
    recentAlerts.forEach(alert => {
      stats.bySeverity[alert.severity] = (stats.bySeverity[alert.severity] || 0) + 1;
      stats.byType[alert.type] = (stats.byType[alert.type] || 0) + 1;
    });

    return stats;
  }

  /**
   * Generate unique channel ID
   * @returns {string} Channel ID
   */
  generateChannelId() {
    return `channel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique alert ID
   * @returns {string} Alert ID
   */
  generateAlertId() {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Create singleton instance
const alertingService = new AlertingService();

// Add default console channel for development
alertingService.addAlertChannel({
  type: 'console',
  config: {},
  severityFilter: ['medium', 'high', 'critical']
});

export default alertingService;