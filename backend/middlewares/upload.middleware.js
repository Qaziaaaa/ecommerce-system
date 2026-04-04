import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../config/cloudinary.js';

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'ecommerce_products',
        // Removing allowed_formats and transformations temporarily 
        // as they are part of the failed signature string
    },
});

const upload = multer({ storage: storage });

export default upload;
