import * as cartService from '../services/cart.service.js';

export const addToCart = async (req, res, next) => {
    try {
        const { productId, quantity } = req.body;

        if (!productId || !quantity || quantity < 1 || quantity > 99) {
            return res.status(400).json({
                status: 'fail',
                message: 'Please provide a valid productId and quantity (1-99)'
            });
        }

        const cart = await cartService.addToCartService(req.user._id, productId, quantity);

        res.status(200).json({
            status: 'success',
            message: 'Item added to cart',
            data: { cart }
        });
    } catch (error) {
        next(error);
    }
};

export const getCart = async (req, res, next) => {
    try {
        const cartData = await cartService.getCartService(req.user._id);

        res.status(200).json({
            status: 'success',
            data: cartData
        });
    } catch (error) {
        next(error);
    }
};

export const updateCartItem = async (req, res, next) => {
    try {
        const { productId } = req.params;
        const { quantity } = req.body;

        if (!quantity || quantity < 1 || quantity > 99) {
            return res.status(400).json({
                status: 'fail',
                message: 'Please provide a valid quantity (1-99)'
            });
        }

        const cart = await cartService.updateCartItemService(req.user._id, productId, quantity);

        res.status(200).json({
            status: 'success',
            message: 'Cart item updated',
            data: { cart }
        });
    } catch (error) {
        next(error);
    }
};

export const removeCartItem = async (req, res, next) => {
    try {
        const { productId } = req.params;

        const cart = await cartService.removeCartItemService(req.user._id, productId);

        res.status(200).json({
            status: 'success',
            message: 'Item removed from cart',
            data: { cart }
        });
    } catch (error) {
        next(error);
    }
};

export const syncCart = async (req, res, next) => {
    try {
        const { items } = req.body;

        if (!items || !Array.isArray(items)) {
            return res.status(400).json({
                status: 'fail',
                message: 'Please provide an items array'
            });
        }

        const cart = await cartService.syncCartService(req.user._id, items);

        res.status(200).json({
            status: 'success',
            message: 'Cart synced',
            data: { cart }
        });
    } catch (error) {
        next(error);
    }
};
