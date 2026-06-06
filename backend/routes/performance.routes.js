import express from 'express';
import {
  receiveMetrics,
  getPerformanceSummary,
  getMetrics,
  getAlerts,
  configureAlerts,
  addAlertChannel,
  healthCheck,
  getDailyReport,
  getDeploymentReport
} from '../controllers/performance.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { isAdmin } from '../middlewares/role.middleware.js';

const router = express.Router();

/**
 * @openapi
 * /performance/health:
 *   get:
 *     tags: [Performance]
 *     summary: Health check endpoint
 *     responses:
 *       200:
 *         description: Server is healthy
 */
router.get('/health', healthCheck);

/**
 * @openapi
 * /performance/metrics:
 *   post:
 *     tags: [Performance]
 *     summary: Receive performance metrics from frontend (public)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Metrics received
 */
router.post('/metrics', receiveMetrics);

/**
 * @openapi
 * /performance/summary:
 *   get:
 *     tags: [Performance]
 *     summary: Get performance summary
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Performance summary
 */
router.get('/summary', protect, getPerformanceSummary);

/**
 * @openapi
 * /performance/metrics/query:
 *   get:
 *     tags: [Performance]
 *     summary: Query performance metrics
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Performance metrics
 */
router.get('/metrics/query', protect, getMetrics);

/**
 * @openapi
 * /performance/alerts:
 *   get:
 *     tags: [Performance]
 *     summary: Get configured alerts
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Alerts list
 * /performance/alerts/rules:
 *   post:
 *     tags: [Performance]
 *     summary: Configure alert rules
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Alert rules updated
 * /performance/alerts/channels:
 *   post:
 *     tags: [Performance]
 *     summary: Add alert notification channel
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Channel added
 */
router.get('/alerts', protect, isAdmin, getAlerts);
router.get('/report/daily', protect, isAdmin, getDailyReport);
router.get('/report/deployment', protect, isAdmin, getDeploymentReport);
router.post('/alerts/rules', protect, isAdmin, configureAlerts);
router.post('/alerts/channels', protect, isAdmin, addAlertChannel);

export default router;