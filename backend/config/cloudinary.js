import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

const cloud_name = String(process.env.CLOUDINARY_CLOUD_NAME || '').trim();
const api_key = String(process.env.CLOUDINARY_API_KEY || '').trim();
const api_secret = String(process.env.CLOUDINARY_API_SECRET || '').trim();

cloudinary.config({
    cloud_name,
    api_key,
    api_secret
});

if (!cloud_name || !api_key || !api_secret) {
    console.error('❌ CRITICAL: Cloudinary credentials are incomplete in .env');
}

export default cloudinary;
