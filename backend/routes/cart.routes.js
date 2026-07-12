import express from 'express';
import { protect } from '../middlewares/auth.middleware.js';
import { noCacheMiddleware } from '../middlewares/cache.middleware.js';
import {
    addToCart,
    getCart,
    updateCartItem,
    removeCartItem,
    syncCart
} from '../controllers/cart.controller.js';

const router = express.Router();

// All cart routes require authentication
router.use(protect);

/**
 * @openapi
 * /cart:
 *   get:
 *     tags: [Cart]
 *     summary: Get current user's cart
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Cart with items
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data: { $ref: '#/components/schemas/Cart' }
 *       401:
 *         description: Not authenticated
 *   post:
 *     tags: [Cart]
 *     summary: Add item to cart
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [productId, quantity]
 *             properties:
 *               productId: { type: string }
 *               quantity: { type: integer, minimum: 1 }
 *     responses:
 *       200:
 *         description: Item added to cart
 *       400:
 *         description: Invalid product or out of stock
 *       401:
 *         description: Not authenticated
 */
router.route('/')
    .get(noCacheMiddleware, getCart)
    .post(addToCart);

// Sync localStorage cart to server (called on login)
router.put('/sync', syncCart);

/**
 * @openapi
 * /cart/{productId}:
 *   patch:
 *     tags: [Cart]
 *     summary: Update cart item quantity
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [quantity]
 *             properties:
 *               quantity: { type: integer, minimum: 0 }
 *     responses:
 *       200:
 *         description: Cart updated
 *       401:
 *         description: Not authenticated
 *   delete:
 *     tags: [Cart]
 *     summary: Remove item from cart
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Item removed
 *       401:
 *         description: Not authenticated
 */
router.route('/:productId')
    .patch(updateCartItem)
    .delete(removeCartItem);

export default router;
