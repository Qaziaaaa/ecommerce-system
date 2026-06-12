import Product from '../models/Product.js';
import Category from '../models/Category.js';
import CacheService from './cache.service.js';
import { parsePaginationParams, buildPaginationMeta } from './pagination.service.js';

// In-memory category slug → _id cache (resets on server restart)
const categorySlugCache = new Map();

/**
 * Create a new product
 * @param {Object} productData 
 * @returns {Promise<Object>} Created product
 */
export const searchProductsTypeahead = async (searchTerm, limit = 8) => {
  if (!searchTerm || searchTerm.trim().length < 2) return [];

  const products = await Product.find(
    { $text: { $search: searchTerm }, isActive: true },
    { score: { $meta: 'textScore' } }
  )
    .select('name price images slug brand')
    .sort({ score: { $meta: 'textScore' } })
    .limit(limit)
    .lean();

  return products.map(p => ({
    _id: p._id,
    name: p.name,
    price: p.price,
    image: p.images?.[0]?.url || null,
    slug: p.slug,
    brand: p.brand,
  }));
};

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
    const excludedFields = ['page', 'sort', 'limit', 'search', 'fields', 'minPrice', 'maxPrice', 'category', 'ids'];
    excludedFields.forEach(el => delete queryObj[el]);

    // Role-based visibility
    if (!user || user.role !== 'admin') {
        queryObj.isActive = true;
    }

    // Category Filter (Slug to ID mapping) — with in-memory cache
    if (queryParams.category) {
        let catId = categorySlugCache.get(queryParams.category);
        if (!catId) {
            const category = await Category.findOne({ slug: queryParams.category }).select('_id').lean();
            if (category) {
                catId = category._id;
                categorySlugCache.set(queryParams.category, catId);
            }
        }
        if (catId) {
            queryObj.category = catId;
        }
    }

    // Filter by specific IDs (e.g. for wishlist)
    if (queryParams.ids) {
        const idArray = queryParams.ids.split(',').filter(Boolean);
        if (idArray.length > 0) {
            queryObj._id = { $in: idArray };
        }
    }

    // Price Range — clamp to non-negative values to prevent nonsensical queries
    const minPrice = queryParams.minPrice !== undefined ? Number(queryParams.minPrice) : undefined;
    const maxPrice = queryParams.maxPrice !== undefined ? Number(queryParams.maxPrice) : undefined;
    if ((minPrice !== undefined && !isNaN(minPrice)) || (maxPrice !== undefined && !isNaN(maxPrice))) {
        queryObj.price = {};
        if (minPrice !== undefined && !isNaN(minPrice)) queryObj.price.$gte = Math.max(0, minPrice);
        if (maxPrice !== undefined && !isNaN(maxPrice)) queryObj.price.$lte = Math.max(0, maxPrice);
    }

    let query = Product.find(queryObj);

    // 2. Text Search — build a separate count filter that includes the text condition
    let countFilter = { ...queryObj };
    if (queryParams.search) {
        const textCondition = { $text: { $search: queryParams.search } };
        query = query.find(textCondition);
        countFilter = { ...countFilter, ...textCondition };
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

    // 4. Pagination — use standardized pagination service
    const { page, limit, skip } = parsePaginationParams(queryParams);

    query = query
        .skip(skip)
        .limit(limit)
        .select('name price images slug stock ratingsAverage ratingsCount isActive category brand description createdAt')
        .populate('category', 'name slug')
        .lean({ virtuals: false });

    // Execute query in parallel for performance
    const [products, totalCount] = await Promise.all([
        query,
        Product.countDocuments(countFilter)
    ]);

    const pagination = buildPaginationMeta(totalCount, page, limit);

    return { products, pagination };
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
 * Hard delete a product (permanently removes from database)
 * Admin-only operation
 * @param {String} id 
 * @returns {Promise<Object>}
 */
export const deleteProductService = async (id) => {
    const product = await Product.findByIdAndDelete(id);
    return product;
};
