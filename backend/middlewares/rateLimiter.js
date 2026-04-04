import rateLimit from 'express-rate-limit';

// Standard API limiter
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
        status: 'fail',
        message: 'Too many requests from this IP, please try again after 15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Stricter limiter for Auth routes (Login/Register)
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // limit each IP to 50 requests per windowMs
    message: {
        status: 'fail',
        message: 'Too many authentication attempts, please try again after 15 minutes'
    }
});

// High-security limiter for OTP generation (prevent spamming)
export const otpSendLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 5, // 5 OTPs per minute
    message: {
        status: 'fail',
        message: 'Too many OTP requests. Please wait a minute before trying again.'
    }
});

// Critical limiter for OTP verification (prevent brute-forcing)
export const otpVerifyLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 3, // 3 attempts per minute
    message: {
        status: 'fail',
        message: 'Too many failed attempts. Please wait a minute.'
    }
});
