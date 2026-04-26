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

// Health check endpoint (public)
router.get('/health', healthCheck);

// Receive performance metrics from frontend (public — no auth for perf tracking)
router.post('/metrics', receiveMetrics);

// Protected endpoints
router.get('/summary', protect, getPerformanceSummary);
router.get('/metrics/query', protect, getMetrics);

// Admin-only endpoints
router.get('/alerts', protect, isAdmin, getAlerts);
router.get('/report/daily', protect, isAdmin, getDailyReport);
router.get('/report/deployment', protect, isAdmin, getDeploymentReport);
router.post('/alerts/rules', protect, isAdmin, configureAlerts);
router.post('/alerts/channels', protect, isAdmin, addAlertChannel);

export default router;