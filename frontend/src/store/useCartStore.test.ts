import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCartStore, useCart } from './useCartStore';

const mockProduct = {
    _id: 'abc123',
    id: 1,
    name: 'Test Product',
    description: 'A test product',
    price: 49.99,
    category: 'Clothing',
    images: ['/test.jpg'],
    stock: 10,
};

const mockProduct2 = {
    _id: 'xyz789',
    id: 2,
    name: 'Second Product',
    description: 'Another test product',
    price: 99.99,
    category: 'Shoes',
    images: ['/test2.jpg'],
    stock: 5,
};

beforeEach(() => {
    useCartStore.setState({ cart: [], isCartOpen: false });
    localStorage.clear();
});

describe('useCartStore', () => {
    it('should initialize with empty cart and closed drawer', () => {
        const state = useCartStore.getState();
        expect(state.cart).toEqual([]);
        expect(state.isCartOpen).toBe(false);
    });

    it('should add a new item to cart', () => {
        useCartStore.getState().addToCart(mockProduct);
        const state = useCartStore.getState();
        expect(state.cart).toHaveLength(1);
        expect(state.cart[0].name).toBe('Test Product');
        expect(state.cart[0].quantity).toBe(1);
        expect(state.isCartOpen).toBe(true);
    });

    it('should increment quantity when adding an existing item', () => {
        useCartStore.getState().addToCart(mockProduct);
        useCartStore.getState().addToCart(mockProduct, 2);
        const state = useCartStore.getState();
        expect(state.cart).toHaveLength(1);
        expect(state.cart[0].quantity).toBe(3);
    });

    it('should add different items separately', () => {
        useCartStore.getState().addToCart(mockProduct);
        useCartStore.getState().addToCart(mockProduct2);
        const state = useCartStore.getState();
        expect(state.cart).toHaveLength(2);
    });

    it('should update quantity with positive delta', () => {
        useCartStore.getState().addToCart(mockProduct);
        useCartStore.getState().addToCart(mockProduct, 1);
        useCartStore.getState().updateQuantity('abc123', 2);
        const state = useCartStore.getState();
        expect(state.cart[0].quantity).toBe(4);
    });

    it('should remove item when quantity reaches zero via updateQuantity', () => {
        useCartStore.getState().addToCart(mockProduct, 1);
        useCartStore.getState().updateQuantity('abc123', -1);
        const state = useCartStore.getState();
        expect(state.cart).toHaveLength(0);
    });

    it('should remove item from cart', () => {
        useCartStore.getState().addToCart(mockProduct);
        useCartStore.getState().addToCart(mockProduct2);
        useCartStore.getState().removeFromCart('abc123');
        const state = useCartStore.getState();
        expect(state.cart).toHaveLength(1);
        expect(state.cart[0]._id).toBe('xyz789');
    });

    it('should clear the cart', () => {
        useCartStore.getState().addToCart(mockProduct);
        useCartStore.getState().clearCart();
        const state = useCartStore.getState();
        expect(state.cart).toEqual([]);
    });

    it('should toggle cart drawer', () => {
        useCartStore.getState().setIsCartOpen(true);
        expect(useCartStore.getState().isCartOpen).toBe(true);
        useCartStore.getState().setIsCartOpen(false);
        expect(useCartStore.getState().isCartOpen).toBe(false);
    });

    it('should addToCart open cart drawer', () => {
        expect(useCartStore.getState().isCartOpen).toBe(false);
        useCartStore.getState().addToCart(mockProduct);
        expect(useCartStore.getState().isCartOpen).toBe(true);
    });
});

describe('useCart helper', () => {
    it('should compute cartTotal correctly', () => {
        useCartStore.setState({
            cart: [
                { ...mockProduct, quantity: 2 },
                { ...mockProduct2, quantity: 1 },
            ],
            isCartOpen: false,
        });
        const { result } = renderHook(() => useCart());
        expect(result.current.cartTotal).toBeCloseTo(49.99 * 2 + 99.99 * 1);
        expect(result.current.cartCount).toBe(3);
    });

    it('should return 0 for empty cart', () => {
        const { result } = renderHook(() => useCart());
        expect(result.current.cartTotal).toBe(0);
        expect(result.current.cartCount).toBe(0);
    });
});
