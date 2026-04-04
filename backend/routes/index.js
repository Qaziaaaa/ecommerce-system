import express from 'express';
import authRoutes from './auth.routes.js';
import productRoutes from './product.routes.js';
import cartRoutes from './cart.routes.js';
import orderRoutes from './order.routes.js';
import adminRoutes from './admin.routes.js';
import categoryRoutes from './category.routes.js';
import uploadRoutes from './upload.routes.js';

import couponRoutes from './coupon.routes.js';

const router = express.Router();

// ... existing routes
router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/cart', cartRoutes);
router.use('/orders', orderRoutes);
router.use('/admin', adminRoutes);
router.use('/categories', categoryRoutes);
router.use('/upload', uploadRoutes);
router.use('/coupons', couponRoutes);

export default router;
