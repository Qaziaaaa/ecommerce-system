import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            required: [true, 'Order must belong to a user']
        },
        orderItems: [
            {
                product: {
                    type: mongoose.Schema.ObjectId,
                    ref: 'Product',
                    required: [true, 'Order item must have a product']
                },
                quantity: {
                    type: Number,
                    required: [true, 'Order item must have a quantity'],
                    min: [1, 'Quantity cannot be less than 1']
                },
                price: {
                    type: Number,
                    required: [true, 'Order item must have a price']
                }
            }
        ],
        totalAmount: {
            type: Number,
            required: [true, 'Order must have a total amount']
        },
        shippingAddress: {
            street: String,
            city: String,
            state: String,
            zipCode: String,
            country: String
        },
        paymentMethod: {
            type: String,
            required: [true, 'Order must have a payment method']
        },
        paymentStatus: {
            type: String,
            enum: ['pending', 'paid', 'failed'],
            default: 'pending'
        },
        orderStatus: {
            type: String,
            enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
            default: 'pending'
        },
        stripePaymentIntentId: {
            type: String,
            unique: true,
            sparse: true // Allows multiple 'null' or missing values if needed
        }
    },
    {
        timestamps: true
    }
);

// Indexes for frequent query patterns (Requirements: 3.1, 3.3)
orderSchema.index({ user: 1, createdAt: -1 });          // User order history
orderSchema.index({ orderStatus: 1, createdAt: -1 });   // Admin order management
orderSchema.index({ paymentStatus: 1 });                 // Payment reconciliation

const Order = mongoose.model('Order', orderSchema);
export default Order;
