import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Category from './models/Category.js';
import Product from './models/Product.js';
import dns from 'dns';

dotenv.config();

dns.setServers(['8.8.8.8', '8.8.4.4']);
dns.setDefaultResultOrder('ipv4first');

const categoriesData = [
    { name: 'Beauty & Personal Care', slug: 'beauty-personal-care' },
    { name: 'Electronics & Gadgets', slug: 'electronics-gadgets' },
    { name: 'Fashion & Apparel', slug: 'fashion-apparel' },
    { name: 'Home & Kitchen', slug: 'home-kitchen' },
    { name: 'Health & Fitness', slug: 'health-fitness' }
];

const BASE_URL = 'https://kolzsticks.github.io/Free-Ecommerce-Products-Api/main/images/products';

const mockProducts = [
    // ── Beauty & Personal Care (10) ─────────────────────────────────────────
    { name: 'Hydrating Facial Moisturizer', price: 20.00, categoryName: 'Beauty & Personal Care', stock: 120, isFeatured: true, images: [`${BASE_URL}/moisturizer.jpg`], description: 'This Hydrating Facial Moisturizer is expertly formulated to deeply nourish and hydrate your skin, providing lasting moisture and a smooth, radiant complexion. Ideal for daily use.', ratingsAverage: 4.7, ratingsCount: 120 },
    { name: 'Anti-Dandruff Shampoo', price: 15.00, categoryName: 'Beauty & Personal Care', stock: 200, isFeatured: true, images: [`${BASE_URL}/shampoo.jpg`], description: 'Our Anti-Dandruff Shampoo effectively combats flakes and itchiness, promoting a healthy scalp. Infused with soothing ingredients, it cleanses your hair without stripping natural oils.', ratingsAverage: 4.5, ratingsCount: 85 },
    { name: 'Matte Liquid Foundation', price: 22.00, categoryName: 'Beauty & Personal Care', stock: 90, isFeatured: true, images: [`${BASE_URL}/foundation.jpg`], description: 'This Matte Liquid Foundation offers a flawless finish with long-lasting wear. Lightweight and breathable, it blends seamlessly into the skin, providing even coverage and a natural look.', ratingsAverage: 4.6, ratingsCount: 98 },
    { name: 'Eau de Parfum - Floral Scent', price: 35.00, categoryName: 'Beauty & Personal Care', stock: 75, isFeatured: true, images: [`${BASE_URL}/perfume.jpg`], description: 'Experience the essence of blooming florals with our Eau de Parfum. This captivating scent envelops you in elegance, making it perfect for any occasion, leaving a lasting impression.', ratingsAverage: 4.8, ratingsCount: 160 },
    { name: "Men's Shaving Kit", price: 18.00, categoryName: 'Beauty & Personal Care', stock: 65, isFeatured: false, images: [`${BASE_URL}/shaving-kit.jpg`], description: "This Men's Shaving Kit includes everything needed for a close, comfortable shave. Featuring a premium razor and soothing gel, it ensures a smooth experience with every use.", ratingsAverage: 4.4, ratingsCount: 70 },
    { name: 'Nourishing Body Wash', price: 13.00, categoryName: 'Beauty & Personal Care', stock: 180, isFeatured: false, images: [`${BASE_URL}/body-wash.jpg`], description: 'Our Nourishing Body Wash gently cleanses while replenishing moisture, leaving your skin feeling soft and revitalized. Infused with natural ingredients for a refreshing bathing experience.', ratingsAverage: 4.7, ratingsCount: 140 },
    { name: 'Glossy Nail Polish', price: 8.00, categoryName: 'Beauty & Personal Care', stock: 150, isFeatured: false, images: [`${BASE_URL}/nail-polish.jpg`], description: 'Achieve stunning nails with our Glossy Nail Polish. This vibrant formula provides high shine and long-lasting wear, perfect for expressing your personal style with every application.', ratingsAverage: 4.5, ratingsCount: 65 },
    { name: 'Moisturizing Conditioner', price: 17.00, categoryName: 'Beauty & Personal Care', stock: 110, isFeatured: false, images: [`${BASE_URL}/conditioner.jpg`], description: 'Our Moisturizing Conditioner deeply hydrates and detangles hair, leaving it soft, shiny, and manageable. Perfect for all hair types, it helps restore natural moisture balance.', ratingsAverage: 4.6, ratingsCount: 110 },
    { name: 'Triple Blade Razor', price: 10.00, categoryName: 'Beauty & Personal Care', stock: 85, isFeatured: false, images: [`${BASE_URL}/razor.jpg`], description: "The Triple Blade Razor delivers an exceptionally close shave with minimal irritation. Its ergonomic design provides comfort and control, making it a must-have for every grooming routine.", ratingsAverage: 4.3, ratingsCount: 55 },
    { name: 'Vitamin C Supplement', price: 30.00, categoryName: 'Beauty & Personal Care', stock: 300, isFeatured: false, images: [`${BASE_URL}/vitamin-supplement.jpg`], description: 'Boost your health with our Vitamin C Supplement. Designed to support immune function and overall wellness, these easy-to-take tablets provide essential nutrients for your daily needs.', ratingsAverage: 4.7, ratingsCount: 200 },

    // ── Electronics & Gadgets (10) ─────────────────────────────────────────
    { name: 'Wireless Bluetooth Headphones', price: 79.99, categoryName: 'Electronics & Gadgets', stock: 230, isFeatured: true, images: [`${BASE_URL}/wireless-headphones.jpg`], description: 'Experience superior sound quality with these wireless Bluetooth headphones, designed for comfort and portability for everyday use.', ratingsAverage: 4.7, ratingsCount: 230 },
    { name: 'Smartphone - 128GB', price: 450.00, categoryName: 'Electronics & Gadgets', stock: 320, isFeatured: true, images: [`${BASE_URL}/smartphone.jpg`], description: 'Stay connected with this high-performance smartphone featuring 128GB storage, perfect for apps, photos, and multimedia.', ratingsAverage: 4.6, ratingsCount: 320 },
    { name: '55-Inch 4K Ultra HD TV', price: 900.00, categoryName: 'Electronics & Gadgets', stock: 50, isFeatured: true, images: [`${BASE_URL}/4k-tv.jpg`], description: 'Enjoy breathtaking visuals with this 55-inch 4K Ultra HD TV, delivering stunning detail and vibrant colors for your favorite shows.', ratingsAverage: 4.8, ratingsCount: 190 },
    { name: 'Gaming Laptop - 16GB RAM, 512GB SSD', price: 1200.00, categoryName: 'Electronics & Gadgets', stock: 40, isFeatured: true, images: [`${BASE_URL}/laptop.jpg`], description: 'Unleash your gaming potential with this powerful gaming laptop featuring 16GB RAM and 512GB SSD for speed and performance.', ratingsAverage: 4.9, ratingsCount: 210 },
    { name: 'Smartwatch - Fitness Tracker', price: 150.00, categoryName: 'Electronics & Gadgets', stock: 130, isFeatured: false, images: [`${BASE_URL}/smartwatch.jpg`], description: 'Monitor your health and stay connected with this feature-rich smartwatch, perfect for tracking fitness and receiving notifications.', ratingsAverage: 4.5, ratingsCount: 130 },
    { name: '10.1-Inch Android Tablet', price: 200.00, categoryName: 'Electronics & Gadgets', stock: 95, isFeatured: false, images: [`${BASE_URL}/tablet.jpg`], description: 'Enjoy your favorite apps and media on this sleek 10.1-inch Android tablet, offering portability and a vibrant display for on-the-go.', ratingsAverage: 4.3, ratingsCount: 95 },
    { name: 'Portable Bluetooth Speaker', price: 50.00, categoryName: 'Electronics & Gadgets', stock: 180, isFeatured: false, images: [`${BASE_URL}/bluetooth-speaker.jpg`], description: 'Take your music anywhere with this portable Bluetooth speaker, delivering powerful sound in a compact design, perfect for outdoor use.', ratingsAverage: 4.7, ratingsCount: 180 },
    { name: 'DSLR Camera - 24MP', price: 850.00, categoryName: 'Electronics & Gadgets', stock: 30, isFeatured: false, images: [`${BASE_URL}/dslr-camera.jpg`], description: 'Capture stunning photos and videos with this 24MP DSLR camera, offering professional-quality imaging and advanced features for creatives.', ratingsAverage: 4.8, ratingsCount: 115 },
    { name: 'USB Drive - 64GB', price: 12.00, categoryName: 'Electronics & Gadgets', stock: 500, isFeatured: false, images: [`${BASE_URL}/usb-drive.jpg`], description: 'Store and transfer your files easily with this 64GB USB drive, offering ample space and portability for your data needs.', ratingsAverage: 4.2, ratingsCount: 75 },
    { name: '4K Action Camera', price: 180.00, categoryName: 'Electronics & Gadgets', stock: 55, isFeatured: false, images: [`${BASE_URL}/action-camera.jpg`], description: 'Record your adventures in stunning detail with this 4K action camera, built to withstand tough conditions and capture high-quality footage.', ratingsAverage: 4.6, ratingsCount: 90 },

    // ── Fashion & Apparel (10) ─────────────────────────────────────────────
    { name: "Men's Denim Jacket", price: 35.00, categoryName: 'Fashion & Apparel', stock: 150, isFeatured: true, images: [`${BASE_URL}/denim-jacket.jpg`], description: "This stylish Men's Denim Jacket is perfect for any casual occasion. Crafted from high-quality denim, it features a classic fit, button closure, and timeless design that complements various outfits.", ratingsAverage: 4.5, ratingsCount: 150 },
    { name: "Women's Floral Maxi Dress", price: 42.00, categoryName: 'Fashion & Apparel', stock: 95, isFeatured: true, images: [`${BASE_URL}/maxi-dress.jpg`], description: "Embrace elegance with this Women's Floral Maxi Dress, designed with a flattering silhouette and vibrant floral patterns. Perfect for sunny days and special occasions, it's a must-have addition to your wardrobe.", ratingsAverage: 4.8, ratingsCount: 95 },
    { name: 'Unisex Casual Sneakers', price: 55.00, categoryName: 'Fashion & Apparel', stock: 210, isFeatured: true, images: [`${BASE_URL}/sneakers.jpg`], description: "These Unisex Casual Sneakers blend comfort and style effortlessly. With a lightweight design and cushioned sole, they're perfect for everyday wear, making them a versatile choice for any outfit.", ratingsAverage: 4.7, ratingsCount: 210 },
    { name: 'Leather Tote Bag', price: 60.00, categoryName: 'Fashion & Apparel', stock: 130, isFeatured: true, images: [`${BASE_URL}/leather-bag.jpg`], description: 'Elevate your style with this chic Leather Tote Bag, featuring a spacious interior and elegant design. Crafted from premium leather, it is perfect for carrying your essentials while looking effortlessly stylish.', ratingsAverage: 4.6, ratingsCount: 130 },
    { name: 'Polarized Sunglasses', price: 25.00, categoryName: 'Fashion & Apparel', stock: 90, isFeatured: false, images: [`${BASE_URL}/sunglasses.jpg`], description: 'Protect your eyes in style with these Polarized Sunglasses. Designed to reduce glare and enhance visual clarity, they offer both comfort and sophistication for all your outdoor adventures.', ratingsAverage: 4.4, ratingsCount: 90 },
    { name: "Men's Formal Shirt", price: 31.00, categoryName: 'Fashion & Apparel', stock: 85, isFeatured: false, images: [`${BASE_URL}/formal-shirt.jpg`], description: "This Men's Formal Shirt combines elegance with comfort. Tailored to perfection, it features a classic collar and a crisp finish, making it the ideal choice for business meetings or formal occasions.", ratingsAverage: 4.3, ratingsCount: 85 },
    { name: "Women's High Heels", price: 45.00, categoryName: 'Fashion & Apparel', stock: 105, isFeatured: false, images: [`${BASE_URL}/heels.jpg`], description: "Step into sophistication with these Women's High Heels, featuring a sleek design and comfortable fit. Perfect for parties, weddings, or a night out, they will elevate any outfit with a touch of glamour.", ratingsAverage: 4.6, ratingsCount: 105 },
    { name: 'Graphic Print T-Shirt', price: 18.00, categoryName: 'Fashion & Apparel', stock: 200, isFeatured: false, images: [`${BASE_URL}/t-shirt.jpg`], description: 'Express yourself with this Graphic Print T-Shirt, featuring vibrant colors and unique designs. Made from soft cotton, it offers a relaxed fit, making it perfect for casual outings or lounging at home.', ratingsAverage: 4.5, ratingsCount: 200 },
    { name: "Women's Designer Handbag", price: 75.00, categoryName: 'Fashion & Apparel', stock: 60, isFeatured: false, images: [`${BASE_URL}/handbag.jpg`], description: "Make a statement with this Women's Designer Handbag, crafted from luxurious materials and featuring exquisite detailing. It's spacious enough for daily essentials while adding elegance to your ensemble.", ratingsAverage: 4.9, ratingsCount: 150 },
    { name: 'Comfortable Flip-Flops', price: 12.00, categoryName: 'Fashion & Apparel', stock: 300, isFeatured: false, images: [`${BASE_URL}/slippers.jpg`], description: 'Enjoy ultimate comfort with these Comfortable Flip-Flops. Designed for casual wear, they feature soft straps and cushioned soles, making them perfect for the beach, pool, or everyday relaxation.', ratingsAverage: 4.2, ratingsCount: 70 },

    // ── Home & Kitchen (10) ────────────────────────────────────────────────
    { name: 'Modern Leather Sofa', price: 1200.00, categoryName: 'Home & Kitchen', stock: 15, isFeatured: true, images: [`${BASE_URL}/sofa.jpg`], description: 'A stylish modern leather sofa that enhances the elegance of your living room while providing utmost comfort for relaxation and entertaining guests.', ratingsAverage: 4.8, ratingsCount: 220 },
    { name: 'Stainless Steel Refrigerator', price: 950.00, categoryName: 'Home & Kitchen', stock: 20, isFeatured: true, images: [`${BASE_URL}/refrigerator.jpg`], description: 'This sleek stainless steel refrigerator features ample storage space, energy efficiency, and modern technology, making it perfect for keeping your food fresh.', ratingsAverage: 4.6, ratingsCount: 150 },
    { name: 'Cordless Vacuum Cleaner', price: 180.00, categoryName: 'Home & Kitchen', stock: 75, isFeatured: true, images: [`${BASE_URL}/vacuum-cleaner.jpg`], description: 'Enjoy effortless cleaning with this cordless vacuum cleaner, designed for convenience and efficiency, easily reaching corners and tight spaces without any cords.', ratingsAverage: 4.4, ratingsCount: 180 },
    { name: 'Non-Stick Cookware Set', price: 250.00, categoryName: 'Home & Kitchen', stock: 40, isFeatured: false, images: [`${BASE_URL}/cookware.jpg`], description: 'This non-stick cookware set is perfect for easy cooking and cleaning, ensuring your meals come out delicious without sticking, making meal prep a breeze.', ratingsAverage: 4.7, ratingsCount: 95 },
    { name: 'Porcelain Dinnerware Set', price: 160.00, categoryName: 'Home & Kitchen', stock: 35, isFeatured: false, images: [`${BASE_URL}/dinnerware.jpg`], description: 'Elevate your dining experience with this exquisite porcelain dinnerware set, perfect for both everyday meals and special occasions, combining elegance and functionality.', ratingsAverage: 4.9, ratingsCount: 70 },
    { name: 'Memory Foam Mattress', price: 750.00, categoryName: 'Home & Kitchen', stock: 25, isFeatured: false, images: [`${BASE_URL}/mattress.jpg`], description: "Experience superior comfort with our memory foam mattress, designed to contour to your body and provide excellent support for a restful night's sleep.", ratingsAverage: 4.8, ratingsCount: 140 },
    { name: 'Contemporary Table Lamp', price: 50.00, categoryName: 'Home & Kitchen', stock: 85, isFeatured: false, images: [`${BASE_URL}/table-lamp.jpg`], description: 'Brighten your space with this contemporary table lamp, combining modern design and functionality, perfect for reading or creating a cozy atmosphere in any room.', ratingsAverage: 4.5, ratingsCount: 85 },
    { name: 'Hand-Woven Area Rug', price: 200.00, categoryName: 'Home & Kitchen', stock: 30, isFeatured: false, images: [`${BASE_URL}/rug.jpg`], description: 'This hand-woven area rug adds warmth and style to your home decor, featuring intricate designs that enhance any living space while providing comfort underfoot.', ratingsAverage: 4.6, ratingsCount: 110 },
    { name: 'Plastic Storage Boxes - Set of 4', price: 80.00, categoryName: 'Home & Kitchen', stock: 120, isFeatured: false, images: [`${BASE_URL}/storage-boxes.jpg`], description: 'Keep your home organized with this set of 4 plastic storage boxes, perfect for decluttering any space and storing items securely while maintaining easy accessibility.', ratingsAverage: 4.3, ratingsCount: 55 },
    { name: 'Eco-Friendly Cleaning Supplies Kit', price: 100.00, categoryName: 'Home & Kitchen', stock: 60, isFeatured: false, images: [`${BASE_URL}/cleaning-supplies.jpg`], description: 'This eco-friendly cleaning supplies kit features sustainable products that effectively clean your home while being safe for the environment and your family.', ratingsAverage: 4.8, ratingsCount: 120 },

    // ── Health & Fitness (10) ──────────────────────────────────────────────
    { name: 'Foldable Electric Treadmill', price: 3500.00, categoryName: 'Health & Fitness', stock: 10, isFeatured: true, images: [`${BASE_URL}/treadmill.jpg`], description: 'This Foldable Electric Treadmill offers a convenient way to maintain fitness at home. With various speed settings and a compact design, it is perfect for beginners and seasoned athletes.', ratingsAverage: 4.7, ratingsCount: 320 },
    { name: 'Adjustable Dumbbell Set - 20kg', price: 600.00, categoryName: 'Health & Fitness', stock: 40, isFeatured: true, images: [`${BASE_URL}/dumbbells.jpg`], description: 'The Adjustable Dumbbell Set allows for a customizable weight training experience. With a total weight of 20kg, it is perfect for strength training and versatile enough for various workouts.', ratingsAverage: 4.5, ratingsCount: 260 },
    { name: 'Whey Protein Powder - 2kg', price: 350.00, categoryName: 'Health & Fitness', stock: 100, isFeatured: true, images: [`${BASE_URL}/protein-powder.jpg`], description: 'This Whey Protein Powder provides an excellent source of protein for muscle recovery and growth. The 2kg package is ideal for athletes and fitness enthusiasts aiming for optimal nutrition.', ratingsAverage: 4.6, ratingsCount: 180 },
    { name: 'Digital Blood Pressure Monitor', price: 220.00, categoryName: 'Health & Fitness', stock: 45, isFeatured: true, images: [`${BASE_URL}/blood-pressure-monitor.jpg`], description: 'Stay on top of your health with this Digital Blood Pressure Monitor. Easy to use and highly accurate, it helps you track your blood pressure at home with clear digital readings.', ratingsAverage: 4.8, ratingsCount: 210 },
    { name: 'Compact First Aid Kit', price: 120.00, categoryName: 'Health & Fitness', stock: 75, isFeatured: false, images: [`${BASE_URL}/first-aid-kit.jpg`], description: 'This Compact First Aid Kit is essential for home, travel, or emergency situations. Packed with necessary supplies, it ensures you are prepared for minor injuries and emergencies.', ratingsAverage: 4.9, ratingsCount: 150 },
    { name: 'Alcohol-Based Hand Sanitizer - 500ml', price: 8.00, categoryName: 'Health & Fitness', stock: 500, isFeatured: false, images: [`${BASE_URL}/hand-sanitizer.jpg`], description: 'Keep your hands clean and germ-free with this Alcohol-Based Hand Sanitizer. The 500ml bottle is perfect for personal use at home or on the go, providing effective sanitization.', ratingsAverage: 4.5, ratingsCount: 90 },
    { name: 'Workout Gloves - Pair', price: 30.00, categoryName: 'Health & Fitness', stock: 100, isFeatured: false, images: [`${BASE_URL}/gloves.jpg`], description: 'Enhance your workout experience with these comfortable Workout Gloves. Designed to provide grip and protection, they are perfect for lifting weights or performing rigorous exercises.', ratingsAverage: 4.4, ratingsCount: 100 },
    { name: 'Infrared Digital Thermometer', price: 150.00, categoryName: 'Health & Fitness', stock: 60, isFeatured: false, images: [`${BASE_URL}/thermometer.jpg`], description: 'This Infrared Digital Thermometer allows for quick and accurate temperature readings. Perfect for home health monitoring, it provides fast results without physical contact.', ratingsAverage: 4.7, ratingsCount: 120 },
    { name: 'Non-Slip Yoga Mat', price: 50.00, categoryName: 'Health & Fitness', stock: 200, isFeatured: false, images: [`${BASE_URL}/yoga-mat.jpg`], description: 'The Non-Slip Yoga Mat is designed for stability and comfort during yoga sessions. Its durable material ensures a safe practice, making it ideal for all skill levels and styles.', ratingsAverage: 4.6, ratingsCount: 200 },
    { name: 'Adjustable Knee Pads', price: 40.00, categoryName: 'Health & Fitness', stock: 70, isFeatured: false, images: [`${BASE_URL}/knee-pads.jpg`], description: 'These Adjustable Knee Pads provide comfort and support during workouts. Perfect for protecting your knees during intense activities, they are essential for athletes and fitness lovers.', ratingsAverage: 4.3, ratingsCount: 70 },
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
