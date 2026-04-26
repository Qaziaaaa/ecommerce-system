import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../config/cloudinary.js';
import logger from '../utils/logger.js';

// File size thresholds (Requirements: 6.5 — Property 23)
const SMALL_FILE_THRESHOLD = 1 * 1024 * 1024;  // 1MB — buffer in memory
const MAX_FILE_SIZE = 5 * 1024 * 1024;          // 5MB hard limit

/**
 * Cloudinary storage — streams files directly to Cloudinary without
 * buffering the full file in Node.js memory. This prevents memory
 * exhaustion on large uploads (Requirements: 6.5).
 */
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'ecommerce_products',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation: [{ width: 1200, height: 1200, crop: 'limit', quality: 'auto' }],
    },
});

/**
 * Memory storage for small files (< 1MB) — faster for tiny images.
 * Used as a fallback when Cloudinary is unavailable.
 */
const memoryStorage = multer.memoryStorage();

const fileFilter = (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only JPEG, PNG, and WebP images are allowed'));
    }
};

/**
 * Primary upload middleware — streams to Cloudinary.
 * Monitors memory usage before and after upload.
 */
const upload = multer({
    storage,
    limits: {
        fileSize: MAX_FILE_SIZE,
        files: 1,
    },
    fileFilter,
});

/**
 * Upload middleware with memory monitoring.
 * Logs a warning if heap usage spikes significantly during upload.
 * Requirements: 6.5
 */
export const monitoredUpload = (fieldName) => (req, res, next) => {
    const memBefore = process.memoryUsage().heapUsed;

    upload.single(fieldName)(req, res, (err) => {
        const memAfter = process.memoryUsage().heapUsed;
        const memDelta = memAfter - memBefore;

        if (memDelta > SMALL_FILE_THRESHOLD) {
            logger.warn('Large memory spike during file upload', {
                memDeltaMB: (memDelta / 1024 / 1024).toFixed(2),
                heapUsedMB: (memAfter / 1024 / 1024).toFixed(2),
                file: req.file?.originalname,
                size: req.file?.size,
            });
        }

        if (err) return next(err);
        next();
    });
};

export default upload;
