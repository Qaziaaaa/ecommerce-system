import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import dns from 'dns';

dns.setServers(['8.8.8.8', '8.8.4.4']);
dns.setDefaultResultOrder('ipv4first');

dotenv.config();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@nova.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@123';

async function seedAdmin() {
    try {
        await mongoose.connect(process.env.MONGO_URI, { family: 4 });

        const existing = await User.findOne({ email: ADMIN_EMAIL });
        if (existing) {
            existing.password = ADMIN_PASSWORD;
            existing.role = 'admin';
            existing.isVerified = true;
            await existing.save();
            console.log(`Admin updated: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
        } else {
            await User.create({
                name: 'Admin',
                email: ADMIN_EMAIL,
                password: ADMIN_PASSWORD,
                role: 'admin',
                isVerified: true,
            });
            console.log(`Admin created: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
        }

        process.exit(0);
    } catch (err) {
        console.error('Seed failed:', err.message);
        process.exit(1);
    }
}

seedAdmin();
