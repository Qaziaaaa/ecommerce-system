import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Shop from './Shop';

vi.mock('@tanstack/react-query', () => ({
  useInfiniteQuery: vi.fn(() => ({
    data: {
      pages: (globalThis as any).__testPages ?? [{ products: (globalThis as any).__testProducts ?? [], pagination: (globalThis as any).__testPagination ?? { totalPages: 1, totalItems: 3, currentPage: 1 } }],
    },
    fetchNextPage: vi.fn(),
    hasNextPage: (globalThis as any).__testHasMore ?? false,
    isFetchingNextPage: (globalThis as any).__testLoadingMore ?? false,
    isLoading: (globalThis as any).__testLoading ?? false,
    isFetching: false,
  })),
  useQuery: vi.fn(({ queryKey }) => {
    if (queryKey[0] === 'categories') {
      return { data: (globalThis as any).__testCategories ?? [] };
    }
    return { data: [], isLoading: false };
  }),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}));

vi.mock('../api/axios', () => ({
  default: { get: vi.fn() },
}));

vi.mock('../components/ProductCard', () => ({
  ProductCard: ({ product }: any) => product.name + ' - $' + product.price,
}));

const mockProducts = [
  { _id: 'p1', name: 'Leather Jacket', price: 299.99, images: ['/img1.jpg'], stock: 5, category: 'clothing' },
  { _id: 'p2', name: 'Canvas Tote', price: 89.99, images: ['/img2.jpg'], stock: 20, category: 'accessories' },
  { _id: 'p3', name: 'Wool Scarf', price: 49.99, images: ['/img3.jpg'], stock: 0, category: 'clothing' },
];

const mockCategories = [
  { _id: 'c1', name: 'Clothing', slug: 'clothing' },
  { _id: 'c2', name: 'Accessories', slug: 'accessories' },
];

const renderShop = (route = '/shop') =>
  render(
    <MemoryRouter initialEntries={[route]}>
      <Shop />
    </MemoryRouter>
  );

describe('Shop', () => {
  beforeEach(() => {
    (globalThis as any).__testProducts = mockProducts;
    (globalThis as any).__testPagination = { totalPages: 3, totalItems: 3, currentPage: 1, hasNext: true, hasPrev: false };
    (globalThis as any).__testPages = undefined;
    (globalThis as any).__testHasMore = true;
    (globalThis as any).__testLoadingMore = false;
    (globalThis as any).__testCategories = mockCategories;
    (globalThis as any).__testLoading = false;
    vi.clearAllMocks();
  });

  it('shows loading state', () => {
    (globalThis as any).__testLoading = true;
    (globalThis as any).__testProducts = [];
    renderShop();
    expect(screen.getByText(/Loading Collection/i)).toBeInTheDocument();
  });

  it('shows empty state when no products', () => {
    (globalThis as any).__testProducts = [];
    (globalThis as any).__testHasMore = false;
    renderShop();
    expect(screen.getByText(/No products found/i)).toBeInTheDocument();
    expect(screen.getByText('CLEAR ALL FILTERS')).toBeInTheDocument();
  });

  it('renders the page title', () => {
    renderShop();
    expect(screen.getByText('The Collection')).toBeInTheDocument();
  });

  it('renders product cards for each product', () => {
    const { container } = renderShop();
    expect(container.textContent).toContain('Leather Jacket - $299.99');
    expect(container.textContent).toContain('Canvas Tote - $89.99');
    expect(container.textContent).toContain('Wool Scarf - $49.99');
  });

  it('shows product count', () => {
    renderShop();
    expect(screen.getByText(/Showing 3 of 3 products/i)).toBeInTheDocument();
  });

  it('shows SHOW MORE button when more pages are available', () => {
    (globalThis as any).__testPagination = { totalPages: 3, totalItems: 9, currentPage: 1, hasNext: true, hasPrev: false };
    (globalThis as any).__testHasMore = true;
    renderShop();
    expect(screen.getByText('SHOW MORE')).toBeInTheDocument();
  });

  it('hides SHOW MORE button when no more pages', () => {
    (globalThis as any).__testHasMore = false;
    renderShop();
    expect(screen.queryByText('SHOW MORE')).not.toBeInTheDocument();
  });

  it('shows all loaded message when all products are displayed', () => {
    (globalThis as any).__testHasMore = false;
    renderShop();
    expect(screen.getByText(/All 3 products loaded/i)).toBeInTheDocument();
  });

  it('disables SHOW MORE button while loading next page', () => {
    (globalThis as any).__testPagination = { totalPages: 3, totalItems: 9, currentPage: 1, hasNext: true, hasPrev: false };
    (globalThis as any).__testHasMore = true;
    (globalThis as any).__testLoadingMore = true;
    renderShop();
    const btn = screen.getByText('LOADING...');
    expect(btn).toBeDisabled();
  });

  it('shows sort dropdown with default value', () => {
    renderShop();
    const sortSelect = screen.getByRole('combobox');
    expect(sortSelect).toHaveValue('newest');
  });

  it('shows category filter buttons when filters open', () => {
    renderShop();
    fireEvent.click(screen.getByText('ADVANCED FILTERS'));
    expect(screen.getByText('all')).toBeInTheDocument();
    expect(screen.getByText('clothing')).toBeInTheDocument();
    expect(screen.getByText('accessories')).toBeInTheDocument();
  });

  it('shows search input', () => {
    renderShop();
    expect(screen.getByPlaceholderText('SEARCH COLLECTION...')).toBeInTheDocument();
  });

  it('toggles advanced filters panel', () => {
    renderShop();
    fireEvent.click(screen.getByText('ADVANCED FILTERS'));
    expect(screen.getByText('CLOSE FILTERS')).toBeInTheDocument();
    expect(screen.getByText('RESTORE DEFAULTS')).toBeInTheDocument();
    expect(screen.getByText('CATEGORIES')).toBeInTheDocument();
    expect(screen.getByText('PRICE RANGE')).toBeInTheDocument();
  });

  it('shows price range inputs when filters open', () => {
    renderShop();
    fireEvent.click(screen.getByText('ADVANCED FILTERS'));
    expect(screen.getByPlaceholderText('MIN')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('MAX')).toBeInTheDocument();
  });

  it('shows quick price buttons', () => {
    renderShop();
    fireEvent.click(screen.getByText('ADVANCED FILTERS'));
    expect(screen.getByText('UNDER $50')).toBeInTheDocument();
    expect(screen.getByText('UNDER $100')).toBeInTheDocument();
    expect(screen.getByText('UNDER $500')).toBeInTheDocument();
  });
});
