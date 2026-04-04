import express from 'express';
import { protect } from '../middlewares/auth.middleware.js';
import { isAdmin } from '../middlewares/role.middleware.js';
import upload from '../middlewares/upload.middleware.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * @route   POST /api/v1/upload
 * @desc    Upload an image to Cloudinary
 * @access  Private (Admin)
 */
router.post('/', protect, isAdmin, (req, res) => {
    upload.single('image')(req, res, (err) => {
        if (err) {
            logger.error('MULTER/CLOUDINARY UPLOAD ERROR:', err);
            return res.status(400).json({
                status: 'error',
                message: 'Image upload failed',
                details: err.message
            });
        }

        try {
            if (!req.file) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Please upload an image'
                });
            }

            logger.info('✅ Image uploaded to Cloudinary:', { path: req.file.path });
            res.status(200).json({
                status: 'success',
                imageUrl: req.file.path
            });
        } catch (error) {
            logger.error('POST-UPLOAD ERROR:', error);
            res.status(500).json({
                status: 'error',
                message: 'Internal error after upload',
                details: error.message
            });
        }
    });
});

export default router;
