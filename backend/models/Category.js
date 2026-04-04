import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Category name is required'],
            trim: true
        },
        slug: {
            type: String,
            required: true,
            unique: true,
            index: true,
            lowercase: true
        },
        parentCategory: {
            type: mongoose.Schema.ObjectId,
            ref: 'Category',
            default: null // Support for nested subcategories
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

const Category = mongoose.model('Category', categorySchema);
export default Category;
