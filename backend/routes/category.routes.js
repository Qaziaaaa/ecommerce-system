import express from 'express';
import { getAllCategories, createCategory } from '../controllers/category.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { isAdmin } from '../middlewares/role.middleware.js';

const router = express.Router();

router.route('/')
    .get(getAllCategories)
    .post(protect, isAdmin, createCategory);

export default router;
