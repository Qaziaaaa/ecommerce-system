import Coupon from '../models/Coupon.js';

export const applyCoupon = async (req, res, next) => {
    try {
        const { code, cartTotal } = req.body;

        if (!code) {
            return res.status(400).json({ status: 'error', message: 'Please provide a coupon code' });
        }

        const coupon = await Coupon.findOne({
            code: code.toUpperCase(),
            isActive: true,
            expiryDate: { $gt: Date.now() }
        });

        if (!coupon) {
            return res.status(404).json({ status: 'error', message: 'Invalid or expired coupon code' });
        }

        if (cartTotal && cartTotal < coupon.minOrderValue) {
            return res.status(400).json({ 
                status: 'error', 
                message: `This coupon requires a minimum purchase of $${coupon.minOrderValue}` 
            });
        }

        // Calculate discount amount
        let discountAmount = 0;
        if (coupon.discountType === 'percentage') {
            discountAmount = (cartTotal * coupon.discountValue) / 100;
        } else {
            discountAmount = coupon.discountValue;
        }

        // Ensure discount doesn't exceed cart total
        if (cartTotal && discountAmount > cartTotal) {
            discountAmount = cartTotal;
        }

        res.status(200).json({
            status: 'success',
            message: 'Coupon applied successfully',
            data: {
                coupon: {
                    ...coupon.toObject(),
                    calculatedDiscount: discountAmount
                }
            }
        });
    } catch (error) {
        res.status(400).json({ status: 'error', message: error.message });
    }
};
