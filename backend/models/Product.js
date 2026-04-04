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
                    return val < this.price;
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

// Create Text Index for Advanced Search
productSchema.index({ name: 'text', description: 'text' });

// Text Index for search optimization
productSchema.index({ name: 'text', description: 'text', brand: 'text' });

const Product = mongoose.model('Product', productSchema);
export default Product;
