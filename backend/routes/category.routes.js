import express from 'express';
import { getAllCategories, createCategory } from '../controllers/category.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { isAdmin } from '../middlewares/role.middleware.js';
import { apiCache, invalidateCacheMiddleware, CACHE_TTL } from '../middlewares/cache.middleware.js';

const router = express.Router();

router.route('/')
    .get(apiCache(CACHE_TTL.CATEGORIES), getAllCategories)
    .post(protect, isAdmin, invalidateCacheMiddleware(['GET:/categories', 'GET:/api/v1/categories']), createCategory);

export default router;
