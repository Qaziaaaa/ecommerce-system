/**
 * Validator for Product Creation
 */
export const validateCreateProduct = (req, res, next) => {
    const { name, description, price, category } = req.body;

    // We can rely on Mongoose for detailed validation, but basic check here prevents unnecessary DB calls
    if (!name || !description || !price || !category) {
        return res.status(400).json({
            status: 'fail',
            message: 'Please provide name, description, price, and category'
        });
    }

    next();
};

/**
 * Validator for Product Update
 */
export const validateUpdateProduct = (req, res, next) => {
    // Only checking if body is empty
    if (Object.keys(req.body).length === 0) {
        return res.status(400).json({
            status: 'fail',
            message: 'Please provide fields to update'
        });
    }
    next();
};
