import * as productService from '../services/product.service.js';
import AppError from '../utils/AppError.js';
import { logAuditAction } from '../services/audit.service.js';

export const createProduct = async (req, res, next) => {
    try {
        const product = await productService.createProductService(req.body);
        logAuditAction({
            admin: req.user._id,
            action: 'PRODUCT_CREATED',
            targetModel: 'Product',
            targetId: product._id,
            changes: { name: product.name, price: product.price },
            description: `Admin created product "${product.name}"`,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
        });
        res.status(201).json({
            status: 'success',
            data: { product }
        });
    } catch (error) {
        next(error);
    }
};

export const getProducts = async (req, res, next) => {
    try {
        const result = await productService.getAllProductsService(req.query, req.user);
        res.status(200).json({
            status: 'success',
            results: result.products.length,
            pagination: result.pagination,
            data: {
                products: result.products,
            }
        });
    } catch (error) {
        next(error);
    }
};

export const getProductById = async (req, res, next) => {
    try {
        const product = await productService.getProductByIdService(req.params.id, req.user);

        if (!product) {
            return next(new AppError('No product found with that ID or it is inactive', 404));
        }

        res.status(200).json({
            status: 'success',
            data: { product }
        });
    } catch (error) {
        next(error);
    }
};

export const updateProduct = async (req, res, next) => {
    try {
        const product = await productService.updateProductService(req.params.id, req.body);

        if (!product) {
            return next(new AppError('No product found with that ID', 404));
        }

        logAuditAction({
            admin: req.user._id,
            action: 'PRODUCT_UPDATED',
            targetModel: 'Product',
            targetId: product._id,
            changes: { updates: Object.keys(req.body) },
            description: `Admin updated product "${product.name}"`,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
        });

        res.status(200).json({
            status: 'success',
            data: { product }
        });
    } catch (error) {
        next(error);
    }
};

export const deleteProduct = async (req, res, next) => {
    try {
        const product = await productService.deleteProductService(req.params.id);

        if (!product) {
            return next(new AppError('No product found with that ID', 404));
        }

        logAuditAction({
            admin: req.user._id,
            action: 'PRODUCT_DELETED',
            targetModel: 'Product',
            targetId: product._id,
            changes: { name: product.name },
            description: `Admin deactivated product "${product.name}"`,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
        });

        res.status(200).json({
            status: 'success',
            message: 'Product successfully deactivated',
            data: null
        });
    } catch (error) {
        next(error);
    }
};
