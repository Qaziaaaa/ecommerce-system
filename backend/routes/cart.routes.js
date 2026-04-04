import express from 'express';
import { protect } from '../middlewares/auth.middleware.js';
import {
    addToCart,
    getCart,
    updateCartItem,
    removeCartItem
} from '../controllers/cart.controller.js';

const router = express.Router();

// All cart routes require authentication
router.use(protect);

router.route('/')
    .get(getCart)
    .post(addToCart);

router.route('/:productId')
    .patch(updateCartItem)
    .delete(removeCartItem);

export default router;
