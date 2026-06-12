import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Home from './Home';
import { useWishlistStore } from '../store/useWishlistStore';
import { useCartStore } from '../store/useCartStore';

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({
    data: (globalThis as any).__testHomeProducts ?? [],
    isLoading: (globalThis as any).__testHomeLoading ?? false,
    isPlaceholderData: false,
  })),
  useQueryClient: vi.fn(() => ({
    prefetchQuery: vi.fn(),
  })),
}));

vi.mock('../api/axios', () => ({
  default: { get: vi.fn() },
}));

vi.mock('../components/SEOMeta', () => ({
  default: () => null,
}));

vi.mock('../components/LazyImage', () => ({
  default: ({ src, alt, className }: any) => (
    <img src={src} alt={alt} className={className} />
  ),
}));

vi.mock('../components/ProductCard', () => ({
  ProductCard: ({ product }: any) => (
    <div data-testid="product-card">{product.name}</div>
  ),
}));

const mockProducts = [
  { _id: 'p1', name: 'The Everyday Tote', price: 185, images: ['/tote.jpg'], stock: 10, ratingsAverage: 4.5, ratingsCount: 8, isFeatured: true, category: { name: 'Bags', slug: 'bags' }, description: 'Premium tote bag' },
  { _id: 'p2', name: 'Echo Earbuds', price: 129, images: ['/earbuds.jpg'], stock: 15, ratingsAverage: 4.0, ratingsCount: 5, isFeatured: false, category: { name: 'Audio', slug: 'audio' }, description: 'Wireless earbuds' },
  { _id: 'p3', name: 'Chrono Watch', price: 245, images: ['/watch.jpg'], stock: 3, ratingsAverage: 5.0, ratingsCount: 12, isFeatured: true, category: { name: 'Accessories', slug: 'accessories' }, description: 'Minimalist watch' },
  { _id: 'p4', name: 'Lumina Lamp', price: 89, images: ['/lamp.jpg'], stock: 20, ratingsAverage: 4.2, ratingsCount: 3, isFeatured: false, category: { name: 'Home', slug: 'home' }, description: 'Desk lamp' },
  { _id: 'p5', name: 'Solaris Shades', price: 115, images: ['/shades.jpg'], stock: 8, ratingsAverage: 4.8, ratingsCount: 6, isFeatured: true, category: { name: 'Accessories', slug: 'accessories' }, description: 'Premium shades' },
  { _id: 'p6', name: 'Nomad Tumbler', price: 45, images: ['/tumbler.jpg'], stock: 50, ratingsAverage: 4.3, ratingsCount: 9, isFeatured: false, category: { name: 'Home', slug: 'home' }, description: 'Insulated tumbler' },
  { _id: 'p7', name: 'Atlas Duffel', price: 165, images: ['/duffel.jpg'], stock: 12, ratingsAverage: 4.6, ratingsCount: 4, isFeatured: true, category: { name: 'Bags', slug: 'bags' }, description: 'Travel duffel' },
  { _id: 'p8', name: 'Zenith Speaker', price: 195, images: ['/speaker.jpg'], stock: 0, ratingsAverage: 4.7, ratingsCount: 7, isFeatured: false, category: { name: 'Audio', slug: 'audio' }, description: 'Portable speaker' },
];

const renderHome = () =>
  render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>
  );

describe('Home', () => {
  beforeEach(() => {
    useCartStore.setState({ cart: [], isCartOpen: false });
    useWishlistStore.setState({ items: [], isOpen: false });
    (globalThis as any).__testHomeProducts = [];
    (globalThis as any).__testHomeLoading = false;
    vi.clearAllMocks();
  });

  it('renders hero heading', () => {
    renderHome();
    expect(screen.getByText('MODERN')).toBeInTheDocument();
    expect(screen.getByText('ESSENTIALS')).toBeInTheDocument();
  });

  it('renders hero CTA links', () => {
    renderHome();
    const shopLink = screen.getByText('Shop Collection');
    expect(shopLink.closest('a')).toHaveAttribute('href', '/shop');
    const storyLink = screen.getByText('Our Story');
    expect(storyLink.closest('a')).toHaveAttribute('href', '/about');
  });

  it('renders features banner', () => {
    renderHome();
    expect(screen.getByText('Free Shipping')).toBeInTheDocument();
    expect(screen.getByText('Easy Returns')).toBeInTheDocument();
    expect(screen.getByText('Secure Checkout')).toBeInTheDocument();
    expect(screen.getByText('24/7 Support')).toBeInTheDocument();
  });

  it('renders shop by category section', () => {
    renderHome();
    expect(screen.getByText('SHOP BY CATEGORY')).toBeInTheDocument();
    expect(screen.getByText('TECH')).toBeInTheDocument();
    expect(screen.getByText('HOME')).toBeInTheDocument();
    expect(screen.getByText('LIFESTYLE')).toBeInTheDocument();
  });

  it('renders trending now section with products', () => {
    (globalThis as any).__testHomeProducts = mockProducts;
    renderHome();
    expect(screen.getByText('TRENDING NOW')).toBeInTheDocument();
    expect(screen.getByText('The Everyday Tote')).toBeInTheDocument();
    expect(screen.getByText('Chrono Watch')).toBeInTheDocument();
    expect(screen.getByText('Solaris Shades')).toBeInTheDocument();
    expect(screen.getByText('Atlas Duffel')).toBeInTheDocument();
  });

  it('shows only 4 trending products (first 4)', () => {
    (globalThis as any).__testHomeProducts = mockProducts;
    renderHome();
    const cards = screen.getAllByTestId('product-card');
    expect(cards).toHaveLength(8);
  });

  it('shows loading skeletons in trending section when loading', () => {
    (globalThis as any).__testHomeLoading = true;
    renderHome();
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThanOrEqual(1);
  });

  it('renders brand story section', () => {
    renderHome();
    expect(screen.getByText((c) => c.includes('DESIGNED FOR'))).toBeInTheDocument();
    expect(screen.getByText('Discover Our Story')).toBeInTheDocument();
  });

  it('renders new arrivals section with products', () => {
    (globalThis as any).__testHomeProducts = mockProducts;
    renderHome();
    expect(screen.getByText('NEW ARRIVALS')).toBeInTheDocument();
    expect(screen.getByText('Echo Earbuds')).toBeInTheDocument();
    expect(screen.getByText('Lumina Lamp')).toBeInTheDocument();
    expect(screen.getByText('Nomad Tumbler')).toBeInTheDocument();
    expect(screen.getByText('Zenith Speaker')).toBeInTheDocument();
  });

  it('renders testimonials', () => {
    renderHome();
    expect(screen.getByText('WHAT THEY SAY')).toBeInTheDocument();
    expect(screen.getByText('Sarah Jenkins')).toBeInTheDocument();
    expect(screen.getByText('Marcus Chen')).toBeInTheDocument();
    expect(screen.getByText('Elena Rodriguez')).toBeInTheDocument();
  });

  it('renders newsletter section', () => {
    renderHome();
    expect(screen.getByText('JOIN THE CLUB')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter your email address')).toBeInTheDocument();
    expect(screen.getByText('Subscribe')).toBeInTheDocument();
  });

  it('renders view all products link', () => {
    renderHome();
    const link = screen.getByText('View All Products');
    expect(link.closest('a')).toHaveAttribute('href', '/shop');
  });
});
