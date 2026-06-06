import { sendAuthenticationOTP, verifyAuthenticationOTP, resendAuthenticationOTP } from '../services/auth.service.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt.util.js';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import AppError from '../utils/AppError.js';

const isProd = () => process.env.NODE_ENV === 'production';

const getCookieOptions = () => ({
    httpOnly: true,
    secure: isProd(),
    sameSite: isProd() ? 'None' : 'Lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days matching refresh token
});

export const sendOTP = async (req, res, next) => {
    try {
        let { email, type } = req.body; // type is 'signup' or 'login'
        if (!email) {
            return next(new AppError('Email is required', 400));
        }
        email = email.toLowerCase().trim();

        await sendAuthenticationOTP(email, type);

        res.status(200).json({
            status: 'success',
            message: 'OTP sent successfully'
        });
    } catch (error) {
        next(error);
    }
};

export const verifyOTP = async (req, res, next) => {
    try {
        let { email, otp, name } = req.body;
        if (!email || !otp) {
            return next(new AppError('Email and OTP are required', 400));
        }
        email = email.toLowerCase().trim();

        // 1. Verify OTP and fetch user
        const { user } = await verifyAuthenticationOTP(email, otp, name);

        // 2. Generate Tokens
        const accessToken = generateAccessToken(user._id, user.role);
        const refreshToken = generateRefreshToken(user._id);

        // 3. Hash and store Refresh Token in DB (Option A)
        const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
        await User.findByIdAndUpdate(user._id, { $set: { refreshToken: hashedRefreshToken } });

        // 4. Send cookies
        res.cookie('accessToken', accessToken, { ...getCookieOptions(), maxAge: 15 * 60 * 1000 }); // 15 mins
        res.cookie('refreshToken', refreshToken, getCookieOptions());

        res.status(200).json({
            status: 'success',
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        next(error);
    }
};

export const refreshToken = async (req, res, next) => {
    try {
        const token = req.cookies.refreshToken;
        if (!token) {
            return next(new AppError('Refresh token missing', 401));
        }

        // 1. Verify token structure
        const decoded = verifyRefreshToken(token);

        // 2. Verify against DB hash
        const user = await User.findById(decoded.userId).select('+refreshToken');
        if (!user || !user.refreshToken) {
            return next(new AppError('Invalid or expired session', 401));
        }

        const isMatch = await bcrypt.compare(token, user.refreshToken);
        if (!isMatch) {
            // Potential reuse attack: clear user tokens for security
            await User.findByIdAndUpdate(user._id, { $unset: { refreshToken: 1 } });
            return next(new AppError('Unauthorized session reuse detected', 401));
        }

        // 3. Rotate Tokens: Invalidate old DB entry before issuing new one
        const newAccessToken = generateAccessToken(user._id, user.role);
        const newRefreshToken = generateRefreshToken(user._id);
        const newHashedRefreshToken = await bcrypt.hash(newRefreshToken, 10);

        await User.findByIdAndUpdate(user._id, { $set: { refreshToken: newHashedRefreshToken } });

        // 4. Re-issue cookies
        res.cookie('accessToken', newAccessToken, { ...getCookieOptions(), maxAge: 15 * 60 * 1000 });
        res.cookie('refreshToken', newRefreshToken, getCookieOptions());

        res.status(200).json({ status: 'success' });
    } catch (error) {
        next(new AppError('Invalid session', 401));
    }
};

export const logout = async (req, res, next) => {
    try {
        if (req.user) {
            // Invalidate refresh token in DB
            await User.findByIdAndUpdate(req.user._id, { $unset: { refreshToken: 1 } });
        }

        res.clearCookie('accessToken', { ...getCookieOptions(), maxAge: 0 });
        res.clearCookie('refreshToken', { ...getCookieOptions(), maxAge: 0 });

        res.status(200).json({
            status: 'success',
            message: 'Logged out successfully'
        });
    } catch (error) {
        next(error);
    }
};

export const adminLogin = async (req, res, next) => {
    try {
        let { email, password } = req.body;
        if (!email || !password) {
            return next(new AppError('Email and password are required', 400));
        }
        email = email.toLowerCase().trim();

        const user = await User.findOne({ email }).select('+password');
        if (!user || !user.password) {
            return next(new AppError('Invalid email or password', 401));
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return next(new AppError('Invalid email or password', 401));
        }

        const accessToken = generateAccessToken(user._id, user.role);
        const refreshToken = generateRefreshToken(user._id);

        const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
        await User.findByIdAndUpdate(user._id, { $set: { refreshToken: hashedRefreshToken } });

        res.cookie('accessToken', accessToken, { ...getCookieOptions(), maxAge: 15 * 60 * 1000 });
        res.cookie('refreshToken', refreshToken, getCookieOptions());

        res.status(200).json({
            status: 'success',
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        next(error);
    }
};

export const resendOTP = async (req, res, next) => {
    try {
        let { email, type } = req.body;
        if (!email) {
            return next(new AppError('Email is required', 400));
        }
        email = email.toLowerCase().trim();

        await resendAuthenticationOTP(email, type);

        res.status(200).json({
            status: 'success',
            message: 'A new OTP has been sent successfully'
        });
    } catch (error) {
        next(error);
    }
};

export const getProfile = async (req, res, next) => {
    try {
        // req.user is attached by the protect middleware
        if (!req.user) {
            return next(new AppError('User not found', 404));
        }

        res.status(200).json({
            status: 'success',
            user: req.user
        });
    } catch (error) {
        next(error);
    }
};

export const updateProfile = async (req, res, next) => {
    try {
        if (!req.user) {
            return next(new AppError('User not found', 404));
        }

        const { name } = req.body;
        
        if (name) {
            req.user.name = name;
        }
        
        await req.user.save();
        
        res.status(200).json({
            status: 'success',
            message: 'Profile updated successfully',
            user: req.user
        });
    } catch (error) {
        next(error);
    }
};

export const addAddress = async (req, res, next) => {
    try {
        const { street, city, state, zipCode, country, isDefault } = req.body;
        
        if (!street || !city || !zipCode) {
            return next(new AppError('Street, city, and zipCode are required', 400));
        }

        const MAX_LEN = 200;
        const sanitize = (str) => str?.replace(/<[^>]*>/g, '').trim();

        if (street.length > MAX_LEN || city.length > MAX_LEN || (zipCode && zipCode.length > 20)) {
            return next(new AppError('Address fields exceed maximum allowed length', 400));
        }
        
        const newAddress = { 
            street: sanitize(street), 
            city: sanitize(city), 
            state: sanitize(state) || 'N/A', 
            zipCode: sanitize(zipCode), 
            country: sanitize(country) || 'N/A', 
            isDefault: isDefault || false 
        };
        
        if (isDefault || req.user.addresses.length === 0) {
            req.user.addresses.forEach(addr => addr.isDefault = false);
            newAddress.isDefault = true;
        }

        req.user.addresses.push(newAddress);
        await req.user.save();

        res.status(200).json({ status: 'success', message: 'Address added successfully', user: req.user });
    } catch (error) {
        next(error);
    }
};

export const removeAddress = async (req, res, next) => {
    try {
        const addressId = req.params.id;
        
        req.user.addresses = req.user.addresses.filter(addr => addr._id.toString() !== addressId);
        
        if (req.user.addresses.length > 0 && !req.user.addresses.some(addr => addr.isDefault)) {
            req.user.addresses[0].isDefault = true;
        }

        await req.user.save();
        res.status(200).json({ status: 'success', message: 'Address removed successfully', user: req.user });
    } catch (error) {
        next(error);
    }
};

export const setDefaultAddress = async (req, res, next) => {
    try {
        const addressId = req.params.id;
        let found = false;
        
        req.user.addresses.forEach(addr => {
            if (addr._id.toString() === addressId) {
                addr.isDefault = true;
                found = true;
            } else {
                addr.isDefault = false;
            }
        });
        
        if (!found) {
            return next(new AppError('Address not found', 404));
        }

        await req.user.save();
        res.status(200).json({ status: 'success', message: 'Default address updated', user: req.user });
    } catch (error) {
        next(error);
    }
};
