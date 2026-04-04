import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: true,
            lowercase: true
        },
        otp: {
            type: String, // This will store the hashed OTP
            required: true
        },
        expiresAt: {
            type: Date,
            required: true,
            index: { expires: '0s' } // TTL index: document will self-delete when current time >= expiresAt
        },
        attempts: {
            type: Number,
            default: 0
        }
    },
    {
        timestamps: true
    }
);

// Note: Hashing logic (e.g., bcrypt.hash) should be handled in the controller before saving.
// The raw OTP should be emailed but only the hash saved here.

const OTP = mongoose.model('OTP', otpSchema);
export default OTP;
