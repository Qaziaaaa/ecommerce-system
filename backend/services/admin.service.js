import User from '../models/User.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';

/**
 * 📊 DASHBOARD OVERVIEW
 * Calculates core metrics based on verified transactions.
 */
export const getDashboardOverview = async () => {
    // 1. Core Counts
    const [totalUsers, totalOrders, totalProducts] = await Promise.all([
        User.countDocuments(),
        Order.countDocuments(),
        Product.countDocuments()
    ]);

    // 2. Revenue (Only PAID orders are counted for accuracy)
    const revenueAggregation = await Order.aggregate([
        { $match: { paymentStatus: 'paid' } },
        { $group: { _id: null, revenue: { $sum: '$totalAmount' } } }
    ]);
    const totalRevenue = revenueAggregation.length > 0 ? revenueAggregation[0].revenue : 0;

    return { totalUsers, totalOrders, totalProducts, totalRevenue };
};

/**
 * 📈 MONTHLY SALES (Last 12 Months)
 * Dynamic grouping for trending analysis.
 */
export const getMonthlySales = async () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const salesData = await Order.aggregate([
        { $match: { paymentStatus: 'paid' } },
        {
            $group: {
                _id: { $month: '$createdAt' },
                revenue: { $sum: '$totalAmount' }
            }
        },
        { $sort: { '_id': 1 } }
    ]);

    // Ensure all 12 months are represented (even with 0 revenue)
    return months.map((month, index) => {
        const found = salesData.find(s => s._id === index + 1);
        return {
            month,
            revenue: found ? found.revenue : 0
        };
    });
};

/**
 * 🍱 CATEGORY DISTRIBUTION
 * Revenue breakdown by product category.
 */
export const getCategoryDistribution = async () => {
    return await Order.aggregate([
        { $match: { paymentStatus: 'paid' } },
        { $unwind: '$orderItems' },
        {
            $lookup: {
                from: 'products',
                localField: 'orderItems.product',
                foreignField: '_id',
                as: 'product'
            }
        },
        { $unwind: '$product' },
        {
            $lookup: {
                from: 'categories',
                localField: 'product.category',
                foreignField: '_id',
                as: 'category'
            }
        },
        { $unwind: '$category' },
        {
            $group: {
                _id: '$category.name',
                value: { $sum: { $multiply: ['$orderItems.price', '$orderItems.quantity'] } }
            }
        },
        { $project: { name: '$_id', value: 1, _id: 0 } },
        { $sort: { value: -1 } }
    ]);
};

/**
 * 🚚 ORDER LOGISTICS STATUS
 * Count orders by current delivery status.
 */
export const getOrderStatusDistribution = async () => {
    return await Order.aggregate([
        {
            $group: {
                _id: '$orderStatus',
                value: { $sum: 1 }
            }
        },
        { $project: { name: '$_id', value: 1, _id: 0 } }
    ]);
};

export const getTopProducts = async () => {
    return await Order.aggregate([
        { $unwind: '$orderItems' },
        {
            $group: {
                _id: '$orderItems.product',
                sold: { $sum: '$orderItems.quantity' }
            }
        },
        { $sort: { sold: -1 } },
        { $limit: 8 },
        {
            $lookup: {
                from: 'products',
                localField: '_id',
                foreignField: '_id',
                as: 'productDetails'
            }
        },
        { $unwind: '$productDetails' },
        {
            $project: {
                _id: 0,
                name: '$productDetails.name',
                sold: 1
            }
        }
    ]);
};

export const getRecentOrders = async () => {
    return await Order.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('user', 'name email');
};

export const getLowStockAlerts = async () => {
    return await Product.find({ stock: { $lt: 20 } })
        .populate('category', 'name')
        .select('name stock category')
        .sort({ stock: 1 });
};

export const getAllUsers = async () => {
    return await User.find()
        .select('name email role createdAt isVerified')
        .sort({ createdAt: -1 });
};

/**
 * 🔑 UPDATE USER ROLE
 * Allows admins to promote/demote other users.
 * @param {String} userId 
 * @param {String} role 
 * @returns {Promise<Object>}
 */
export const updateUserRoleService = async (userId, role) => {
    return await User.findByIdAndUpdate(userId, { role }, { new: true, runValidators: true });
};
