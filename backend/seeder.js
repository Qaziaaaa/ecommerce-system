import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Category from './models/Category.js';
import Product from './models/Product.js';
import dns from 'dns';

dotenv.config();

dns.setServers(['8.8.8.8', '8.8.4.4']);
dns.setDefaultResultOrder('ipv4first');

const categoriesData = [
    { name: 'Apparel', slug: 'apparel' },
    { name: 'Accessories', slug: 'accessories' },
    { name: 'Footwear', slug: 'footwear' },
    { name: 'Electronics', slug: 'electronics' },
    { name: 'Home Goods', slug: 'home-goods' }
];

const mockProducts = [
    // Apparel (2)
    {
        name: 'Essential Oversized T-Shirt',
        description: 'Crafted from heavyweight 100% organic cotton, this oversized t-shirt offers a relaxed, streetwear-inspired silhouette. Pre-shrunk and garment-dyed for a vintage feel that only gets better with time.',
        price: 45.00,
        brand: 'AURA',
        categoryName: 'Apparel',
        stock: 120,
        isFeatured: true,
        images: [
            '/assets/products/tshirt_1.png',
            '/assets/products/tshirt_2.png',
            '/assets/products/tshirt_3.png'
        ]
    },
    {
        name: 'Technical Cargo Pants',
        description: 'Water-resistant and highly durable. Features articulated knees, magnetic cargo pockets, and adjustable ankle toggles for a customized fit. Perfect for urban exploration.',
        price: 110.00,
        brand: 'AURA Line',
        categoryName: 'Apparel',
        stock: 45,
        isFeatured: false,
        images: [
            '/assets/products/pants_1.png',
            '/assets/products/pants_2.png',
            '/assets/products/pants_3.png'
        ]
    },

    // Accessories (2)
    {
        name: 'Matte Black Chronograph Watch',
        description: 'A stealthy, all-black timepiece featuring a surgical-grade stainless steel case, sapphire crystal glass, and a reliable Japanese quartz movement. Waterproof up to 50 meters.',
        price: 220.00,
        brand: 'Chronos',
        categoryName: 'Accessories',
        stock: 15,
        isFeatured: true,
        images: [
            '/assets/products/watch_1.png',
            '/assets/products/watch_2.png',
            '/assets/products/watch_3.png'
        ]
    },
    {
        name: 'Polarized Aviator Sunglasses',
        description: 'Classic teardrop silhouette modernized with incredibly lightweight titanium frames and high-contrast polarized lenses offering 100% UV protection.',
        price: 145.00,
        brand: 'Optic',
        categoryName: 'Accessories',
        stock: 50,
        isFeatured: false,
        images: [
            '/assets/products/placeholder_1.png',
            '/assets/products/placeholder_2.png',
            '/assets/products/placeholder_3.png'
        ]
    },

    // Footwear (2)
    {
        name: 'Premium Leather Low-Tops',
        description: 'The ultimate everyday sneaker. Handcrafted in Portugal using premium Italian calf leather and featuring a durable, stitched Margom rubber sole for longevity.',
        price: 195.00,
        brand: 'AURA Footwear',
        categoryName: 'Footwear',
        stock: 40,
        isFeatured: true,
        images: [
            '/assets/products/placeholder_1.png',
            '/assets/products/placeholder_2.png',
            '/assets/products/placeholder_3.png'
        ]
    },
    {
        name: 'Suede Chelsea Boots',
        description: 'A timeless silhouette constructed from soft, water-repellent suede. Features memory foam insoles and elastic goring for easy on-and-off wear.',
        price: 240.00,
        brand: 'AURA Footwear',
        categoryName: 'Footwear',
        stock: 25,
        isFeatured: true,
        images: [
            '/assets/products/placeholder_1.png',
            '/assets/products/placeholder_2.png',
            '/assets/products/placeholder_3.png'
        ]
    },

    // Electronics (2)
    {
        name: 'Active Noise-Cancelling Headphones',
        description: 'Immersive, high-fidelity audio engineered with advanced hybrid ANC technology. Offers 40 hours of battery life and plush memory foam ear cups for all-day comfort.',
        price: 349.00,
        brand: 'Sonic',
        categoryName: 'Electronics',
        stock: 60,
        isFeatured: true,
        images: [
            '/assets/products/headphones_1.png',
            '/assets/products/headphones_2.png',
            '/assets/products/headphones_3.png'
        ]
    },
    {
        name: 'Mechanical Key Design Keyboard',
        description: 'A beautifully machined aluminum mechanical keyboard featuring tactile, pre-lubed switches and customizable RGB backlighting. Built for serious typists.',
        price: 180.00,
        brand: 'Keychron',
        categoryName: 'Electronics',
        stock: 9,
        isFeatured: false,
        images: [
            '/assets/products/placeholder_1.png',
            '/assets/products/placeholder_2.png',
            '/assets/products/placeholder_3.png'
        ]
    },

    // Home Goods (2)
    {
        name: 'Ceramic Pour-Over Coffee Set',
        description: 'Elevate your morning ritual. A minimalist, matte-finish ceramic dripper and carafe set designed for optimal heat retention and precise brewing extraction.',
        price: 65.00,
        brand: 'AURA Home',
        categoryName: 'Home Goods',
        stock: 35,
        isFeatured: true,
        images: [
            '/assets/products/coffeeset_1.png',
            '/assets/products/coffeeset_2.png',
            '/assets/products/coffeeset_3.png'
        ]
    },
    {
        name: 'Textured Linen Throw Blanket',
        description: 'Woven from 100% Belgian flax linen, this heavy throw blanket provides breathable warmth and adds a touch of organic texture to any living space.',
        price: 110.00,
        brand: 'AURA Home',
        categoryName: 'Home Goods',
        stock: 4,
        isFeatured: true,
        images: [
            '/assets/products/placeholder_1.png',
            '/assets/products/placeholder_2.png',
            '/assets/products/placeholder_3.png'
        ]
    }
];

// Generate standard slug
const slugify = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

const seedDatabase = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, { family: 4 });
        console.log('📦 Connected to MongoDB, initiating database wipe & seed...');

        // 1. Wipe existing test data to start fresh
        await Category.deleteMany();
        await Product.deleteMany();
        console.log('🧹 Wiped existing Categories and Products.');

        // 2. Insert Categories
        const createdCategories = await Category.insertMany(categoriesData);
        console.log(`✅ Seeded ${createdCategories.length} Categories.`);

        // 3. Map Categories to look up ObjectId by name easily
        const categoryMap = {};
        createdCategories.forEach(cat => {
            categoryMap[cat.name] = cat._id;
        });

        // 4. Format products with their exact category ObjectId
        const productsToSeed = mockProducts.map(p => {
            const { categoryName, ...productData } = p;
            return {
                ...productData,
                slug: slugify(p.name),
                category: categoryMap[categoryName]
            };
        });

        // 5. Insert Products
        const createdProducts = await Product.insertMany(productsToSeed);
        console.log(`✅ Seeded ${createdProducts.length} Premium Products.`);

        console.log('🎉 Database seeding completed perfectly.');
        process.exit();
    } catch (error) {
        console.error('❌ Error seeding database:', error);
        process.exit(1);
    }
};

seedDatabase();
