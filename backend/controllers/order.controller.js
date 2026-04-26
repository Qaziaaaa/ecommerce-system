import * as orderService from '../services/order.service.js';
import AppError from '../utils/AppError.js';
import logger from '../utils/logger.js';
import { stripeCircuitBreaker, CircuitOpenError } from '../utils/circuit-breaker.js';

/**
 * Map Stripe error codes to user-friendly messages.
 * Requirements: 5.6 — Property 20: Payment Error Logging and User Messages
 */
const getStripeUserMessage = (stripeError) => {
  const messages = {
    card_declined:          'Your card was declined. Please try a different card.',
    insufficient_funds:     'Your card has insufficient funds.',
    expired_card:           'Your card has expired. Please use a different card.',
    incorrect_cvc:          'Your card security code is incorrect.',
    processing_error:       'An error occurred while processing your card. Please try again.',
    incorrect_number:       'Your card number is incorrect.',
    invalid_expiry_month:   'Your card expiry month is invalid.',
    invalid_expiry_year:    'Your card expiry year is invalid.',
    authentication_required:'Your card requires authentication. Please try again.',
  };
  return messages[stripeError?.code] || 'Payment could not be processed. Please try again or use a different payment method.';
};

/**
 * Log a payment failure with full context for debugging.
 * Requirements: 5.6
 */
const logPaymentFailure = (context, error, userId) => {
  logger.error('Payment processing failed', {
    context,
    userId: userId?.toString(),
    errorType: error.type || error.name,
    errorCode: error.code,
    errorMessage: error.message,
    stripeRequestId: error.requestId,
    timestamp: new Date().toISOString(),
  });
};

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
        
        await stripeCircuitBreaker.execute(() => stripe.paymentIntents.cancel(paymentIntentId));
        
        res.status(200).json({ status: 'success' });
    } catch (error) {
        if (error instanceof CircuitOpenError) {
            return next(new AppError('Payment service is temporarily unavailable. Please try again shortly.', 503));
        }
        logPaymentFailure('cancelPaymentIntent', error, req.user?._id);
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

        if (amount < 0.5) {
             return next(new AppError('Order amount must be at least $0.50', 400));
        }

        const Stripe = (await import('stripe')).default;
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

        const paymentIntent = await stripeCircuitBreaker.execute(() =>
            stripe.paymentIntents.create({
                amount: Math.round(amount * 100),
                currency: 'usd',
                payment_method_types: ['card'],
            })
        );

        res.status(200).json({
            status: 'success',
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id
        });
    } catch (error) {
        if (error instanceof CircuitOpenError) {
            return next(new AppError('Payment service is temporarily unavailable. Please try again in a few minutes.', 503));
        }
        logPaymentFailure('createPaymentIntent', error, req.user?._id);
        const userMessage = getStripeUserMessage(error);
        next(new AppError(userMessage, 402));
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
