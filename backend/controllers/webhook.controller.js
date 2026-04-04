import Stripe from 'stripe';
import Order from '../models/Order.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * STRIPE WEBHOOK HANDLER
 * (Signature Verification + Idempotency)
 */
export const handleStripeWebhook = async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        // 1. Verify Signature (Requires raw body from req.body)
        event = stripe.webhooks.constructEvent(
            req.body, 
            sig, 
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        console.error(`❌ Webhook Signature Verification Failed: ${err.message}`);
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
            console.log(`ℹ️ Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
};

/**
 * IDEMPOTENT ORDER SUCCESS HANDLER
 */
async function handlePaymentSucceeded(intent) {
    const { id: paymentIntentId, metadata } = intent;
    const orderId = metadata.orderId;

    if (!orderId) {
        console.error('❌ Payment Succeeded: Missing orderId in metadata');
        return;
    }

    // 1. Find Order and check current status (Idempotency check)
    const order = await Order.findById(orderId);
    
    if (!order) {
        console.error(`❌ Order ${orderId} not found for PaymentIntent ${paymentIntentId}`);
        return;
    }

    if (order.paymentStatus === 'paid') {
        console.log(`ℹ️ Order ${orderId} already marked as paid. Skipping.`);
        return;
    }

    // 2. Update Order
    order.paymentStatus = 'paid';
    order.orderStatus = 'processing';
    order.stripePaymentIntentId = paymentIntentId;
    
    await order.save();
    console.log(`✅ Order ${orderId} successfully updated to PAID`);
}

/**
 * ORDER FAILURE HANDLER
 */
async function handlePaymentFailed(intent) {
    const { id: paymentIntentId, metadata } = intent;
    const orderId = metadata.orderId;

    if (!orderId) return;

    await Order.findByIdAndUpdate(orderId, {
        paymentStatus: 'failed',
        stripePaymentIntentId: paymentIntentId
    });
    
    console.log(`⚠️ Order ${orderId} marked as FAILED`);
}
