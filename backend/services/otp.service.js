import crypto from 'crypto';
import OTP from '../models/OTP.js';
import { generateOTP, hashOTP } from '../utils/otp.util.js';

export const createOTP = async (email) => {
    // 1. Invalidate previous OTPs for this email
    await OTP.deleteMany({ email });

    // 2. Generate new raw OTP and hash it
    const rawOtp = generateOTP();
    const hashedOtp = hashOTP(rawOtp);

    // 3. Set expiry (5 minutes from now)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // 4. Save to database
    await OTP.create({
        email,
        otp: hashedOtp,
        expiresAt
    });

    return rawOtp;
};

export const verifyOTP = async (email, providedOtp) => {
    const otpRecord = await OTP.findOne({ email });

    if (!otpRecord) {
        throw new Error('OTP not found or already verified/expired');
    }

    // Check expiration explicitly using Date comparison as requested
    if (otpRecord.expiresAt < new Date()) {
        await OTP.deleteMany({ email });
        throw new Error('OTP expired');
    }

    // Max 3 verification attempts validation
    if (otpRecord.attempts >= 3) {
        await OTP.deleteMany({ email });
        throw new Error('Maximum verification attempts reached. Please request a new OTP.');
    }

    const hashedOtp = hashOTP(providedOtp);

    // Check if hashes match (constant-time comparison to prevent timing attacks)
    const a = Buffer.from(otpRecord.otp);
    const b = Buffer.from(hashedOtp);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        // Increment attempts
        otpRecord.attempts += 1;
        await otpRecord.save();
        throw new Error('Invalid OTP');
    }

    // Important Rule: Delete OTP After Successful Validation
    await OTP.deleteMany({ email });

    return true;
};

export const resendOTP = async (email) => {
    // Note: createOTP handles invalidating the old OTP by calling OTP.deleteMany({email})
    // and storing a freshly generated one
    return await createOTP(email);
};
