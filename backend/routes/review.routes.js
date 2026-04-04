import express from 'express';
import { getProductReviews, addReview } from '../controllers/review.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

// mergeParams: true allows us to access the :productId parameter from the parent router
const router = express.Router({ mergeParams: true });

router.route('/')
    .get(getProductReviews)
    .post(protect, addReview);

export default router;
