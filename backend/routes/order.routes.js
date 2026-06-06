import express from 'express';
import { protect } from '../middlewares/auth.middleware.js';
import { isAdmin } from '../middlewares/role.middleware.js';
import { orderLimiter, userApiLimiter } from '../middlewares/rateLimiter.js';
import {
    checkoutOrder,
    getMyOrders,
    getSingleOrder,
    updateOrderStatus,
    getAllOrders,
    createPaymentIntent,
    cancelPaymentIntent,
    deleteOrder
} from '../controllers/order.controller.js';

const router = express.Router();

// Protect all order routes
router.use(protect);

/**
 * @openapi
 * /orders:
 *   get:
 *     tags: [Orders]
 *     summary: Get all orders (Admin only)
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List of all orders
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 count: { type: integer }
 *                 data: { type: array, items: { $ref: '#/components/schemas/Order' } }
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 */
router.route('/')
    .get(isAdmin, getAllOrders);

/**
 * @openapi
 * /orders/checkout:
 *   post:
 *     tags: [Orders]
 *     summary: Create a new order (Cash on Delivery)
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [shippingAddress, paymentMethod]
 *             properties:
 *               shippingAddress: { $ref: '#/components/schemas/Address' }
 *               paymentMethod: { type: string, enum: [cod] }
 *               couponCode: { type: string }
 *     responses:
 *       201:
 *         description: Order created
 *       400:
 *         description: Invalid request or out of stock
 *       401:
 *         description: Not authenticated
 */
router.post('/checkout', orderLimiter, checkoutOrder);

/**
 * @openapi
 * /orders/create-payment-intent:
 *   post:
 *     tags: [Orders]
 *     summary: Create Stripe payment intent (Card payments)
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               couponCode: { type: string }
 *     responses:
 *       200:
 *         description: Payment intent created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 clientSecret: { type: string }
 *                 orderId: { type: string }
 *       401:
 *         description: Not authenticated
 */
router.post('/create-payment-intent', userApiLimiter, createPaymentIntent);

/**
 * @openapi
 * /orders/cancel-payment-intent:
 *   post:
 *     tags: [Orders]
 *     summary: Cancel a Stripe payment intent
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [orderId]
 *             properties:
 *               orderId: { type: string }
 *     responses:
 *       200:
 *         description: Payment intent cancelled
 *       401:
 *         description: Not authenticated
 */
router.post('/cancel-payment-intent', userApiLimiter, cancelPaymentIntent);

/**
 * @openapi
 * /orders/my-orders:
 *   get:
 *     tags: [Orders]
 *     summary: Get current user's orders
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         description: User's orders
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 count: { type: integer }
 *                 data: { type: array, items: { $ref: '#/components/schemas/Order' } }
 *       401:
 *         description: Not authenticated
 */
router.get('/my-orders', getMyOrders);

/**
 * @openapi
 * /orders/{id}:
 *   get:
 *     tags: [Orders]
 *     summary: Get a single order by ID
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Order details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data: { $ref: '#/components/schemas/Order' }
 *       404:
 *         description: Order not found
 *       401:
 *         description: Not authenticated
 *   delete:
 *     tags: [Orders]
 *     summary: Cancel/delete an order
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Order deleted
 *       401:
 *         description: Not authenticated
 */
router.get('/:id', getSingleOrder);
router.delete('/:id', deleteOrder);

/**
 * @openapi
 * /orders/{id}/status:
 *   patch:
 *     tags: [Orders]
 *     summary: Update order status (Admin only)
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
 *             required: [orderStatus]
 *             properties:
 *               orderStatus: { type: string, enum: [pending, processing, shipped, delivered, cancelled] }
 *     responses:
 *       200:
 *         description: Order status updated
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 */
router.patch('/:id/status', isAdmin, updateOrderStatus);

export default router;
