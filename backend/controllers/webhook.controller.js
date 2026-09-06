import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import logger from '../utils/logger.js';

const getStripe = async () => {
    if (!process.env.STRIPE_SECRET_KEY) {
        throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    const { default: Stripe } = await import('stripe');
    return new Stripe(process.env.STRIPE_SECRET_KEY);
};

async function withTransaction(fn) {
  let session;
  try {
    if (mongoose.connection.readyState !== 1) { return fn(null); }
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

export const handleStripeWebhook = async (req, res) => {
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
        logger.warn('STRIPE_WEBHOOK_SECRET is not configured — webhook processing disabled');
        return res.status(503).json({ error: 'Webhook processing not configured' });
    }

    const sig = req.headers['stripe-signature'];
    let event;

    try {
        const stripe = await getStripe();
        event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        logger.error(`Webhook Signature Verification Failed: ${err.message}`);
        return res.status(400).send('Webhook Error: Invalid signature');
    }

    const intent = event.data.object;

    switch (event.type) {
        case 'payment_intent.succeeded':
            await handlePaymentSucceeded(intent, event.id);
            break;
        case 'payment_intent.payment_failed':
            await handlePaymentFailed(intent, event.id);
            break;
        default:
            logger.info(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
};

async function handlePaymentSucceeded(intent, eventId) {
    const { id: paymentIntentId, metadata } = intent;
    const orderId = metadata.orderId;

    if (!orderId) {
        logger.error(`Payment Succeeded: Missing orderId in metadata for PI ${paymentIntentId}`);
        return;
    }

    const order = await Order.findById(orderId);

    if (!order) {
        logger.error(`Order ${orderId} not found for PaymentIntent ${paymentIntentId}`);
        return;
    }

    if (order.processedEventIds && order.processedEventIds.includes(eventId)) {
        logger.info(`Duplicate webhook event ${eventId} for order ${orderId} — skipping`);
        return;
    }

    if (order.orderStatus === 'cancelled') {
        logger.info(`Order ${orderId} is cancelled — skipping payment_succeeded for PI ${paymentIntentId}`);
        return;
    }

    if (order.paymentStatus === 'paid') {
        logger.info(`Order ${orderId} already paid — skipping`);
        return;
    }

    order.stripePaymentIntentId = paymentIntentId;

    try {
        await withTransaction(async (session) => {
            const opts = session ? { session } : {};

            if (order.orderStatus === 'pending' && order.paymentStatus === 'pending') {
                const bulkOps = order.orderItems.map(item => ({
                    updateOne: {
                        filter: { _id: item.product, stock: { $gte: item.quantity } },
                        update: { $inc: { stock: -item.quantity } }
                    }
                }));
                const bulkResult = await Product.bulkWrite(bulkOps, opts);
                if (bulkResult.modifiedCount !== order.orderItems.length) {
                    throw new Error('Some items are out of stock');
                }
            }

            if (!order.processedEventIds) order.processedEventIds = [];
            order.processedEventIds.push(eventId);
            order.paymentStatus = 'paid';
            order.orderStatus = 'processing';
            await order.save(opts);
        });
        logger.info(`Order ${orderId} confirmed via webhook: paid, stock deducted`);
    } catch (error) {
        logger.error(`Webhook processing failed for order ${orderId}: ${error.message}`);
        order.paymentStatus = 'failed';
        order.orderStatus = 'pending';
        if (!order.processedEventIds) order.processedEventIds = [];
        order.processedEventIds.push(eventId);
        await order.save();
    }
}

async function handlePaymentFailed(intent, eventId) {
    const { id: paymentIntentId, metadata } = intent;
    const orderId = metadata.orderId;

    if (!orderId) return;

    const order = await Order.findById(orderId);
    if (!order) return;

    if (order.processedEventIds && order.processedEventIds.includes(eventId)) {
        logger.info(`Duplicate webhook event ${eventId} for failed payment on order ${orderId} — skipping`);
        return;
    }

    if (order.paymentStatus === 'failed') {
        logger.info(`Order ${orderId} already marked as failed — skipping`);
        return;
    }

    if (!order.processedEventIds) order.processedEventIds = [];
    order.processedEventIds.push(eventId);
    order.paymentStatus = 'failed';
    order.stripePaymentIntentId = paymentIntentId;
    await order.save();
    logger.warn(`Order ${orderId} marked as FAILED`);
}
