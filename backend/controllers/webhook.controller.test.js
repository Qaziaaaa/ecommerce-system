import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../models/Order.js', () => ({ default: { findById: vi.fn(), findByIdAndUpdate: vi.fn() } }));

vi.mock('stripe', () => ({ default: vi.fn() }));

const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
vi.mock('../utils/logger.js', () => ({ default: mockLogger }));

let Order, controller, mockStripe;

beforeEach(async () => {
  vi.clearAllMocks();
  process.env.STRIPE_SECRET_KEY = 'sk_test';
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';

  mockStripe = {
    webhooks: { constructEvent: vi.fn() },
    paymentIntents: { retrieve: vi.fn() },
  };
  const Stripe = (await import('stripe')).default;
  Stripe.mockImplementation(function () { return mockStripe; });

  Order = (await import('../models/Order.js')).default;
  controller = await import('./webhook.controller.js');
});

describe('handleStripeWebhook', () => {
  it('handles payment_intent.succeeded', async () => {
    const req = {
      headers: { 'stripe-signature': 'sig' },
      body: Buffer.from('{}'),
    };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn(), send: vi.fn() };

    mockStripe.webhooks.constructEvent.mockReturnValue({
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_1', metadata: { orderId: 'o1' } } },
    });
    Order.findById.mockResolvedValue({
      _id: 'o1',
      paymentStatus: 'pending',
      save: vi.fn().mockResolvedValue(true),
    });

    await controller.handleStripeWebhook(req, res);
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });

  it('returns 400 on signature verification failure', async () => {
    const req = { headers: { 'stripe-signature': 'bad' }, body: Buffer.from('{}') };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn(), send: vi.fn() };
    mockStripe.webhooks.constructEvent.mockImplementation(() => { throw new Error('Invalid signature'); });

    await controller.handleStripeWebhook(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('handles payment_intent.payment_failed', async () => {
    const req = {
      headers: { 'stripe-signature': 'sig' },
      body: Buffer.from('{}'),
    };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn(), send: vi.fn() };

    mockStripe.webhooks.constructEvent.mockReturnValue({
      type: 'payment_intent.payment_failed',
      data: { object: { id: 'pi_fail', metadata: { orderId: 'o1' } } },
    });

    await controller.handleStripeWebhook(req, res);
    expect(Order.findByIdAndUpdate).toHaveBeenCalledWith('o1', { paymentStatus: 'failed', stripePaymentIntentId: 'pi_fail' });
  });
});
