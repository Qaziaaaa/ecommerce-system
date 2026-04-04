import express from 'express';
import { applyCoupon } from '../controllers/coupon.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.post('/apply', protect, applyCoupon);

export default router;
