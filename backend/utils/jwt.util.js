import jwt from 'jsonwebtoken';

/**
 * Generate a short-lived access token
 */
export const generateAccessToken = (userId, role) => {
    return jwt.sign({ userId, role }, process.env.JWT_SECRET, {
        algorithm: 'HS256',
        expiresIn: '15m'
    });
};

/**
 * Generate a long-lived refresh token
 */
export const generateRefreshToken = (userId) => {
    return jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, {
        algorithm: 'HS256',
        expiresIn: '7d'
    });
};

/**
 * Verify an access token
 */
export const verifyToken = (token) => {
    return jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
};

/**
 * Verify a refresh token
 */
export const verifyRefreshToken = (token) => {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET, { algorithms: ['HS256'] });
};
