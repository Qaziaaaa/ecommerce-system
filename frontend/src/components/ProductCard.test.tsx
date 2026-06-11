import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ProductCard } from './ProductCard';
import * as useCartStoreModule from '../store/useCartStore';
import * as useWishlistStoreModule from '../store/useWishlistStore';

const mockProduct = {
    _id: 'prod-1',
    id: 1,
    name: 'Test Leather Jacket',
    description: 'A premium leather jacket',
    price: 299.99,
    images: ['/test.jpg'],
    stock: 10,
    ratingsAverage: 4.5,
    ratingsCount: 12,
    isFeatured: true,
    category: { _id: 'c1', name: 'Clothing', slug: 'clothing' },
    brand: 'Nova',
};

const renderCard = (product = mockProduct, searchQuery?: string) =>
    render(
        <BrowserRouter>
            <ProductCard product={product} searchQuery={searchQuery} />
        </BrowserRouter>
    );

describe('ProductCard', () => {
    beforeEach(() => {
        useCartStoreModule.useCartStore.setState({ cart: [], isCartOpen: false });
        useWishlistStoreModule.useWishlistStore.setState({ items: [], isOpen: false });
    });

    it('should render product name and price', () => {
        renderCard();
        expect(screen.getByText('Test Leather Jacket')).toBeInTheDocument();
        expect(screen.getByText('$299.99')).toBeInTheDocument();
    });

    it('should render BEST SELLER tag for featured products', () => {
        renderCard();
        expect(screen.getByText('BEST SELLER')).toBeInTheDocument();
    });

    it('should render ESSENTIAL tag for non-featured products', () => {
        renderCard({ ...mockProduct, isFeatured: false });
        expect(screen.getByText('ESSENTIAL')).toBeInTheDocument();
    });

    it('should show rating', () => {
        renderCard();
        expect(screen.getByText('4.5')).toBeInTheDocument();
    });

    it('should show "Only X left" when stock <= 10', () => {
        renderCard({ ...mockProduct, stock: 3 });
        expect(screen.getByText(/only 3 left/i)).toBeInTheDocument();
    });

    it('should show "Out of Stock" when stock is 0', () => {
        renderCard({ ...mockProduct, stock: 0 });
        expect(screen.getAllByText('Out of Stock')[0]).toBeInTheDocument();
    });

    it('should disable add to cart button when out of stock', () => {
        renderCard({ ...mockProduct, stock: 0 });
        const btn = screen.getByRole('button', { name: /add.*test leather jacket.*to cart/i });
        expect(btn).toBeDisabled();
    });

    it('should have wishlist toggle button', () => {
        renderCard();
        const wishlistBtn = screen.getByRole('button', { name: /add.*test leather jacket.*to wishlist/i });
        expect(wishlistBtn).toBeInTheDocument();
    });

    it('should show filled heart when wishlisted', () => {
        useWishlistStoreModule.useWishlistStore.setState({ items: ['prod-1'] });
        renderCard();
        const wishlistBtn = screen.getByRole('button', { name: /remove.*test leather jacket.*from wishlist/i });
        expect(wishlistBtn).toBeInTheDocument();
    });

    it('should toggle wishlist on heart click', () => {
        renderCard();
        const wishlistBtn = screen.getByRole('button', { name: /add.*test leather jacket.*to wishlist/i });
        fireEvent.click(wishlistBtn);
        expect(useWishlistStoreModule.useWishlistStore.getState().items).toEqual(['prod-1']);
    });

    it('should add to cart on "Add to Cart" click', () => {
        renderCard();
        const addBtn = screen.getByRole('button', { name: /add.*test leather jacket.*to cart/i });
        fireEvent.click(addBtn);
        const cart = useCartStoreModule.useCartStore.getState().cart;
        expect(cart).toHaveLength(1);
        expect(cart[0]._id).toBe('prod-1');
    });

    it('should link to product detail page', () => {
        renderCard();
        const links = screen.getAllByRole('link');
        const productLink = links.find(l => l.getAttribute('href') === '/product/prod-1');
        expect(productLink).toBeInTheDocument();
    });
});
