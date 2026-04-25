import Product from '../models/Product.js';
import Category from '../models/Category.js';

/**
 * Create a new product
 * @param {Object} productData 
 * @returns {Promise<Object>} Created product
 */
export const createProductService = async (productData) => {
    // Basic slug generation if not provided (though good practice is to handle it in a pre-save hook, we do it here for simplicity or assume front-end sends it)
    if (!productData.slug && productData.name) {
        productData.slug = productData.name
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .trim()
            .replace(/[\s-]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }
    const product = await Product.create(productData);
    return product;
};

/**
 * Get all products with filtering, sorting, pagination, and text search
 * @param {Object} queryParams - req.query
 * @param {Object} user - req.user (to check role)
 * @returns {Promise<Object>} { products, total, totalPages, currentPage }
 */
export const getAllProductsService = async (queryParams, user) => {
    // 1. Advanced Filtering
    const queryObj = { ...queryParams };
    const excludedFields = ['page', 'sort', 'limit', 'search', 'fields', 'minPrice', 'maxPrice', 'category'];
    excludedFields.forEach(el => delete queryObj[el]);

    // Role-based visibility
    if (!user || user.role !== 'admin') {
        queryObj.isActive = true;
    }

    // Category Filter (Slug to ID mapping)
    if (queryParams.category) {
        const category = await Category.findOne({ slug: queryParams.category });
        if (category) {
            queryObj.category = category._id;
        }
    }

    // Price Range
    if (queryParams.minPrice || queryParams.maxPrice) {
        queryObj.price = {};
        if (queryParams.minPrice) queryObj.price.$gte = Number(queryParams.minPrice);
        if (queryParams.maxPrice) queryObj.price.$lte = Number(queryParams.maxPrice);
    }

    let query = Product.find(queryObj);

    // 2. Text Search
    if (queryParams.search) {
        query = query.find({ $text: { $search: queryParams.search } });
    }

    // 3. Advanced Sorting
    if (queryParams.sort) {
        const sortMap = {
            'price-asc': 'price',
            'price-desc': '-price',
            'newest': '-createdAt',
            'oldest': 'createdAt',
            'name-asc': 'name',
            'name-desc': '-name'
        };
        const sortBy = sortMap[queryParams.sort] || queryParams.sort.split(',').join(' ');
        query = query.sort(sortBy);
    } else {
        query = query.sort('-createdAt');
    }

    // 4. Pagination
    const page = parseInt(queryParams.page, 10) || 1;
    const limit = parseInt(queryParams.limit, 10) || 12;
    const skip = (page - 1) * limit;

    query = query.skip(skip).limit(limit).populate('category', 'name slug');

    // Execute query in parallel for performance
    const [products, totalCount] = await Promise.all([
        query,
        Product.countDocuments(queryObj)
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return { products, total: totalCount, totalPages, currentPage: page };
};

/**
 * Get a single product by ID
 * @param {String} id 
 * @param {Object} user 
 * @returns {Promise<Object>}
 */
export const getProductByIdService = async (id, user) => {
    const queryObj = { _id: id };

    // Non-admins can only see active products
    if (!user || user.role !== 'admin') {
        queryObj.isActive = true;
    }

    const product = await Product.findOne(queryObj).populate('category', 'name slug description');
    return product;
};

/**
 * Update a product
 * @param {String} id
 * @param {Object} updateData
 * @returns {Promise<Object>}
 */
export const updateProductService = async (id, updateData) => {
    // If the frontend sends 'image' instead of 'images', handle it
    if (updateData.image && !updateData.images) {
        updateData.images = [updateData.image];
        delete updateData.image;
    }

    if (updateData.name && !updateData.slug) {
        updateData.slug = updateData.name
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .trim()
            .replace(/[\s-]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    const product = await Product.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
        context: 'query'
    });
    return product;
};

/**
 * Soft delete a product (set isActive to false)
 * @param {String} id 
 * @returns {Promise<Object>}
 */
export const deleteProductService = async (id) => {
    const product = await Product.findByIdAndUpdate(id, { isActive: false }, { new: true });
    return product;
};
