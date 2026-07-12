import { verifyToken } from '../utils/jwt.util.js';
import User from '../models/User.js';

/**
 * JWT Authentication Middleware
 * Extracts token, verifies it, and attaches user to request
 */
export const protect = async (req, res, next) => {
    try {
        let token;

        // Extract token from cookies or Authorization header
        token = req.cookies?.accessToken;

        if (!token && req.headers?.authorization?.startsWith('Bearer ')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({
                status: 'error',
                message: 'You are not logged in. Please provide a valid token.'
            });
        }

        // Verify token
        let decoded;
        try {
            decoded = verifyToken(token);
        } catch (error) {
            return res.status(401).json({
                status: 'error',
                message: 'Invalid or expired token.'
            });
        }

        // Attach user to request
        const currentUser = await User.findById(decoded.userId).select('_id name email role isVerified addresses');
        if (!currentUser) {
            return res.status(401).json({
                status: 'error',
                message: 'The user belonging to this token no longer exists.'
            });
        }

        req.user = currentUser;
        next();
    } catch (error) {
        return res.status(500).json({
            status: 'error',
            message: 'Internal server error during authentication.'
        });
    }
};

/**
 * Role-based Authorization Middleware
 */
export const restrictTo = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                status: 'error',
                message: 'You do not have permission to perform this action'
            });
        }
        next();
    };
};
