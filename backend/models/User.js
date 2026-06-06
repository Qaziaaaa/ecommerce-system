import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

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
        password: {
            type: String,
            select: false,
            minlength: [6, 'Password must be at least 6 characters']
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

// Pre-save hook: hash password when it's set or modified
userSchema.pre('save', async function (next) {
    if (!this.isModified('password') || !this.password) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

// Instance method: compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
    if (!this.password) return false;
    return bcrypt.compare(candidatePassword, this.password);
};

// Indexes for frequent query patterns (Requirements: 3.1)
userSchema.index({ role: 1 });                  // Admin user management
userSchema.index({ isVerified: 1 });            // Verification queries
userSchema.index({ createdAt: -1 });            // Recent users

const User = mongoose.model('User', userSchema);
export default User;
