import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../models/Order.js', () => ({ default: { findById: vi.fn() } }));
vi.mock('../models/Product.js', () => ({ default: { bulkWrite: vi.fn() } }));
vi.mock('stripe', () => ({ default: vi.fn() }));

const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
vi.mock('../utils/logger.js', () => ({ default: mockLogger }));

let Order, Product, controller, mockStripe;

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
  Product = (await import('../models/Product.js')).default;
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
      id: 'evt_1',
      data: { object: { id: 'pi_1', metadata: { orderId: 'o1' } } },
    });
    const saveFn = vi.fn().mockResolvedValue(true);
    Order.findById.mockResolvedValue({
      _id: 'o1',
      paymentStatus: 'pending',
      orderStatus: 'pending',
      orderItems: [],
      processedEventIds: [],
      stripePaymentIntentId: null,
      save: saveFn,
    });

    await controller.handleStripeWebhook(req, res);
    expect(res.json).toHaveBeenCalledWith({ received: true });
    expect(saveFn).toHaveBeenCalled();
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
      id: 'evt_2',
      data: { object: { id: 'pi_fail', metadata: { orderId: 'o1' } } },
    });
    const saveFn = vi.fn().mockResolvedValue(true);
    Order.findById.mockResolvedValue({
      _id: 'o1',
      paymentStatus: 'pending',
      processedEventIds: [],
      save: saveFn,
    });

    await controller.handleStripeWebhook(req, res);
    expect(res.json).toHaveBeenCalledWith({ received: true });
    expect(saveFn).toHaveBeenCalled();
  });
});
