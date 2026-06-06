import express from 'express';
import { protect } from '../middlewares/auth.middleware.js';
import { isAdmin } from '../middlewares/role.middleware.js';
import * as adminController from '../controllers/admin.controller.js';
import { getAuditLogs } from '../services/audit.service.js';

const router = express.Router();

// Apply protect and isAdmin middlewares to all admin routes
router.use(protect, isAdmin);

/**
 * @openapi
 * /admin/dashboard:
 *   get:
 *     tags: [Admin]
 *     summary: Get dashboard overview (total users, orders, revenue)
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Dashboard overview data
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 */
router.get('/dashboard', adminController.getDashboardOverview);

/**
 * @openapi
 * /admin/sales/monthly:
 *   get:
 *     tags: [Admin]
 *     summary: Get monthly sales analytics
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Monthly sales data
 */
router.get('/sales/monthly', adminController.getMonthlySales);

/**
 * @openapi
 * /admin/products/top:
 *   get:
 *     tags: [Admin]
 *     summary: Get top selling products
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Top products list
 */
router.get('/products/top', adminController.getTopProducts);

/**
 * @openapi
 * /admin/orders/recent:
 *   get:
 *     tags: [Admin]
 *     summary: Get recent orders
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Recent orders list
 */
router.get('/orders/recent', adminController.getRecentOrders);

/**
 * @openapi
 * /admin/products/low-stock:
 *   get:
 *     tags: [Admin]
 *     summary: Get low stock alerts
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Low stock products
 */
router.get('/products/low-stock', adminController.getLowStockAlerts);

/**
 * @openapi
 * /admin/users:
 *   get:
 *     tags: [Admin]
 *     summary: Get all users
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Users list
 * /admin/users/{id}/role:
 *   patch:
 *     tags: [Admin]
 *     summary: Update user role
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [role]
 *             properties:
 *               role: { type: string, enum: [user, admin] }
 *     responses:
 *       200:
 *         description: Role updated
 */
router.get('/users', adminController.getAllUsers);
router.patch('/users/:id/role', adminController.updateUserRole);

/**
 * @openapi
 * /admin/analytics/category:
 *   get:
 *     tags: [Admin]
 *     summary: Get category distribution analytics
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Category distribution data
 */
router.get('/analytics/category', adminController.getCategoryDistribution);

/**
 * @openapi
 * /admin/analytics/logistics:
 *   get:
 *     tags: [Admin]
 *     summary: Get order status distribution analytics
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Order status distribution data
 */
router.get('/analytics/logistics', adminController.getOrderStatusDistribution);

/**
 * @openapi
 * /admin/audit-logs:
 *   get:
 *     tags: [Admin]
 *     summary: Get audit logs (Admin only)
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *       - in: query
 *         name: action
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Audit log entries
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 */
router.get('/audit-logs', async (req, res, next) => {
  try {
    const result = await getAuditLogs(req.query);
    res.status(200).json({ status: 'success', ...result });
  } catch (err) {
    next(err);
  }
});

export default router;
