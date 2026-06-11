import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Wishlist from './Wishlist';
import { useWishlistStore } from '../store/useWishlistStore';
import { useCartStore } from '../store/useCartStore';

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({
    data: (globalThis as any).__testWishlistProducts ?? [],
    isLoading: false,
  })),
}));

vi.mock('../api/axios', () => ({
  default: { get: vi.fn() },
}));

vi.mock('../components/LazyImage', () => ({
  default: ({ src, alt }: any) => <img src={src} alt={alt} />,
}));

vi.mock('../components/SEOMeta', () => ({
  default: () => null,
}));

const mockProduct = {
  _id: 'p1',
  name: 'Test Jacket',
  price: 199.99,
  images: ['/test.jpg'],
  stock: 5,
};

const renderWishlist = () =>
  render(
    <MemoryRouter>
      <Wishlist />
    </MemoryRouter>
  );

describe('Wishlist', () => {
  beforeEach(() => {
    useCartStore.setState({ cart: [], isCartOpen: false });
    useWishlistStore.setState({ items: [], isOpen: false });
    (globalThis as any).__testWishlistProducts = [];
    vi.clearAllMocks();
  });

  it('shows empty wishlist state', () => {
    renderWishlist();
    expect(screen.getByText('Your wishlist is empty.')).toBeInTheDocument();
    expect(screen.getByText('Browse Products')).toBeInTheDocument();
  });

  it('renders wishlist title', () => {
    useWishlistStore.setState({ items: ['p1'] });
    (globalThis as any).__testWishlistProducts = [mockProduct];
    renderWishlist();
    expect(screen.getByText('MY WISHLIST')).toBeInTheDocument();
  });

  it('renders product cards for wishlist items', () => {
    useWishlistStore.setState({ items: ['p1'] });
    (globalThis as any).__testWishlistProducts = [mockProduct];
    renderWishlist();
    expect(screen.getByText('Test Jacket')).toBeInTheDocument();
    expect(screen.getByText('$199.99')).toBeInTheDocument();
  });

  it('renders add to cart button for in-stock items', () => {
    useWishlistStore.setState({ items: ['p1'] });
    (globalThis as any).__testWishlistProducts = [mockProduct];
    renderWishlist();
    const btns = screen.getAllByRole('button');
    const addBtn = btns.find(b => b.textContent === 'Add to Cart');
    expect(addBtn).toBeInTheDocument();
    expect(addBtn).not.toBeDisabled();
  });

  it('shows out of stock for items with zero stock', () => {
    useWishlistStore.setState({ items: ['p2'] });
    (globalThis as any).__testWishlistProducts = [
      { ...mockProduct, _id: 'p2', stock: 0 },
    ];
    renderWishlist();
    const btn = screen.getByText('Out of Stock');
    expect(btn).toBeDisabled();
  });

  it('removes item from wishlist via toggle button', () => {
    useWishlistStore.setState({ items: ['p1'] });
    (globalThis as any).__testWishlistProducts = [mockProduct];
    const toggleSpy = vi.spyOn(useWishlistStore.getState(), 'toggleItem');
    renderWishlist();
    const removeBtn = screen.getByLabelText(/Remove Test Jacket from wishlist/);
    fireEvent.click(removeBtn);
    expect(toggleSpy).toHaveBeenCalledWith('p1');
  });

  it('adds item to cart', () => {
    useWishlistStore.setState({ items: ['p1'] });
    (globalThis as any).__testWishlistProducts = [mockProduct];
    const addSpy = vi.spyOn(useCartStore.getState(), 'addToCart');
    renderWishlist();
    const btns = screen.getAllByRole('button');
    const addBtn = btns.find(b => b.textContent === 'Add to Cart');
    fireEvent.click(addBtn!);
    expect(addSpy).toHaveBeenCalledWith(mockProduct);
  });

  it('links product name to product detail page', () => {
    useWishlistStore.setState({ items: ['p1'] });
    (globalThis as any).__testWishlistProducts = [mockProduct];
    renderWishlist();
    const link = screen.getByText('Test Jacket').closest('a');
    expect(link).toHaveAttribute('href', '/product/p1');
  });

  it('renders multiple wishlist products', () => {
    useWishlistStore.setState({ items: ['p1', 'p3'] });
    (globalThis as any).__testWishlistProducts = [
      mockProduct,
      { _id: 'p3', name: 'Leather Boots', price: 299.99, images: ['/b.jpg'], stock: 3 },
    ];
    renderWishlist();
    expect(screen.getByText('Test Jacket')).toBeInTheDocument();
    expect(screen.getByText('Leather Boots')).toBeInTheDocument();
    expect(screen.getAllByText('Add to Cart').length).toBe(2);
  });
});
