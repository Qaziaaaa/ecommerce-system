import mongoose from 'mongoose';
import Order from '../models/Order.js';
import User from '../models/User.js';
import Product from '../models/Product.js';
import Coupon from '../models/Coupon.js';
import logger from '../utils/logger.js';

async function withTransaction(fn) {
  let session;
  try {
    if (mongoose.connection.readyState !== 1) { return fn(null); }
    const client = mongoose.connection.getClient();
    const type = client?.topology?.description?.type;
    if (type === 'Standalone' || type === 'Single') { return fn(null); }
    session = await mongoose.startSession();
  } catch {
    return fn(null);
  }
  try {
    session.startTransaction();
  } catch {
    try { session.endSession(); } catch {}
    return fn(null);
  }

  let result;
  try {
    result = await fn(session);
  } catch (error) {
    try { await session.abortTransaction(); } catch {}
    try { session.endSession(); } catch {}
    throw error;
  }

  try {
    await session.commitTransaction();
  } catch {
    try { session.endSession(); } catch {}
  }
  return result;
}

export const calculateOrderAmountService = async (clientItems, couponCode) => {
    if (!clientItems || clientItems.length === 0) {
        throw new Error('Your cart is empty');
    }

    let totalAmount = 0;

    const productIds = clientItems.map(item => item.product || item.id);
    const products = await Product.find({ _id: { $in: productIds } });
    const productMap = new Map(products.map(p => [p._id.toString(), p]));

    for (const item of clientItems) {
        const product = productMap.get((item.product || item.id).toString());
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

export const createPendingOrderService = async (userId, clientItems, couponCode) => {
    if (!clientItems || clientItems.length === 0) {
        throw new Error('Your cart is empty');
    }

    const orderItems = [];
    let totalAmount = 0;

    const productIds = clientItems.map(item => item.product || item.id);
    const products = await Product.find({ _id: { $in: productIds } });
    const productMap = new Map(products.map(p => [p._id.toString(), p]));

    for (const item of clientItems) {
        const product = productMap.get((item.product || item.id).toString());
        if (!product || !product.isActive) {
            throw new Error(`A product in your cart is no longer available`);
        }
        if (product.stock < item.quantity) {
            throw new Error(`${product.name} only has ${product.stock} units left`);
        }
        const price = product.discountPrice || product.price;
        totalAmount += price * item.quantity;
        orderItems.push({ product: product._id, quantity: item.quantity, price });
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

    const order = await Order.create({ user: userId, orderItems, totalAmount, paymentMethod: 'Credit Card', paymentStatus: 'pending', orderStatus: 'pending' });
    return order;
};

export const checkoutOrderService = async (userId, checkoutData) => {
    const { orderItems: clientItems, shippingAddress, paymentMethod, paymentIntentId, couponCode, orderId } = checkoutData;

    if (!clientItems || clientItems.length === 0) {
        throw new Error('Your cart is empty');
    }

    let totalAmount = 0;
    const orderItems = [];

    const productIds = clientItems.map(item => item.product || item.id);
    const products = await Product.find({ _id: { $in: productIds } });
    const productMap = new Map(products.map(p => [p._id.toString(), p]));

    for (const item of clientItems) {
        const product = productMap.get((item.product || item.id).toString());
        if (!product || !product.isActive) {
            throw new Error(`A product in your cart is no longer available`);
        }
        if (product.stock < item.quantity) {
            throw new Error(`${product.name} only has ${product.stock} units left`);
        }
        const price = product.discountPrice || product.price;
        totalAmount += price * item.quantity;
        orderItems.push({ product: product._id, quantity: item.quantity, price });
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
        const expectedAmountInCents = Math.round(totalAmount * 100);
        if (paymentIntent.amount !== expectedAmountInCents) {
            throw new Error('Payment amount mismatch. Possible tampering.');
        }
    }

    return withTransaction(async (session) => {
        const bulkOps = orderItems.map(item => ({
            updateOne: {
                filter: { _id: item.product, stock: { $gte: item.quantity } },
                update: { $inc: { stock: -item.quantity } }
            }
        }));

        const bulkOptions = session ? { session } : {};
        const bulkResult = await Product.bulkWrite(bulkOps, bulkOptions);

        if (bulkResult.modifiedCount !== orderItems.length) {
            throw new Error('Sorry, one or more items in your cart just sold out. Please go back and update your cart.');
        }

        if (orderId) {
            const existingOrder = await Order.findById(orderId, null, bulkOptions);
            if (!existingOrder) {
                throw new Error('Pending order not found');
            }
            if (existingOrder.paymentStatus !== 'pending') {
                throw new Error('Order has already been processed');
            }
            existingOrder.orderItems = orderItems;
            existingOrder.totalAmount = totalAmount;
            existingOrder.shippingAddress = shippingAddress;
            existingOrder.paymentMethod = paymentMethod;
            existingOrder.paymentStatus = paymentMethod === 'Credit Card' ? 'paid' : 'pending';
            existingOrder.orderStatus = 'pending';
            existingOrder.stripePaymentIntentId = paymentIntentId || existingOrder.stripePaymentIntentId;
            await existingOrder.save(bulkOptions);
            return existingOrder;
        }

        const newOrder = new Order({
            user: userId,
            orderItems,
            totalAmount,
            shippingAddress,
            paymentMethod,
            paymentStatus: paymentMethod === 'Credit Card' ? 'paid' : 'pending',
            orderStatus: 'pending',
            stripePaymentIntentId: paymentIntentId,
        });
        await newOrder.save(bulkOptions);
        return newOrder;
    });
};

export const getUserOrdersService = async (userId) => {
    return await Order.find({ user: userId })
        .populate({
            path: 'orderItems.product',
            select: 'name images price'
        })
        .sort('-createdAt');
};

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

    if (order.user._id.toString() !== user._id.toString() && user.role !== 'admin') {
        throw new Error('You do not have permission to view this order');
    }

    return order;
};

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

    return order;
};

export const getAllOrdersService = async ({ page = 1, limit = 20 } = {}) => {
    const skip = (page - 1) * limit;
    const [orders, total] = await Promise.all([
        Order.find().populate('user', 'name email').sort('-createdAt').skip(skip).limit(limit),
        Order.countDocuments()
    ]);
    return { orders, total, totalPages: Math.ceil(total / limit), currentPage: page };
};

export const deleteOrderService = async (orderId, user) => {
    const order = await Order.findById(orderId);
    
    if (!order) {
        throw new Error('Order not found');
    }

    if (order.user.toString() !== user._id.toString() && user.role !== 'admin') {
        throw new Error('You do not have permission to delete this order');
    }

    if (user.role !== 'admin' && ['shipped', 'delivered'].includes(order.orderStatus)) {
        throw new Error(`Cannot cancel an order that is already ${order.orderStatus}`);
    }

    return withTransaction(async (session) => {
        const opts = session ? { session } : {};

        if (['pending', 'processing'].includes(order.orderStatus)) {
            const bulkOps = order.orderItems.map(item => ({
                updateOne: {
                    filter: { _id: item.product },
                    update: { $inc: { stock: item.quantity } }
                }
            }));
            await Product.bulkWrite(bulkOps, opts);
        }

        await Order.findByIdAndDelete(orderId, opts);
        return true;
    });
};

export const updatePendingOrderStatusFromWebhook = async (order, session) => {
    const opts = session ? { session } : {};

    const bulkOps = order.orderItems.map(item => ({
        updateOne: {
            filter: { _id: item.product, stock: { $gte: item.quantity } },
            update: { $inc: { stock: -item.quantity } }
        }
    }));
    const bulkResult = await Product.bulkWrite(bulkOps, opts);

    if (bulkResult.modifiedCount !== order.orderItems.length) {
        throw new Error('Sorry, one or more items in your cart just sold out. Please go back and update your cart.');
    }

    order.paymentStatus = 'paid';
    order.orderStatus = 'processing';
    await order.save(opts);
    logger.info(`Order ${order._id} confirmed via webhook: paymentStatus=paid, stock deducted`);
    return order;
};
