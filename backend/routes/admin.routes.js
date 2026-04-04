import express from 'express';
import { protect } from '../middlewares/auth.middleware.js';
import { isAdmin } from '../middlewares/role.middleware.js';
import * as adminController from '../controllers/admin.controller.js';

const router = express.Router();

// Apply protect and isAdmin middlewares to all admin routes
router.use(protect, isAdmin);

// Dashboard Overview
router.get('/dashboard', adminController.getDashboardOverview);

// Monthly Sales Analytics
router.get('/sales/monthly', adminController.getMonthlySales);

// Top Selling Products
router.get('/products/top', adminController.getTopProducts);

// Recent Orders
router.get('/orders/recent', adminController.getRecentOrders);

// Low Stock Alert
router.get('/products/low-stock', adminController.getLowStockAlerts);

// User Management
router.get('/users', adminController.getAllUsers);
router.patch('/users/:id/role', adminController.updateUserRole);

// Advanced Analytics
router.get('/analytics/category', adminController.getCategoryDistribution);
router.get('/analytics/logistics', adminController.getOrderStatusDistribution);

export default router;
