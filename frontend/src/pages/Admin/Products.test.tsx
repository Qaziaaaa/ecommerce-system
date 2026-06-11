import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminProducts from './Products';

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(({ queryKey }: any) => {
    if (queryKey?.[0] === 'categories') return { data: (globalThis as any).__mockCategories ?? [] };
    return { data: (globalThis as any).__mockAdminProducts ?? [], isLoading: (globalThis as any).__mockProductsLoading ?? false };
  }),
  useMutation: vi.fn((opts: any) => ({
    mutate: (...args: any[]) => Promise.resolve(opts?.mutationFn?.(...args)).then(opts?.onSuccess).catch(opts?.onError),
    isPending: false,
    variables: null,
  })),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn(), cancelQueries: vi.fn(), getQueryData: vi.fn(), setQueryData: vi.fn() })),
}));

vi.mock('../../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(() => ({ data: {} })), patch: vi.fn(() => ({ data: {} })), delete: vi.fn(() => ({ data: {} })) },
}));

vi.mock('react-hot-toast', () => {
  const mock = { success: vi.fn(), error: vi.fn() };
  return { default: mock, ...mock };
});

vi.mock('../../components/SEOMeta', () => ({
  default: () => null,
}));

const mockProduct = {
  _id: 'p1',
  name: 'Test Jacket',
  price: 199.99,
  stock: 15,
  category: { _id: 'c1', name: 'Clothing' },
  images: ['/test.jpg'],
  isActive: true,
  description: 'A premium jacket',
};

const renderAdminProducts = () =>
  render(
    <MemoryRouter>
      <AdminProducts />
    </MemoryRouter>
  );

describe('AdminProducts', () => {
  beforeEach(() => {
    (globalThis as any).__mockAdminProducts = [];
    (globalThis as any).__mockCategories = [];
    (globalThis as any).__mockProductsLoading = false;
    vi.clearAllMocks();
  });

  it('renders inventory title', () => {
    renderAdminProducts();
    expect(screen.getByText('INVENTORY')).toBeInTheDocument();
    expect(screen.getByText('Add Product')).toBeInTheDocument();
  });

  it('renders search input', () => {
    renderAdminProducts();
    expect(screen.getByPlaceholderText('Search by name or category...')).toBeInTheDocument();
  });

  it('renders table headers', () => {
    renderAdminProducts();
    expect(screen.getByText('Product')).toBeInTheDocument();
    expect(screen.getByText('Category')).toBeInTheDocument();
    expect(screen.getByText('Price')).toBeInTheDocument();
    expect(screen.getByText('Stock')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();
  });

  it('renders product rows', () => {
    (globalThis as any).__mockAdminProducts = [mockProduct];
    renderAdminProducts();
    expect(screen.getByText('Test Jacket')).toBeInTheDocument();
    expect(screen.getByText('Clothing')).toBeInTheDocument();
    expect(screen.getByText('$199.99')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('filters products by search term', () => {
    (globalThis as any).__mockAdminProducts = [
      mockProduct,
      { ...mockProduct, _id: 'p2', name: 'Leather Boots', category: { _id: 'c2', name: 'Footwear' } },
    ];
    renderAdminProducts();
    const searchInput = screen.getByPlaceholderText('Search by name or category...');
    fireEvent.change(searchInput, { target: { value: 'boots' } });
    expect(screen.queryByText('Test Jacket')).not.toBeInTheDocument();
    expect(screen.getByText('Leather Boots')).toBeInTheDocument();
  });

  it('opens modal on Add Product click', () => {
    renderAdminProducts();
    fireEvent.click(screen.getByText('Add Product'));
    expect(screen.getByText('Add New Product')).toBeInTheDocument();
    expect(screen.getByText('Create Product')).toBeInTheDocument();
  });

  it('opens edit modal with product data', () => {
    (globalThis as any).__mockAdminProducts = [mockProduct];
    renderAdminProducts();
    const editBtns = screen.getAllByRole('button');
    const editBtn = editBtns.find(b => b.querySelector('svg.lucide-pen'));
    if (editBtn) fireEvent.click(editBtn);
    expect(screen.getByText('Edit Product')).toBeInTheDocument();
  });

  it('creates a product on form submit', async () => {
    (globalThis as any).__mockCategories = [{ _id: 'c1', name: 'Clothing' }];
    const toast = (await import('react-hot-toast')).default;
    renderAdminProducts();
    fireEvent.click(screen.getByText('Add Product'));
    const nameInput = document.querySelector('input[name="name"]') as HTMLInputElement;
    const catSelect = document.querySelector('select[name="category"]') as HTMLSelectElement;
    const priceInput = document.querySelector('input[name="price"]') as HTMLInputElement;
    const stockInput = document.querySelector('input[name="stock"]') as HTMLInputElement;
    const descInput = document.querySelector('textarea[name="description"]') as HTMLTextAreaElement;
    fireEvent.change(nameInput, { target: { value: 'New Product' } });
    fireEvent.change(catSelect, { target: { value: 'c1' } });
    fireEvent.change(priceInput, { target: { value: '49.99' } });
    fireEvent.change(stockInput, { target: { value: '10' } });
    fireEvent.change(descInput, { target: { value: 'A new product' } });
    const form = document.querySelector('form')!;
    fireEvent.submit(form);
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Product created successfully');
    });
  });

  it('shows close modal button', () => {
    renderAdminProducts();
    fireEvent.click(screen.getByText('Add Product'));
    const closeBtn = screen.getByText('Cancel');
    fireEvent.click(closeBtn);
    expect(screen.queryByText('Add New Product')).not.toBeInTheDocument();
  });

  it('shows delete confirmation', async () => {
    (globalThis as any).__mockAdminProducts = [mockProduct];
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const toast = (await import('react-hot-toast')).default;
    renderAdminProducts();
    const deleteBtns = screen.getAllByRole('button');
    const deleteBtn = deleteBtns.find(b => b.querySelector('svg.lucide-trash-2'));
    if (deleteBtn) fireEvent.click(deleteBtn);
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Product deleted successfully');
    });
  });
});
