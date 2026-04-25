import express from 'express';
import { protect } from '../middlewares/auth.middleware.js';
import { isAdmin } from '../middlewares/role.middleware.js';
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

router.route('/')
    .get(isAdmin, getAllOrders);

router.post('/checkout', checkoutOrder);
router.post('/create-payment-intent', createPaymentIntent);
router.post('/cancel-payment-intent', cancelPaymentIntent);
router.get('/my-orders', getMyOrders);
router.get('/:id', getSingleOrder);
router.delete('/:id', deleteOrder);

// Admin only routes
router.patch('/:id/status', isAdmin, updateOrderStatus);

export default router;
