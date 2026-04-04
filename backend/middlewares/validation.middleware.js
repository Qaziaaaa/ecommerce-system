import { z } from 'zod';

export const validate = (schema) => (req, res, next) => {
    try {
        schema.parse({
            body: req.body,
            query: req.query,
            params: req.params,
        });
        next();
    } catch (error) {
        return res.status(400).json({
            status: 'fail',
            errors: error.errors.map(err => ({
                path: err.path[1],
                message: err.message
            }))
        });
    }
};

// --- Auth Schemas ---

export const signupSchema = z.object({
    body: z.object({
        name: z.string().min(2, 'Name must be at least 2 characters'),
        email: z.string().email('Invalid email address'),
        phone: z.string().min(10, 'Phone number must be at least 10 digits'),
    })
});

export const loginSchema = z.object({
    body: z.object({
        email: z.string().email('Invalid email address'),
    })
});

export const verifyOtpSchema = z.object({
    body: z.object({
        email: z.string().email('Invalid email address'),
        otp: z.string().length(6, 'OTP must be exactly 6 digits'),
    })
});
