import rateLimit from 'express-rate-limit';
import logger from '../utils/logger.js';

// When running behind a reverse proxy (Render, Heroku, Vercel), express sets
// req.ip from X-Forwarded-For only when 'trust proxy' is enabled in app.js.
const keyGenerator = (req) => req.ip || req.socket.remoteAddress || 'unknown';

/**
 * Per-user key generator — uses authenticated user ID when available,
 * falls back to IP for unauthenticated requests.
 * Requirements: 6.6 — Property 24: Rate Limiting Per User Enforcement
 */
const userKeyGenerator = (req) => {
    if (req.user?._id) {
        return `user:${req.user._id.toString()}`;
    }
    return `ip:${req.ip || req.socket.remoteAddress || 'unknown'}`;
};

/**
 * Handler called when rate limit is exceeded — logs the event.
 */
const onLimitReached = (req, res, options) => {
    logger.warn('Rate limit exceeded', {
        key: userKeyGenerator(req),
        path: req.path,
        method: req.method,
        limit: options.max,
        windowMs: options.windowMs,
    });
};

// Standard API limiter (per IP)
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    keyGenerator,
    handler: (req, res, next, options) => {
        onLimitReached(req, res, options);
        res.status(429).json({
            status: 'fail',
            message: 'Too many requests from this IP, please try again after 15 minutes',
            code: 'RATE_LIMIT_EXCEEDED',
            retryAfter: Math.ceil(options.windowMs / 1000),
        });
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Per-user API limiter — stricter, keyed by user ID (Requirements: 6.6)
export const userApiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200, // Authenticated users get higher limit
    keyGenerator: userKeyGenerator,
    handler: (req, res, next, options) => {
        onLimitReached(req, res, options);
        res.status(429).json({
            status: 'fail',
            message: 'Too many requests. Please slow down and try again shortly.',
            code: 'USER_RATE_LIMIT_EXCEEDED',
            retryAfter: Math.ceil(options.windowMs / 1000),
        });
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => !req.user, // Only apply to authenticated users
});

// Per-user order limiter — prevent order spam
export const orderLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 5,
    keyGenerator: userKeyGenerator,
    handler: (req, res, next, options) => {
        onLimitReached(req, res, options);
        res.status(429).json({
            status: 'fail',
            message: 'Too many orders placed. Please wait a moment before trying again.',
            code: 'ORDER_RATE_LIMIT_EXCEEDED',
            retryAfter: Math.ceil(options.windowMs / 1000),
        });
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Stricter limiter for Auth routes (Login/Register)
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50,
    keyGenerator,
    handler: (req, res, next, options) => {
        onLimitReached(req, res, options);
        res.status(429).json({
            status: 'fail',
            message: 'Too many authentication attempts, please try again after 15 minutes',
            code: 'AUTH_RATE_LIMIT_EXCEEDED',
            retryAfter: Math.ceil(options.windowMs / 1000),
        });
    },
});

// High-security limiter for OTP generation
export const otpSendLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    keyGenerator,
    message: {
        status: 'fail',
        message: 'Too many OTP requests. Please wait a minute before trying again.',
        code: 'OTP_RATE_LIMIT_EXCEEDED',
    }
});

// Critical limiter for OTP verification
export const otpVerifyLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 3,
    keyGenerator,
    message: {
        status: 'fail',
        message: 'Too many failed attempts. Please wait a minute.',
        code: 'OTP_VERIFY_RATE_LIMIT_EXCEEDED',
    }
});
