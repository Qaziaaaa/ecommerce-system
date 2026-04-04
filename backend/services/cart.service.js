import User from '../models/User.js';
import Product from '../models/Product.js';

/**
 * Add an item to the user's cart or update its quantity if it already exists.
 */
export const addToCartService = async (userId, productId, quantity) => {
    // 1. Check if product exists and is active
    const product = await Product.findOne({ _id: productId, isActive: true });
    if (!product) {
        throw new Error('Product not found or inactive');
    }

    // 2. Check stock availability
    if (product.stock < quantity) {
        throw new Error(`Only ${product.stock} items left in stock`);
    }

    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    // 3. Check if product already in cart
    const cartItemIndex = user.cart.findIndex(
        (item) => item.product.toString() === productId
    );

    if (cartItemIndex > -1) {
        // Update quantity
        const newQuantity = user.cart[cartItemIndex].quantity + quantity;
        if (product.stock < newQuantity) {
            throw new Error(`Cannot add more. Only ${product.stock} items left in stock`);
        }
        user.cart[cartItemIndex].quantity = newQuantity;
    } else {
        // Add new item
        user.cart.push({ product: productId, quantity });
    }

    await user.save();
    return user.cart;
};

/**
 * Get the user's cart, populated with product details, and calculate total price
 */
export const getCartService = async (userId) => {
    // We populate the product details to get names, prices, and images
    const user = await User.findById(userId).populate({
        path: 'cart.product',
        select: 'name price discountPrice images stock isActive'
    });

    if (!user) throw new Error('User not found');

    // Filter out items where the product might have been deleted from DB
    // Calculate total price based on active products
    let totalPrice = 0;
    const validCartItems = user.cart.filter(item => {
        if (item.product && item.product.isActive) {
            const applicablePrice = item.product.discountPrice || item.product.price;
            totalPrice += applicablePrice * item.quantity;
            return true;
        }
        return false;
    });

    // If there were invalid items, we should ideally clean them up from the cart silently
    if (validCartItems.length !== user.cart.length) {
        user.cart = validCartItems;
        await user.save();
    }

    return {
        cartItems: validCartItems,
        totalPrice
    };
};

/**
 * Update the exact quantity of a specific cart item
 */
export const updateCartItemService = async (userId, productId, newQuantity) => {
    if (newQuantity <= 0) {
        throw new Error('Quantity must be greater than zero');
    }

    const product = await Product.findOne({ _id: productId, isActive: true });
    if (!product) throw new Error('Product not found or inactive');

    if (product.stock < newQuantity) {
        throw new Error(`Only ${product.stock} items left in stock`);
    }

    const user = await User.findById(userId);

    const cartItemIndex = user.cart.findIndex(
        (item) => item.product.toString() === productId
    );

    if (cartItemIndex === -1) {
        throw new Error('Item not found in cart');
    }

    user.cart[cartItemIndex].quantity = newQuantity;
    await user.save();

    return user.cart;
};

/**
 * Remove an item from the cart
 */
export const removeCartItemService = async (userId, productId) => {
    const user = await User.findById(userId);

    user.cart = user.cart.filter(
        (item) => item.product.toString() !== productId
    );

    await user.save();
    return user.cart;
};
