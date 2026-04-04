import Category from '../models/Category.js';

export const getAllCategoriesService = async () => {
    return await Category.find({ isActive: true }).sort('name');
};

export const createCategoryService = async (categoryData) => {
    if (!categoryData.slug && categoryData.name) {
        categoryData.slug = categoryData.name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
    }
    return await Category.create(categoryData);
};
