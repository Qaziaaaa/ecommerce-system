import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'A product must have a name'],
            trim: true
        },
        slug: {
            type: String,
            required: true,
            unique: true,
            index: true,     // Improved index for SEO lookups
            lowercase: true
        },
        description: {
            type: String,
            required: [true, 'A product must have a description']
        },
        price: {
            type: Number,
            required: [true, 'A product must have a price'],
            min: [0, 'Price cannot be negative']
        },
        discountPrice: {
            type: Number,
            validate: {
                validator: function (val) {
                    // 'this' only points to current doc on NEW document creation
                    return val < this.price || val < this.get('price');
                },
                message: 'Discount price ({VALUE}) should be below regular price'
            }
        },
        category: {
            type: mongoose.Schema.ObjectId,
            ref: 'Category',
            required: [true, 'Product must belong to a category'],
            index: true     // Index for category filtering
        },
        brand: String,
        images: [String],
        stock: {
            type: Number,
            required: [true, 'Product must have stock quantity'],
            min: [0, 'Stock cannot be negative'],
            default: 0
        },
        ratingsAverage: {
            type: Number,
            default: 4.5,
            min: [1, 'Rating must be above 1.0'],
            max: [5, 'Rating must be below 5.0'],
            set: val => Math.round(val * 10) / 10
        },
        ratingsCount: {
            type: Number,
            default: 0
        },
        isFeatured: {
            type: Boolean,
            default: false
        },
        isActive: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
);

// Text Index for search optimization
productSchema.index({ name: 'text', description: 'text', brand: 'text' });

// Compound indexes for common filter patterns (Requirements: 3.1, 3.3)
productSchema.index({ category: 1, isActive: 1, price: 1 });   // Category browse with price sort
productSchema.index({ isActive: 1, isFeatured: 1 });            // Featured products query
productSchema.index({ isActive: 1, createdAt: -1 });            // Latest products

const Product = mongoose.model('Product', productSchema);
export default Product;
