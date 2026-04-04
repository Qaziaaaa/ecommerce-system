import Review from '../models/Review.js';
import Product from '../models/Product.js';

export const getProductReviews = async (req, res, next) => {
    try {
        const { productId } = req.params;

        const reviews = await Review.find({ product: productId, isApproved: true })
            .populate('user', 'name')
            .sort({ createdAt: -1 });

        res.status(200).json({
            status: 'success',
            results: reviews.length,
            data: {
                reviews
            }
        });
    } catch (error) {
        res.status(400).json({ status: 'error', message: error.message });
    }
};

export const addReview = async (req, res, next) => {
    try {
        const { productId } = req.params;
        const { rating, comment } = req.body;
        const userId = req.user._id;

        // Check if product exists
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ status: 'error', message: 'Product not found' });
        }

        // Check if user already reviewed
        const existingReview = await Review.findOne({ product: productId, user: userId });
        if (existingReview) {
            return res.status(400).json({ status: 'error', message: 'You have already reviewed this product' });
        }

        // Create review
        const review = await Review.create({
            user: userId,
            product: productId,
            rating: Number(rating),
            comment
        });

        // Calculate new average rating for product
        const reviews = await Review.find({ product: productId });
        const numReviews = reviews.length;
        const avgRating = reviews.reduce((acc, item) => item.rating + acc, 0) / numReviews;

        product.ratingsAverage = avgRating;
        product.ratingsCount = numReviews;
        await product.save({ validateBeforeSave: false });

        res.status(201).json({
            status: 'success',
            message: 'Review added successfully',
            data: {
                review
            }
        });
    } catch (error) {
        res.status(400).json({ status: 'error', message: error.message });
    }
};
