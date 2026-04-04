import { verifyToken } from '../utils/jwt.util.js';
import User from '../models/User.js';

/**
 * Optional Auth Middleware
 * If a valid token is present, attaches user to req. If not, continues without error.
 * This allows public routes to optionally check if the user is an admin.
 */
export const optionalAuth = async (req, res, next) => {
    try {
        let token;

        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (token) {
            try {
                const decoded = verifyToken(token);
                const currentUser = await User.findById(decoded.userId);
                if (currentUser) {
                    req.user = currentUser;
                }
            } catch (error) {
                // Token invalid — just proceed without user
            }
        }

        next();
    } catch (error) {
        next();
    }
};
