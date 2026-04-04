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

// Debugging log to verify variables are loaded and correctly formatted
console.log('☁️ Cloudinary Configuration (Individual Keys):');
console.log(`   - Cloud Name: ${cloud_name ? '✅ ' + cloud_name : '❌ Missing'}`);
console.log(`   - API Key:    ${api_key ? '✅ ' + api_key.substring(0, 4) + '...' : '❌ Missing'}`);
console.log(`   - API Secret: ${api_secret ? '✅ ' + api_secret.substring(0, 2) + '...' + api_secret.slice(-2) : '❌ Missing'}`);

if (!cloud_name || !api_key || !api_secret) {
    console.error('❌ CRITICAL: Cloudinary credentials are incomplete in .env');
}

export default cloudinary;
