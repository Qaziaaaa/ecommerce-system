import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import Review from '../models/Review.js';
import User from '../models/User.js';
import { checkoutOrderService, calculateOrderAmountService } from '../services/order.service.js';
import { addReview } from '../controllers/review.controller.js';

let mongoServer;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

beforeEach(async () => {
    // Clear collections before each test
    await Product.deleteMany({});
    await Order.deleteMany({});
    await User.deleteMany({});
    await Review.deleteMany({});
    vi.restoreAllMocks();
});

describe('E-Commerce System Optimizations Tests', () => {

    describe('1. Race Condition: Stock Over-selling (checkoutOrderService)', () => {
        it('should prevent overselling when concurrent checkouts happen', async () => {
            // Setup a product with 5 units of stock
            const product = await Product.create({
                name: 'Limited Edition Sneakers',
                slug: 'limited-edition-sneakers',
                description: 'Very rare',
                price: 200,
                category: new mongoose.Types.ObjectId(),
                stock: 5,
                isActive: true
            });

            const userId = new mongoose.Types.ObjectId();

            const checkoutData = {
                orderItems: [{ product: product._id, quantity: 3 }],
                shippingAddress: { street: '123 Test St', city: 'Testville', zipCode: '12345', country: 'US' },
                paymentMethod: 'COD'
            };

            // Simulate two users trying to buy 3 units each at the EXACT SAME TIME
            // Total requested: 6 units. Total available: 5 units.
            // One should succeed, the other MUST fail.
            const results = await Promise.allSettled([
                checkoutOrderService(userId, checkoutData),
                checkoutOrderService(userId, checkoutData) // Same request simultaneously
            ]);

            const successes = results.filter(r => r.status === 'fulfilled');
            const failures = results.filter(r => r.status === 'rejected');

            // Expecting exactly 1 success and 1 failure
            expect(successes.length).toBe(1);
            expect(failures.length).toBe(1);

            // Verify failure reason is insufficient stock
            expect(failures[0].reason.message).toContain('Insufficient stock');

            // Verify final stock is exactly 2 (5 - 3)
            const updatedProduct = await Product.findById(product._id);
            expect(updatedProduct.stock).toBe(2);
        });
    });

    describe('2. N+1 Query Optimization: calculateOrderAmountService', () => {
        it('should fetch all products in a SINGLE batched query', async () => {
            // Create 3 products
            const products = await Product.insertMany([
                { name: 'Product A', slug: 'a', description: 'A', price: 10, category: new mongoose.Types.ObjectId(), stock: 10, isActive: true },
                { name: 'Product B', slug: 'b', description: 'B', price: 20, category: new mongoose.Types.ObjectId(), stock: 10, isActive: true },
                { name: 'Product C', slug: 'c', description: 'C', price: 30, category: new mongoose.Types.ObjectId(), stock: 10, isActive: true }
            ]);

            const clientItems = products.map(p => ({
                product: p._id,
                quantity: 1
            }));

            // Spy on Product.find to track queries
            const findSpy = vi.spyOn(Product, 'find');
            const findByIdSpy = vi.spyOn(Product, 'findById');
            const findOneSpy = vi.spyOn(Product, 'findOne');

            const total = await calculateOrderAmountService(clientItems, null);

            // Total price should be exactly 60
            expect(total).toBe(60);

            // The core N+1 fix: Mongoose should only run ONE batched find using $in.
            expect(findSpy).toHaveBeenCalledTimes(1);
            
            // Should NEVER call findById or findOne in a loop for these products
            expect(findByIdSpy).toHaveBeenCalledTimes(0);
            expect(findOneSpy).toHaveBeenCalledTimes(0);
            
            // Check that it batched exactly the 3 product IDs
            const calledArgs = findSpy.mock.calls[0][0];
            expect(calledArgs._id).toBeDefined();
            expect(calledArgs._id.$in).toBeDefined();
            expect(calledArgs._id.$in.length).toBe(3);
        });
    });

    describe('3. Atomicity & Integration: Review Aggregation', () => {
        it('should use MongoDB aggregation to compute ratingsAverage (Testing addReview controller)', async () => {
            const product = await Product.create({
                name: 'Laptop',
                slug: 'laptop',
                description: 'Fast',
                price: 1000,
                category: new mongoose.Types.ObjectId(),
                stock: 10,
                isActive: true
            });

            const userId = new mongoose.Types.ObjectId();

            // Mock Express request/response
            const req = {
                params: { productId: product._id },
                body: { rating: 4, comment: 'Great!' },
                user: { _id: userId }
            };
            
            const res = {
                status: vi.fn().mockReturnThis(),
                json: vi.fn()
            };
            
            const next = vi.fn();

            // Spy on aggregation
            const aggregateSpy = vi.spyOn(Review, 'aggregate');

            await addReview(req, res, next);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(aggregateSpy).toHaveBeenCalledTimes(1);

            // Check that the aggregation pipeline is structurally correct for atomic computations
            const pipeline = aggregateSpy.mock.calls[0][0];
            expect(pipeline[0].$match.product.toString()).toEqual(product._id.toString());
            expect(pipeline[1].$group).toBeDefined();
            expect(pipeline[1].$group.avgRating.$avg).toBe('$rating');

            const updatedProduct = await Product.findById(product._id);
            expect(updatedProduct.ratingsAverage).toBe(4);
            expect(updatedProduct.ratingsCount).toBe(1);
        });
    });
});
