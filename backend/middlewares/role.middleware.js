
/**
 * Role-based Authorization Middleware
 * Usage: router.post('/', protect, isAdmin, createProduct)
 */
export const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        return res.status(403).json({
            status: 'error',
            message: 'Forbidden: Admin access required'
        });
    }
};
