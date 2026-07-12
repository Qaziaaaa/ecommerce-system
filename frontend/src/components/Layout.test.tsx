import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Layout from './Layout';
import { useCartStore } from '../store/useCartStore';
import { useAuthStore } from '../store/useAuthStore';
import { useWishlistStore } from '../store/useWishlistStore';

vi.mock('@tanstack/react-query', () => ({
    useQuery: vi.fn().mockReturnValue({ data: [] }),
}));

vi.mock('../api/axios', () => ({
    default: { get: vi.fn().mockResolvedValue({ data: {} }) },
}));

const renderLayout = () =>
    render(
        <MemoryRouter>
            <Layout />
        </MemoryRouter>
    );

describe('Layout', () => {
    beforeEach(() => {
        useCartStore.setState({ cart: [], isCartOpen: false });
        useAuthStore.setState({ user: null, isAuthenticated: false });
        useWishlistStore.setState({ items: [], isOpen: false });
    });

    describe('Header', () => {
        it('renders brand links to home', () => {
            renderLayout();
            const novaLinks = screen.getAllByRole('link', { name: /nova/i });
            expect(novaLinks.length).toBeGreaterThanOrEqual(1);
            novaLinks.forEach(l => expect(l).toHaveAttribute('href', '/'));
        });

        it('renders desktop navigation links', () => {
            renderLayout();
            const aboutLinks = screen.getAllByRole('link', { name: 'About Us' });
            expect(aboutLinks.length).toBeGreaterThanOrEqual(1);
            expect(screen.getByRole('link', { name: 'Contact' })).toBeInTheDocument();
            expect(screen.getByText('Shop')).toBeInTheDocument();
        });

        it('renders skip to content link', () => {
            renderLayout();
            expect(screen.getByText('Skip to content')).toBeInTheDocument();
        });

        it('renders search input with placeholder and aria-label', () => {
            renderLayout();
            expect(screen.getByPlaceholderText('SEARCH')).toBeInTheDocument();
            expect(screen.getByLabelText('Search products')).toBeInTheDocument();
        });

        it('renders wishlist link with aria-label', () => {
            renderLayout();
            expect(screen.getByLabelText('Wishlist')).toBeInTheDocument();
        });

        it('shows wishlist badge count when items present', () => {
            useWishlistStore.setState({ items: ['p1', 'p2', 'p3'] });
            renderLayout();
            expect(screen.getByText('3')).toBeInTheDocument();
        });

        it('shows cart button with item count', () => {
            useCartStore.setState({
                cart: [{ _id: 'p1', id: 1, name: 'Test', price: 10, quantity: 2, description: '', category: '', images: [], stock: 0 }],
            });
            renderLayout();
            expect(screen.getByText(/cart \(2\)/i)).toBeInTheDocument();
        });

        it('opens cart drawer when cart button clicked', () => {
            renderLayout();
            fireEvent.click(screen.getByText(/cart \(0\)/i));
            expect(screen.getByRole('dialog', { name: /shopping cart/i })).toBeInTheDocument();
            expect(useCartStore.getState().isCartOpen).toBe(true);
        });

        it('opens mobile menu on hamburger click', () => {
            renderLayout();
            fireEvent.click(screen.getByRole('button', { name: /open menu/i }));
            expect(screen.getByRole('dialog', { name: /navigation menu/i })).toBeInTheDocument();
            expect(screen.getByText('HOME')).toBeInTheDocument();
            expect(screen.getByText('SHOP COLLECTION')).toBeInTheDocument();
        });
    });

    describe('Cart drawer', () => {
        it('shows empty cart message when no items', () => {
            useCartStore.setState({ isCartOpen: true, cart: [] });
            renderLayout();
            expect(screen.getByText(/your cart is empty/i)).toBeInTheDocument();
            expect(screen.getByText(/continue shopping/i)).toBeInTheDocument();
        });

        it('displays cart items with name and quantity', () => {
            useCartStore.setState({
                isCartOpen: true,
                cart: [{ _id: 'p1', id: 1, name: 'Leather Jacket', price: 299.99, quantity: 1, images: ['/test.jpg'], description: '', category: '', stock: 0 }],
            });
            renderLayout();
            expect(screen.getByText('Leather Jacket')).toBeInTheDocument();
            const qtySpans = screen.getAllByText('1');
            expect(qtySpans.length).toBeGreaterThanOrEqual(1);
            const prices = screen.getAllByText('$299.99');
            expect(prices.length).toBeGreaterThanOrEqual(1);
        });

        it('shows subtotal and proceed to checkout', () => {
            useCartStore.setState({
                isCartOpen: true,
                cart: [
                    { _id: 'p1', id: 1, name: 'Item A', price: 50, quantity: 2, images: [], description: '', category: '', stock: 0 },
                    { _id: 'p2', id: 2, name: 'Item B', price: 25, quantity: 1, images: [], description: '', category: '', stock: 0 },
                ],
            });
            renderLayout();
            expect(screen.getByText(/proceed to checkout/i)).toBeInTheDocument();
            const subtotalPrices = screen.getAllByText('$125.00');
            expect(subtotalPrices.length).toBeGreaterThanOrEqual(1);
        });
    });

    describe('Authentication', () => {
        it('shows sign in link when not authenticated', () => {
            renderLayout();
            const signInLinks = screen.getAllByRole('link', { name: /sign in/i });
            expect(signInLinks.length).toBe(2);
            expect(signInLinks[0]).toHaveAttribute('href', '/login');
        });

        it('shows user name when authenticated', () => {
            useAuthStore.setState({
                user: { _id: 'u1', name: 'Jane Doe', email: 'jane@test.com', role: 'user' },
                isAuthenticated: true,
            });
            renderLayout();
            expect(screen.getByText('Jane Doe')).toBeInTheDocument();
        });

        it('shows admin portal link for admin users', () => {
            useAuthStore.setState({
                user: { _id: 'u1', name: 'Admin', email: 'admin@test.com', role: 'admin' },
                isAuthenticated: true,
            });
            renderLayout();
            const adminLinks = screen.getAllByRole('link', { name: /admin portal/i });
            expect(adminLinks.length).toBe(2);
            adminLinks.forEach(l => expect(l).toHaveAttribute('href', '/admin'));
        });
    });

    describe('Footer', () => {
        it('renders newsletter input and join button', () => {
            renderLayout();
            expect(screen.getByPlaceholderText(/email address/i)).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /join newsletter/i })).toBeInTheDocument();
        });

        it('renders social media links', () => {
            renderLayout();
            expect(screen.getByLabelText('Facebook')).toBeInTheDocument();
            expect(screen.getByLabelText('Twitter')).toBeInTheDocument();
            expect(screen.getByLabelText('Instagram')).toBeInTheDocument();
            expect(screen.getByLabelText('LinkedIn')).toBeInTheDocument();
        });

        it('renders footer accordion sections', () => {
            renderLayout();
            expect(screen.getByText('Company Info')).toBeInTheDocument();
            expect(screen.getByText('Quick Links')).toBeInTheDocument();
            expect(screen.getByText('Legal')).toBeInTheDocument();
        });
    });
});
