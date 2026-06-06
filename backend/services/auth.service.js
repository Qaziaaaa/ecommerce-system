import User from '../models/User.js';
import { createOTP, verifyOTP, resendOTP } from './otp.service.js';
import { sendOTPEmail } from './email.service.js';

export const sendAuthenticationOTP = async (email, type = 'login') => {
    const user = await User.findOne({ email });

    if (type === 'signup' && user) {
        throw new Error('An account with this email already exists. Please log in instead.');
    }

    if (type === 'login' && !user) {
        throw new Error('No account found with this email. Please sign up first.');
    }

    const rawOtp = await createOTP(email);
    await sendOTPEmail(email, rawOtp);
    return true;
};

export const verifyAuthenticationOTP = async (email, otpCode, name) => {
    // 1. Verify the OTP (will throw errors if invalid, expired or max attempts reached)
    await verifyOTP(email, otpCode);

    // 2. Find user or create if signup
    let user = await User.findOne({ email });

    if (!user) {
        if (!name) {
            throw new Error('Name is required for registration');
        }

        const adminEmails = (process.env.ADMIN_EMAIL || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
        const role = adminEmails.includes(email) ? 'admin' : 'user';
        
        user = await User.create({
            email,
            name,
            role,
            isVerified: true
        });
    } else {
        // Mark as verified if logging in
        if (!user.isVerified) {
            await User.updateOne({ _id: user._id }, { $set: { isVerified: true } });
            user.isVerified = true;
        }
    }

    // 3. Return only user (controller handles dual-token logic)
    return { user };
};

export const resendAuthenticationOTP = async (email, type = 'login') => {
    // We reuse the same logic as sendAuthenticationOTP
    return await sendAuthenticationOTP(email, type);
};
