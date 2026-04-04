import Order from '../models/Order.js';
import User from '../models/User.js';
import Product from '../models/Product.js';
import Coupon from '../models/Coupon.js';

/**
 * Handle Order Checkout
 * Accepts orderItems from request body (client cart) and validates server-side
 * @param {String} userId 
 * @param {Object} checkoutData - orderItems, shippingAddress, paymentMethod
 */
export const calculateOrderAmountService = async (clientItems, couponCode) => {
    if (!clientItems || clientItems.length === 0) {
        throw new Error('Your cart is empty');
    }

    let totalAmount = 0;

    for (const item of clientItems) {
        const product = await Product.findById(item.product || item.id);
        if (!product || !product.isActive) {
            throw new Error(`A product in your cart is no longer available`);
        }
        if (product.stock < item.quantity) {
            throw new Error(`${product.name} only has ${product.stock} units left`);
        }
        const price = product.discountPrice || product.price;
        totalAmount += price * item.quantity;
    }

    if (couponCode) {
        const coupon = await Coupon.findOne({
            code: couponCode.toUpperCase(),
            isActive: true,
            expiryDate: { $gt: Date.now() }
        });

        if (coupon && totalAmount >= coupon.minOrderValue) {
            let discountAmount = 0;
            if (coupon.discountType === 'percentage') {
                discountAmount = (totalAmount * coupon.discountValue) / 100;
            } else {
                discountAmount = coupon.discountValue;
            }
            if (discountAmount > totalAmount) discountAmount = totalAmount;
            totalAmount -= discountAmount;
        }
    }

    return totalAmount;
};

export const checkoutOrderService = async (userId, checkoutData) => {
    const { orderItems: clientItems, shippingAddress, paymentMethod, paymentIntentId, couponCode } = checkoutData;

    if (!clientItems || clientItems.length === 0) {
        throw new Error('Your cart is empty');
    }

    let totalAmount = 0;
    const orderItems = [];

    // Validate each item against the database
    for (const item of clientItems) {
        const product = await Product.findById(item.product || item.id);

        if (!product || !product.isActive) {
            throw new Error(`A product in your cart is no longer available`);
        }

        if (product.stock < item.quantity) {
            throw new Error(`${product.name} only has ${product.stock} units left`);
        }

        const price = product.discountPrice || product.price;
        totalAmount += price * item.quantity;

        orderItems.push({
            product: product._id,
            quantity: item.quantity,
            price: price
        });
    }

    if (couponCode) {
        const coupon = await Coupon.findOne({
            code: couponCode.toUpperCase(),
            isActive: true,
            expiryDate: { $gt: Date.now() }
        });

        if (coupon && totalAmount >= coupon.minOrderValue) {
            let discountAmount = 0;
            if (coupon.discountType === 'percentage') {
                discountAmount = (totalAmount * coupon.discountValue) / 100;
            } else {
                discountAmount = coupon.discountValue;
            }
            if (discountAmount > totalAmount) discountAmount = totalAmount;
            totalAmount -= discountAmount;
        }
    }

    if (paymentMethod === 'Credit Card') {
        if (!paymentIntentId) {
            throw new Error('Payment Intent ID is required for Credit Card payments');
        }
        
        const Stripe = (await import('stripe')).default;
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
        
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        if (paymentIntent.status !== 'succeeded') {
            throw new Error('Payment was not successful');
        }
        // Verify amount (Stripe expects integer cents)
        const expectedAmountInCents = Math.round(totalAmount * 100);
        if (paymentIntent.amount !== expectedAmountInCents) {
            throw new Error('Payment amount mismatch. Possible tampering.');
        }
    }

    // Create Order
    const newOrder = new Order({
        user: userId,
        orderItems,
        totalAmount,
        shippingAddress,
        paymentMethod,
        paymentStatus: paymentMethod === 'Credit Card' ? 'paid' : 'pending',
        orderStatus: 'pending'
    });

    await newOrder.save();

    // Reduce product stock
    for (const item of orderItems) {
        await Product.findByIdAndUpdate(
            item.product,
            { $inc: { stock: -item.quantity } }
        );
    }

    return newOrder;
};

/**
 * Get logged-in user's order history
 */
export const getUserOrdersService = async (userId) => {
    return await Order.find({ user: userId })
        .populate({
            path: 'orderItems.product',
            select: 'name images price'
        })
        .sort('-createdAt');
};

/**
 * Get single order verification (Owner or Admin)
 */
export const getSingleOrderService = async (orderId, user) => {
    const order = await Order.findById(orderId)
        .populate({
            path: 'orderItems.product',
            select: 'name images price'
        })
        .populate('user', 'name email');

    if (!order) {
        throw new Error('Order not found');
    }

    // Protection rule - restrict to owner or admin role
    if (order.user._id.toString() !== user._id.toString() && user.role !== 'admin') {
        throw new Error('You do not have permission to view this order');
    }

    return order;
};

/**
 * Update Order status (Admin only)
 */
export const updateOrderStatusService = async (orderId, newStatus) => {
    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(newStatus)) {
        throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    const order = await Order.findByIdAndUpdate(
        orderId,
        { orderStatus: newStatus },
        { new: true, runValidators: true }
    );

    if (!order) {
        throw new Error('Order not found');
    }

    // Optional improvement: If cancelled, add the stock back using a transaction here if desired

    return order;
};
/**
 * Get all orders (Admin only)
 */
export const getAllOrdersService = async () => {
    return await Order.find()
        .populate('user', 'name email')
        .sort('-createdAt');
};

/**
 * Delete / Cancel an order
 * Restores stock if the order was not yet shipped/delivered.
 */
export const deleteOrderService = async (orderId, user) => {
    const order = await Order.findById(orderId);
    
    if (!order) {
        throw new Error('Order not found');
    }

    // Protection rule - restrict to owner or admin
    if (order.user.toString() !== user._id.toString() && user.role !== 'admin') {
        throw new Error('You do not have permission to delete this order');
    }

    // Regular users cannot cancel shipped or delivered orders
    if (user.role !== 'admin' && ['shipped', 'delivered'].includes(order.orderStatus)) {
        throw new Error(`Cannot cancel an order that is already ${order.orderStatus}`);
    }

    // If order was pending or processing, restore the physical stock to the store
    if (['pending', 'processing'].includes(order.orderStatus)) {
        for (const item of order.orderItems) {
            await Product.findByIdAndUpdate(
                item.product,
                { $inc: { stock: item.quantity } } // Increment back the quantity
            );
        }
    }

    // Delete the order record entirely (or you could just mark it cancelled)
    await Order.findByIdAndDelete(orderId);
    return true;
};
