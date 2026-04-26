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
import { apiCache, invalidateCacheMiddleware, CACHE_TTL } from '../middlewares/cache.middleware.js';

import reviewRoutes from './review.routes.js';

const router = express.Router();

router.use('/:productId/reviews', reviewRoutes);

router.route('/')
    .get(optionalAuth, apiCache(CACHE_TTL.PRODUCTS_LIST), getProducts)
    .post(protect, isAdmin, validateCreateProduct, invalidateCacheMiddleware(['GET:/products', 'GET:/api/v1/products']), createProduct);

router.route('/:id')
    .get(optionalAuth, apiCache(CACHE_TTL.PRODUCT_DETAIL), getProductById)
    .patch(protect, isAdmin, validateUpdateProduct, invalidateCacheMiddleware(['GET:/products', 'GET:/api/v1/products']), updateProduct)
    .delete(protect, isAdmin, invalidateCacheMiddleware(['GET:/products', 'GET:/api/v1/products']), deleteProduct);

export default router;
