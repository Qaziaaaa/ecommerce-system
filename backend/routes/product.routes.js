import express from 'express';
import {
    createProduct,
    getProducts,
    getProductById,
    updateProduct,
    deleteProduct
} from '../controllers/product.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { isAdmin } from '../middlewares/role.middleware.js';
import { validateCreateProduct, validateUpdateProduct } from '../validators/product.validator.js';
import { optionalAuth } from '../middlewares/optionalAuth.middleware.js';

import reviewRoutes from './review.routes.js';

const router = express.Router();

router.use('/:productId/reviews', reviewRoutes);

router.route('/')
    .get(optionalAuth, getProducts)
    .post(protect, isAdmin, validateCreateProduct, createProduct);

router.route('/:id')
    .get(optionalAuth, getProductById)
    .patch(protect, isAdmin, validateUpdateProduct, updateProduct)
    .delete(protect, isAdmin, deleteProduct);

export default router;
