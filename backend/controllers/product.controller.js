import * as productService from '../services/product.service.js';
import AppError from '../utils/AppError.js';

export const createProduct = async (req, res, next) => {
    try {
        const product = await productService.createProductService(req.body);
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
            data: {
                products: result.products,
                pagination: {
                    total: result.total,
                    totalPages: result.totalPages,
                    currentPage: result.currentPage
                }
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

        res.status(200).json({
            status: 'success',
            message: 'Product successfully deactivated',
            data: null
        });
    } catch (error) {
        next(error);
    }
};
