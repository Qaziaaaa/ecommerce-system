import * as adminService from '../services/admin.service.js';
import AppError from '../utils/AppError.js';

export const getDashboardOverview = async (req, res, next) => {
    try {
        const data = await adminService.getDashboardOverview();
        res.status(200).json({ status: 'success', data });
    } catch (err) {
        next(err);
    }
};

export const getMonthlySales = async (req, res, next) => {
    try {
        const data = await adminService.getMonthlySales();
        res.status(200).json({ status: 'success', data });
    } catch (err) {
        next(err);
    }
};

export const getCategoryDistribution = async (req, res, next) => {
    try {
        const data = await adminService.getCategoryDistribution();
        res.status(200).json({ status: 'success', data });
    } catch (err) {
        next(err);
    }
};

export const getOrderStatusDistribution = async (req, res, next) => {
    try {
        const data = await adminService.getOrderStatusDistribution();
        res.status(200).json({ status: 'success', data });
    } catch (err) {
        next(err);
    }
};

export const getTopProducts = async (req, res, next) => {
    try {
        const data = await adminService.getTopProducts();
        res.status(200).json({ status: 'success', data });
    } catch (err) {
        next(err);
    }
};

export const getRecentOrders = async (req, res, next) => {
    try {
        const data = await adminService.getRecentOrders();
        res.status(200).json({ status: 'success', data });
    } catch (err) {
        next(err);
    }
};

export const getLowStockAlerts = async (req, res, next) => {
    try {
        const data = await adminService.getLowStockAlerts();
        res.status(200).json({ status: 'success', data });
    } catch (err) {
        next(err);
    }
};

export const getAllUsers = async (req, res, next) => {
    try {
        const data = await adminService.getAllUsers();
        res.status(200).json({ status: 'success', data });
    } catch (err) {
        next(err);
    }
};

/**
 * 🔑 UPDATE USER ROLE (ADMIN ONLY)
 */
export const updateUserRole = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { role } = req.body;

        // Security: Prevent self-demotion
        if (req.user._id.toString() === id) {
            return next(new AppError('You cannot change your own role to prevent losing administrative access.', 403));
        }

        const user = await adminService.updateUserRoleService(id, role);
        if (!user) {
            return next(new AppError('No user found with that ID', 404));
        }

        res.status(200).json({
            status: 'success',
            data: { user }
        });
    } catch (err) {
        next(err);
    }
};
