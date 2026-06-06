import express from 'express';
import { applyCoupon } from '../controllers/coupon.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = express.Router();

/**
 * @openapi
 * /coupons/apply:
 *   post:
 *     tags: [Coupons]
 *     summary: Apply a coupon code to get discount
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code]
 *             properties:
 *               code: { type: string }
 *     responses:
 *       200:
 *         description: Coupon applied
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 discountPercent: { type: number }
 *       400:
 *         description: Invalid or expired coupon
 *       401:
 *         description: Not authenticated
 */
router.post('/apply', protect, applyCoupon);

export default router;
