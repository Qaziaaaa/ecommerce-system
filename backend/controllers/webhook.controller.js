import Order from '../models/Order.js';
import logger from '../utils/logger.js';

// Lazy-initialize Stripe so it reads the env var at request time, not module load time
// NOTE: Do NOT import Stripe at the top level — it crashes on startup if STRIPE_SECRET_KEY is missing
const getStripe = async () => {
    if (!process.env.STRIPE_SECRET_KEY) {
        throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    const { default: Stripe } = await import('stripe');
    return new Stripe(process.env.STRIPE_SECRET_KEY);
};

/**
 * STRIPE WEBHOOK HANDLER
 * (Signature Verification + Idempotency)
 */
export const handleStripeWebhook = async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        // 1. Verify Signature (Requires raw body from req.body)
        const stripe = await getStripe();
        event = stripe.webhooks.constructEvent(
            req.body, 
            sig, 
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        logger.error(`❌ Webhook Signature Verification Failed: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // 2. Handle the Event
    const intent = event.data.object;

    switch (event.type) {
        case 'payment_intent.succeeded':
            await handlePaymentSucceeded(intent);
            break;
        case 'payment_intent.payment_failed':
            await handlePaymentFailed(intent);
            break;
        default:
            logger.info(`ℹ️ Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
};

async function handlePaymentSucceeded(intent) {
    const { id: paymentIntentId, metadata } = intent;
    const orderId = metadata.orderId;

    if (!orderId) {
        logger.error('❌ Payment Succeeded: Missing orderId in metadata');
        return;
    }

    const order = await Order.findById(orderId);
    
    if (!order) {
        logger.error(`❌ Order ${orderId} not found for PaymentIntent ${paymentIntentId}`);
        return;
    }

    if (order.paymentStatus === 'paid') {
        logger.info(`ℹ️ Order ${orderId} already marked as paid. Skipping.`);
        return;
    }

    order.paymentStatus = 'paid';
    order.orderStatus = 'processing';
    order.stripePaymentIntentId = paymentIntentId;
    
    await order.save();
    logger.info(`✅ Order ${orderId} successfully updated to PAID`);
}

async function handlePaymentFailed(intent) {
    const { id: paymentIntentId, metadata } = intent;
    const orderId = metadata.orderId;

    if (!orderId) return;

    await Order.findByIdAndUpdate(orderId, {
        paymentStatus: 'failed',
        stripePaymentIntentId: paymentIntentId
    });
    
    logger.warn(`⚠️ Order ${orderId} marked as FAILED`);
}
