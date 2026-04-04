import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema(
    {
        code: {
            type: String,
            required: [true, 'Coupon must have a code'],
            unique: true,
            uppercase: true,
            trim: true
        },
        discountType: {
            type: String,
            enum: ['percentage', 'fixed'],
            required: [true, 'Coupon must have a discount type']
        },
        discountValue: {
            type: Number,
            required: [true, 'Coupon must have a discount value']
        },
        minOrderValue: {
            type: Number,
            default: 0
        },
        expiryDate: {
            type: Date,
            required: [true, 'Coupon must have an expiry date']
        },
        usageLimit: {
            type: Number,
            default: null // null means unlimited within expiry
        },
        usedCount: {
            type: Number,
            default: 0
        },
        isActive: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
);

// Index for expiry checks - we don't use a TTL index (expires: '0s') here
// because we might want to keep expired coupons for historical records,
// but we index it to quickly filter out active vs expired coupons.
couponSchema.index({ expiryDate: 1 });

const Coupon = mongoose.model('Coupon', couponSchema);
export default Coupon;
