import * as categoryService from '../services/category.service.js';

export const getAllCategories = async (req, res, next) => {
    try {
        const categories = await categoryService.getAllCategoriesService();
        res.status(200).json({
            status: 'success',
            results: categories.length,
            data: { categories }
        });
    } catch (error) {
        next(error);
    }
};

export const createCategory = async (req, res, next) => {
    try {
        const category = await categoryService.createCategoryService(req.body);
        res.status(201).json({
            status: 'success',
            data: { category }
        });
    } catch (error) {
        next(error);
    }
};
