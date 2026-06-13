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

/**
 * @openapi
 * /products/search/typeahead:
 *   get:
 *     tags: [Products]
 *     summary: Lightweight search for typeahead (returns id, name, price, image, slug)
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema: { type: string }
 *         description: Search term (min 2 characters)
 *     responses:
 *       200:
 *         description: Matching products
 */
router.get('/search/typeahead', async (req, res, next) => {
  try {
    const { searchProductsTypeahead } = await import('../services/product.service.js');
    const results = await searchProductsTypeahead(req.query.q, 8);
    res.json({ status: 'success', results });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /products:
 *   get:
 *     tags: [Products]
 *     summary: Get all products (with search, filter, pagination)
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Search term for product name, description, or brand
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *         description: Filter by category ID
 *       - in: query
 *         name: minPrice
 *         schema: { type: number }
 *         description: Minimum price filter
 *       - in: query
 *         name: maxPrice
 *         schema: { type: number }
 *         description: Maximum price filter
 *       - in: query
 *         name: sort
 *         schema: { type: string, enum: [price, -price, name, -name, createdAt, -createdAt] }
 *         description: Sort field (prefix with - for descending)
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 8 }
 *     responses:
 *       200:
 *         description: List of products
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 results: { type: integer }
 *                 totalPages: { type: integer }
 *                 currentPage: { type: integer }
 *                 data: { type: array, items: { $ref: '#/components/schemas/Product' } }
 *   post:
 *     tags: [Products]
 *     summary: Create a new product (Admin only)
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, price, category]
 *             properties:
 *               name: { type: string }
 *               description: { type: string }
 *               price: { type: number }
 *               category: { type: string }
 *               brand: { type: string }
 *               stock: { type: integer }
 *               images: { type: array, items: { type: object, properties: { url: { type: string }, alt: { type: string } } } }
 *     responses:
 *       201:
 *         description: Product created
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized (admin only)
 */
router.route('/')
    .get(optionalAuth, apiCache(CACHE_TTL.PRODUCTS_LIST, { skipAdmin: true }), getProducts)
    .post(protect, isAdmin, validateCreateProduct, invalidateCacheMiddleware(['GET:/products*', 'GET:/api/v1/products*']), createProduct);

/**
 * @openapi
 * /products/{id}:
 *   get:
 *     tags: [Products]
 *     summary: Get a single product by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Product details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data: { $ref: '#/components/schemas/Product' }
 *       404:
 *         description: Product not found
 *   patch:
 *     tags: [Products]
 *     summary: Update a product (Admin only)
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
 *             properties:
 *               name: { type: string }
 *               description: { type: string }
 *               price: { type: number }
 *               stock: { type: integer }
 *               isActive: { type: boolean }
 *     responses:
 *       200:
 *         description: Product updated
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *   delete:
 *     tags: [Products]
 *     summary: Delete a product (Admin only)
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Product deleted
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 */
router.route('/:id')
    .get(optionalAuth, apiCache(CACHE_TTL.PRODUCT_DETAIL), getProductById)
    .patch(protect, isAdmin, validateUpdateProduct, invalidateCacheMiddleware(['GET:/products*', 'GET:/api/v1/products*']), updateProduct)
    .delete(protect, isAdmin, invalidateCacheMiddleware(['GET:/products*', 'GET:/api/v1/products*']), deleteProduct);

export default router;
