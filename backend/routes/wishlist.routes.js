import * as express from 'express';
import { protect } from '../middlewares/auth.middleware.js';
import User from '../models/User.js';
import Product from '../models/Product.js';
import AppError from '../utils/AppError.js';

const router = express.Router();

router.use(protect);

/**
 * @openapi
 * /wishlist:
 *   get:
 *     tags: [Wishlist]
 *     summary: Get current user's wishlist
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List of wishlist products
 *       401:
 *         description: Not authenticated
 */
router.get('/', async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate('wishlist');
    res.status(200).json({ status: 'success', data: user.wishlist });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /wishlist/{productId}:
 *   post:
 *     tags: [Wishlist]
 *     summary: Add a product to wishlist
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Product added to wishlist
 *       404:
 *         description: Product not found
 *       401:
 *         description: Not authenticated
 *   delete:
 *     tags: [Wishlist]
 *     summary: Remove a product from wishlist
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Product removed from wishlist
 *       401:
 *         description: Not authenticated
 */
router.post('/:productId', async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.productId);
    if (!product) return next(new AppError('Product not found', 404));

    await User.findByIdAndUpdate(req.user._id, { $addToSet: { wishlist: req.params.productId } });
    res.status(200).json({ status: 'success', message: 'Added to wishlist' });
  } catch (err) {
    next(err);
  }
});

router.delete('/:productId', async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { $pull: { wishlist: req.params.productId } });
    res.status(200).json({ status: 'success', message: 'Removed from wishlist' });
  } catch (err) {
    next(err);
  }
});

export default router;
