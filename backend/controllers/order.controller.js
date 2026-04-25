import * as orderService from '../services/order.service.js';
import AppError from '../utils/AppError.js';

export const checkoutOrder = async (req, res, next) => {
    try {
        const { shippingAddress, paymentMethod, orderItems } = req.body;

        if (!shippingAddress || !paymentMethod || !orderItems || orderItems.length === 0) {
            return next(new AppError('Please provide orderItems, shippingAddress, and paymentMethod', 400));
        }

        const order = await orderService.checkoutOrderService(req.user._id, req.body);

        res.status(201).json({
            status: 'success',
            message: 'Order created successfully',
            data: { order }
        });
    } catch (error) {
        next(error);
    }
};

export const cancelPaymentIntent = async (req, res, next) => {
    try {
        const { paymentIntentId } = req.body;
        if (!paymentIntentId) {
            return res.status(400).json({ status: 'fail', message: 'Payment Intent ID is required' });
        }
        
        const Stripe = (await import('stripe')).default;
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
        
        await stripe.paymentIntents.cancel(paymentIntentId);
        
        res.status(200).json({ status: 'success' });
    } catch (error) {
        next(error);
    }
};

export const createPaymentIntent = async (req, res, next) => {
    try {
        const { orderItems, couponCode } = req.body;

        if (!orderItems || orderItems.length === 0) {
            return next(new AppError('Cart is empty', 400));
        }

        const amount = await orderService.calculateOrderAmountService(orderItems, couponCode);

        // Required minimal amount for stripe is usually $0.50 (50 cents)
        if (amount < 0.5) {
             return next(new AppError('Order amount must be at least $0.50', 400));
        }

        const Stripe = (await import('stripe')).default;
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100), // in cents
            currency: 'usd',
            payment_method_types: ['card'],
        });

        res.status(200).json({
            status: 'success',
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id
        });
    } catch (error) {
        next(error);
    }
};

export const getMyOrders = async (req, res, next) => {
    try {
        const orders = await orderService.getUserOrdersService(req.user._id);

        res.status(200).json({
            status: 'success',
            results: orders.length,
            data: { orders }
        });
    } catch (error) {
        next(error);
    }
};

export const getSingleOrder = async (req, res, next) => {
    try {
        const order = await orderService.getSingleOrderService(req.params.id, req.user);

        if (!order) {
            return next(new AppError('No order found with that ID', 404));
        }

        res.status(200).json({
            status: 'success',
            data: { order }
        });
    } catch (error) {
        next(error);
    }
};

export const updateOrderStatus = async (req, res, next) => {
    try {
        const { orderStatus } = req.body;

        if (!orderStatus) {
            return next(new AppError('Please provide new orderStatus', 400));
        }

        const order = await orderService.updateOrderStatusService(req.params.id, orderStatus);

        if (!order) {
            return next(new AppError('No order found with that ID', 404));
        }

        res.status(200).json({
            status: 'success',
            message: 'Order status updated',
            data: { order }
        });
    } catch (error) {
        next(error);
    }
};

export const getAllOrders = async (req, res, next) => {
    try {
        const { page, limit } = req.query;
        const result = await orderService.getAllOrdersService({ page, limit });

        res.status(200).json({
            status: 'success',
            results: result.orders.length,
            data: { 
                orders: result.orders,
                total: result.total,
                totalPages: result.totalPages,
                currentPage: result.currentPage
            }
        });
    } catch (error) {
        next(error);
    }
};

export const deleteOrder = async (req, res, next) => {
    try {
        const success = await orderService.deleteOrderService(req.params.id, req.user);

        if (!success) {
            return next(new AppError('Order could not be cancelled or not found', 404));
        }

        res.status(200).json({
            status: 'success',
            message: 'Order cancelled successfully. Stock has been restored.'
        });
    } catch (error) {
        next(error);
    }
};
