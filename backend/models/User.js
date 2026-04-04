import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Please tell us your name']
        },
        email: {
            type: String,
            required: [true, 'Please provide your email'],
            unique: true,
            lowercase: true,
            index: true
        },
        role: {
            type: String,
            enum: ['user', 'admin'],
            default: 'user'
        },
        isVerified: {
            type: Boolean,
            default: false
        },
        addresses: [
            {
                street: String,
                city: String,
                state: String,
                zipCode: String,
                country: String,
                isDefault: {
                    type: Boolean,
                    default: false
                }
            }
        ],
        wishlist: [
            {
                type: mongoose.Schema.ObjectId,
                ref: 'Product'
            }
        ],
        cart: [
            {
                product: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Product'
                },
                quantity: {
                    type: Number,
                    default: 1
                }
            }
        ],
        refreshToken: {
            type: String,
            select: false
        }
    },
    {
        timestamps: true
    }
);

const User = mongoose.model('User', userSchema);
export default User;
