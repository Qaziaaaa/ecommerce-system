import mongoose from 'mongoose';
import Category from './models/Category.js';
import dotenv from 'dotenv';
dotenv.config();

const seedCategories = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const categories = [
            { name: 'Beauty & Personal Care', slug: 'beauty-personal-care' },
            { name: 'Electronics & Gadgets', slug: 'electronics-gadgets' },
            { name: 'Fashion & Apparel', slug: 'fashion-apparel' },
            { name: 'Home & Kitchen', slug: 'home-kitchen' },
            { name: 'Health & Fitness', slug: 'health-fitness' }
        ];

        for (const cat of categories) {
            const exists = await Category.findOne({ name: cat.name });
            if (!exists) {
                await Category.create(cat);
                console.log(`Created category: ${cat.name}`);
            } else {
                console.log(`Category already exists: ${cat.name}`);
            }
        }

        console.log('Seeding complete');
        process.exit();
    } catch (error) {
        console.error('Error seeding categories:', error);
        process.exit(1);
    }
};

seedCategories();
