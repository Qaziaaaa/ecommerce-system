import express from 'express';
import { 
    sendOTP, 
    verifyOTP, 
    resendOTP, 
    getProfile, 
    updateProfile, 
    addAddress, 
    removeAddress, 
    setDefaultAddress,
    logout,
    refreshToken
} from '../controllers/auth.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { signupSchema, loginSchema, verifyOtpSchema, validate } from '../middlewares/validation.middleware.js';
import { otpSendLimiter, otpVerifyLimiter, authLimiter } from '../middlewares/rateLimiter.js';

const router = express.Router();

// Auth Routes with validation and rate limiting
router.post('/send-otp', otpSendLimiter, sendOTP);
router.post('/signup', otpSendLimiter, validate(signupSchema), sendOTP);
router.post('/login', otpSendLimiter, validate(loginSchema), sendOTP);
router.post('/verify-otp', otpVerifyLimiter, validate(verifyOtpSchema), verifyOTP);
router.post('/resend-otp', otpSendLimiter, resendOTP);
router.post('/refresh', authLimiter, refreshToken);

// Protected routes
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.post('/logout', protect, logout);

router.post('/profile/addresses', protect, addAddress);
router.delete('/profile/addresses/:id', protect, removeAddress);
router.put('/profile/addresses/:id/default', protect, setDefaultAddress);

export default router;
