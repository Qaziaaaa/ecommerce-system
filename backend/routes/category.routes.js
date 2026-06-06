import express from 'express';
import { getAllCategories, createCategory } from '../controllers/category.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { isAdmin } from '../middlewares/role.middleware.js';
import { apiCache, invalidateCacheMiddleware, CACHE_TTL } from '../middlewares/cache.middleware.js';

const router = express.Router();

/**
 * @openapi
 * /categories:
 *   get:
 *     tags: [Categories]
 *     summary: Get all categories
 *     responses:
 *       200:
 *         description: List of categories
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data: { type: array, items: { $ref: '#/components/schemas/Category' } }
 *   post:
 *     tags: [Categories]
 *     summary: Create a new category (Admin only)
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *               description: { type: string }
 *     responses:
 *       201:
 *         description: Category created
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 */
router.route('/')
    .get(apiCache(CACHE_TTL.CATEGORIES), getAllCategories)
    .post(protect, isAdmin, invalidateCacheMiddleware(['GET:/categories*', 'GET:/api/v1/categories*']), createCategory);

export default router;
