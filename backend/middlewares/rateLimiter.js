import rateLimit from 'express-rate-limit';

// When running behind a reverse proxy (Render, Heroku, Vercel), express sets
// req.ip from X-Forwarded-For only when 'trust proxy' is enabled in app.js.
// We use a keyGenerator that falls back gracefully.
const keyGenerator = (req) => req.ip || req.socket.remoteAddress || 'unknown';

// Standard API limiter
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    keyGenerator,
    message: {
        status: 'fail',
        message: 'Too many requests from this IP, please try again after 15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Stricter limiter for Auth routes (Login/Register)
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50,
    keyGenerator,
    message: {
        status: 'fail',
        message: 'Too many authentication attempts, please try again after 15 minutes'
    }
});

// High-security limiter for OTP generation (prevent spamming)
export const otpSendLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 5,
    keyGenerator,
    message: {
        status: 'fail',
        message: 'Too many OTP requests. Please wait a minute before trying again.'
    }
});

// Critical limiter for OTP verification (prevent brute-forcing)
export const otpVerifyLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 3,
    keyGenerator,
    message: {
        status: 'fail',
        message: 'Too many failed attempts. Please wait a minute.'
    }
});
