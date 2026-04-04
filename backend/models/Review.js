import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            required: [true, 'Review must belong to a user']
        },
        product: {
            type: mongoose.Schema.ObjectId,
            ref: 'Product',
            required: [true, 'Review must belong to a product']
        },
        rating: {
            type: Number,
            min: 1,
            max: 5,
            required: [true, 'Review must have a rating']
        },
        comment: {
            type: String,
            required: [true, 'Review must have a comment']
        },
        isApproved: {
            type: Boolean,
            default: true // Assuming auto-approval, can be set to false for moderation
        }
    },
    {
        timestamps: true
    }
);

// Prevent duplicate reviews: One user can only review a specific product once
reviewSchema.index({ product: 1, user: 1 }, { unique: true });

const Review = mongoose.model('Review', reviewSchema);
export default Review;
