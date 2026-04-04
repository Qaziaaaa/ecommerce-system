import crypto from 'crypto';

/**
 * Generate a 6-digit valid OTP
 * @returns {string} 6-digit OTP
 */
export const generateOTP = () => {
    return crypto.randomInt(100000, 999999).toString();
};

/**
 * Hash an OTP string using SHA-256
 * @param {string} otp 
 * @returns {string} Hashed OTP
 */
export const hashOTP = (otp) => {
    return crypto.createHash('sha256').update(otp).digest('hex');
};
