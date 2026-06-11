import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProductDetail from './ProductDetail';
import { useCartStore } from '../store/useCartStore';
import { useAuthStore } from '../store/useAuthStore';
import { useWishlistStore } from '../store/useWishlistStore';
import axiosInstance from '../api/axios';

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(({ queryKey }) => {
    if ((globalThis as any).__testLoading) return { isLoading: true };
    return {
      data: queryKey?.[0] === 'reviews' ? (globalThis as any).__testReviews ?? [] : (globalThis as any).__testProduct ?? null,
      isLoading: false,
    };
  }),
  useMutation: vi.fn((opts) => ({
    mutate: (...args) => opts?.mutationFn?.(...args)?.then?.(opts?.onSuccess)?.catch?.(opts?.onError),
    isPending: false,
    data: null,
  })),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}));

vi.mock('../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

vi.mock('react-hot-toast', () => {
  const mock = { success: vi.fn(), error: vi.fn() };
  return { default: mock, ...mock };
});

const mockProduct = {
  _id: 'p1',
  name: 'Test Leather Jacket',
  description: 'A premium leather jacket',
  price: 299.99,
  images: ['/img1.jpg', '/img2.jpg'],
  stock: 10,
  ratingsAverage: 4.5,
  ratingsCount: 12,
  category: { _id: 'c1', name: 'Clothing', slug: 'clothing' },
  brand: 'Nova',
};

const renderDetail = (route = '/product/p1') =>
  render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="/product/:id" element={<ProductDetail />} />
      </Routes>
    </MemoryRouter>
  );

describe('ProductDetail', () => {
  beforeEach(() => {
    useCartStore.setState({ cart: [], isCartOpen: false });
    useAuthStore.setState({ user: null, isAuthenticated: false });
    useWishlistStore.setState({ items: [], isOpen: false });
    (globalThis as any).__testProduct = mockProduct;
    (globalThis as any).__testReviews = [];
    (globalThis as any).__testLoading = false;
    vi.clearAllMocks();
  });

  it('shows loading state', () => {
    (globalThis as any).__testLoading = true;
    renderDetail();
    expect(screen.getByText(/Loading Product/i)).toBeInTheDocument();
  });

  it('shows product not found', async () => {
    (globalThis as any).__testProduct = null;
    renderDetail();
    expect(await screen.findByText('Product Not Found')).toBeInTheDocument();
  });

  it('renders product details', async () => {
    renderDetail();
    expect(await screen.findByRole('heading', { name: /Test Leather Jacket/i })).toBeInTheDocument();
    expect(screen.getByText('A premium leather jacket')).toBeInTheDocument();
    expect(screen.getByText('$299.99')).toBeInTheDocument();
    expect(screen.getAllByText('Clothing')).toHaveLength(2);
  });

  it('shows rating and reviews count', async () => {
    renderDetail();
    await screen.findByRole('heading', { name: /Test Leather Jacket/i });
    expect(screen.getByText('4.5')).toBeInTheDocument();
    expect(screen.getByText('(12 reviews)')).toBeInTheDocument();
  });

  it('shows SKU', async () => {
    renderDetail();
    await screen.findByRole('heading', { name: /Test Leather Jacket/i });
    expect(screen.getByText('NOVA-P1')).toBeInTheDocument();
  });

  it('shows low stock warning', async () => {
    renderDetail();
    await screen.findByRole('heading', { name: /Test Leather Jacket/i });
    expect(screen.getByText(/Only 10 left/i)).toBeInTheDocument();
  });

  it('shows out of stock when stock is 0', async () => {
    (globalThis as any).__testProduct = { ...mockProduct, stock: 0 };
    renderDetail();
    await screen.findByRole('heading', { name: /Test Leather Jacket/i });
    expect(screen.getAllByText('Out of Stock')).toHaveLength(2);
  });

  it('adds to cart', async () => {
    renderDetail();
    await screen.findByRole('heading', { name: /Test Leather Jacket/i });
    fireEvent.click(screen.getByText('Add to Cart'));

    const state = useCartStore.getState();
    expect(state.cart).toHaveLength(1);
    expect(state.cart[0].name).toBe('Test Leather Jacket');
    expect(state.cart[0].quantity).toBe(1);
  });

  it('increases and decreases quantity', async () => {
    renderDetail();
    await screen.findByRole('heading', { name: /Test Leather Jacket/i });

    const qtySpan = screen.getByText('1');
    const plusBtn = qtySpan.nextElementSibling!;

    fireEvent.click(plusBtn);
    expect(screen.getByText('2')).toBeInTheDocument();

    const minusBtn = qtySpan.previousElementSibling!;
    fireEvent.click(minusBtn);
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('toggles wishlist', async () => {
    renderDetail();
    await screen.findByRole('heading', { name: /Test Leather Jacket/i });

    const wishlistBtn = screen.getByLabelText(/Add.*Test Leather Jacket.*to wishlist/i);
    fireEvent.click(wishlistBtn);
    expect(useWishlistStore.getState().items).toContain('p1');

    const removeBtn = screen.getByLabelText(/Remove.*Test Leather Jacket.*from wishlist/i);
    fireEvent.click(removeBtn);
    expect(useWishlistStore.getState().items).not.toContain('p1');
  });

  it('shows review form when authenticated', async () => {
    useAuthStore.setState({ user: { _id: 'u1', name: 'Jane', email: 'j@b.com', role: 'user' }, isAuthenticated: true });
    renderDetail();
    expect(await screen.findByText('Review this Product')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('What did you think about this product?')).toBeInTheDocument();
  });

  it('shows sign in prompt when not authenticated', async () => {
    renderDetail();
    expect(await screen.findByText(/Log in to review/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign In' })).toHaveAttribute('href', '/login');
  });

  it('submits a review', async () => {
    useAuthStore.setState({ user: { _id: 'u1', name: 'Jane', email: 'j@b.com', role: 'user' }, isAuthenticated: true });
    renderDetail();

    await screen.findByRole('heading', { name: /Test Leather Jacket/i });
    fireEvent.change(screen.getByPlaceholderText('What did you think about this product?'), {
      target: { value: 'Great jacket!' },
    });

    (axiosInstance.post as any).mockResolvedValue({ data: {} });
    fireEvent.click(screen.getByText('Submit Review'));

    await waitFor(() => {
      expect(axiosInstance.post).toHaveBeenCalledWith('/products/p1/reviews', {
        rating: 5,
        comment: 'Great jacket!',
      });
    });
  });

  it('shows empty reviews state', async () => {
    renderDetail();
    await screen.findByRole('heading', { name: /Test Leather Jacket/i });
    expect(screen.getByText(/No reviews yet/i)).toBeInTheDocument();
  });

  it('shows breadcrumb navigation', () => {
    renderDetail();
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Shop' })).toHaveAttribute('href', '/shop');
    expect(screen.getByRole('link', { name: 'Clothing' })).toHaveAttribute('href', '/shop?category=Clothing');
  });

  it('renders image thumbnails', () => {
    renderDetail();
    expect(screen.getByAltText('Test Leather Jacket view 1')).toBeInTheDocument();
    expect(screen.getByAltText('Test Leather Jacket view 2')).toBeInTheDocument();
  });
});
