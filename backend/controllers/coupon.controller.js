import Coupon from '../models/Coupon.js';

export const applyCoupon = async (req, res, next) => {
    try {
        const { code, cartTotal } = req.body;

        if (!code || typeof code !== 'string' || code.length > 50) {
            return res.status(400).json({ status: 'error', message: 'Please provide a valid coupon code' });
        }

        if (cartTotal == null || typeof cartTotal !== 'number' || cartTotal < 0 || !Number.isFinite(cartTotal)) {
            return res.status(400).json({ status: 'error', message: 'cartTotal must be a valid positive number' });
        }

        const coupon = await Coupon.findOne({
            code: code.toUpperCase(),
            isActive: true,
            expiryDate: { $gt: Date.now() }
        });

        if (!coupon) {
            return res.status(404).json({ status: 'error', message: 'Invalid or expired coupon code' });
        }

        if (cartTotal == null) {
            return res.status(400).json({ status: 'error', message: 'cartTotal is required' });
        }

        if (cartTotal < coupon.minOrderValue) {
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
        if (discountAmount > cartTotal) {
            discountAmount = cartTotal;
        }

        res.status(200).json({
            status: 'success',
            message: 'Coupon applied successfully',
            data: {
                discountAmount,
                discountType: coupon.discountType,
                discountValue: coupon.discountValue,
                code: coupon.code
            }
        });
    } catch (error) {
        next(error);
    }
};
