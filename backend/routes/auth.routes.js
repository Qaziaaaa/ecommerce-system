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
    refreshToken,
    adminLogin
} from '../controllers/auth.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { noCacheMiddleware } from '../middlewares/cache.middleware.js';
import { signupSchema, loginSchema, verifyOtpSchema, validate } from '../middlewares/validation.middleware.js';
import { otpSendLimiter, otpVerifyLimiter, authLimiter } from '../middlewares/rateLimiter.js';

const router = express.Router();

/**
 * @openapi
 * /auth/admin-login:
 *   post:
 *     tags: [Authentication]
 *     summary: Admin login
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Login successful, OTP sent
 *       401:
 *         description: Invalid credentials
 *         content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } }
 */
router.post('/admin-login', authLimiter, adminLogin);

/**
 * @openapi
 * /auth/send-otp:
 *   post:
 *     tags: [Authentication]
 *     summary: Send OTP for authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email }
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *       429:
 *         description: Too many requests
 */
router.post('/send-otp', otpSendLimiter, sendOTP);

/**
 * @openapi
 * /auth/signup:
 *   post:
 *     tags: [Authentication]
 *     summary: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, name, phone]
 *             properties:
 *               email: { type: string, format: email }
 *               name: { type: string }
 *               phone: { type: string }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: OTP sent for verification
 *       400:
 *         description: Validation error
 */
router.post('/signup', otpSendLimiter, validate(signupSchema), sendOTP);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Authentication]
 *     summary: Login with email
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: OTP sent to email
 *       401:
 *         description: Invalid email
 */
router.post('/login', otpSendLimiter, validate(loginSchema), sendOTP);

/**
 * @openapi
 * /auth/verify-otp:
 *   post:
 *     tags: [Authentication]
 *     summary: Verify OTP and complete authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, otp]
 *             properties:
 *               email: { type: string, format: email }
 *               otp: { type: string }
 *     responses:
 *       200:
 *         description: Authentication successful, tokens returned
 *       400:
 *         description: Invalid or expired OTP
 */
router.post('/verify-otp', otpVerifyLimiter, validate(verifyOtpSchema), verifyOTP);

/**
 * @openapi
 * /auth/resend-otp:
 *   post:
 *     tags: [Authentication]
 *     summary: Resend OTP
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email }
 *     responses:
 *       200:
 *         description: OTP resent
 */
router.post('/resend-otp', otpSendLimiter, resendOTP);

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     tags: [Authentication]
 *     summary: Refresh access token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200:
 *         description: New tokens issued
 *       401:
 *         description: Invalid or expired refresh token
 */
router.post('/refresh', authLimiter, refreshToken);

/**
 * @openapi
 * /auth/profile:
 *   get:
 *     tags: [Profile]
 *     summary: Get current user profile
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         description: User profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 user: { $ref: '#/components/schemas/User' }
 *       401:
 *         description: Not authenticated
 */
router.get('/profile', protect, noCacheMiddleware, getProfile);

/**
 * @openapi
 * /auth/profile:
 *   put:
 *     tags: [Profile]
 *     summary: Update current user profile
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               phone: { type: string }
 *     responses:
 *       200:
 *         description: Profile updated
 *       401:
 *         description: Not authenticated
 */
router.put('/profile', protect, noCacheMiddleware, updateProfile);

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     tags: [Authentication]
 *     summary: Logout user
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Logged out successfully
 */
router.post('/logout', protect, logout);

/**
 * @openapi
 * /auth/profile/addresses:
 *   post:
 *     tags: [Profile]
 *     summary: Add a new address
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               label: { type: string }
 *               street: { type: string }
 *               city: { type: string }
 *               state: { type: string }
 *               zip: { type: string }
 *               country: { type: string }
 *               isDefault: { type: boolean }
 *     responses:
 *       201:
 *         description: Address added
 *       401:
 *         description: Not authenticated
 */
router.post('/profile/addresses', protect, addAddress);

/**
 * @openapi
 * /auth/profile/addresses/{id}:
 *   delete:
 *     tags: [Profile]
 *     summary: Remove an address
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Address removed
 *       401:
 *         description: Not authenticated
 */
router.delete('/profile/addresses/:id', protect, removeAddress);

/**
 * @openapi
 * /auth/profile/addresses/{id}/default:
 *   put:
 *     tags: [Profile]
 *     summary: Set address as default
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Default address updated
 *       401:
 *         description: Not authenticated
 */
router.put('/profile/addresses/:id/default', protect, setDefaultAddress);

export default router;
