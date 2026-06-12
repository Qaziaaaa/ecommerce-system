import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Shop from './Shop';

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(({ queryKey }) => {
    if ((globalThis as any).__testLoading) return { isLoading: true };
    if (queryKey[0] === 'categories') {
      return { data: (globalThis as any).__testCategories ?? [], isLoading: false };
    }
    return {
      data: { products: (globalThis as any).__testProducts ?? [], pagination: (globalThis as any).__testPagination ?? { totalPages: 1 } },
      isLoading: false,
      isPlaceholderData: false,
    };
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
    (globalThis as any).__testPagination = { totalPages: 3, currentPage: 1 };
    (globalThis as any).__testCategories = mockCategories;
    (globalThis as any).__testLoading = false;
    vi.clearAllMocks();
  });

  it('shows loading state', () => {
    (globalThis as any).__testLoading = true;
    renderShop();
    expect(screen.getByText(/Loading Collection/i)).toBeInTheDocument();
  });

  it('shows empty state when no products', () => {
    (globalThis as any).__testProducts = [];
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

  it('shows pagination when totalPages > 1', () => {
    renderShop();
    expect(screen.getByText('Showing Page 1 of 3')).toBeInTheDocument();
  });

  it('renders pagination page buttons', () => {
    renderShop();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('disables prev button on page 1', () => {
    const { container } = renderShop();
    const prevBtn = container.querySelector('button:has(svg.lucide-chevron-left)');
    expect(prevBtn).toBeDisabled();
  });

  it('disables next button on last page', () => {
    const { container } = renderShop('/shop?page=3');
    (globalThis as any).__testPagination = { totalPages: 3 };
    const nextBtn = container.querySelector('button:has(svg.lucide-chevron-right)');
    expect(nextBtn).toBeDisabled();
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
