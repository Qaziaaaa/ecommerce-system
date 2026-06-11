import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminOrders from './Orders';

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({
    data: (globalThis as any).__mockOrders ?? [],
    isLoading: (globalThis as any).__mockOrdersLoading ?? false,
  })),
  useMutation: vi.fn((opts: any) => ({
    mutate: (...args: any[]) => Promise.resolve(opts?.mutationFn?.(...args)).then(opts?.onSuccess).catch(opts?.onError),
    isPending: false,
  })),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}));

vi.mock('../../api/axios', () => ({
  default: { get: vi.fn(), patch: vi.fn(() => ({ data: {} })) },
}));

vi.mock('react-hot-toast', () => {
  const mock = { success: vi.fn(), error: vi.fn() };
  return { default: mock, ...mock };
});

vi.mock('../../components/SEOMeta', () => ({
  default: () => null,
}));

const mockOrder = {
  _id: 'ord1',
  orderStatus: 'pending',
  paymentStatus: 'paid',
  totalAmount: 149.98,
  createdAt: '2025-01-15T10:00:00Z',
  user: { _id: 'u1', name: 'Jane Doe', email: 'jane@test.com' },
};

const renderAdminOrders = () =>
  render(
    <MemoryRouter>
      <AdminOrders />
    </MemoryRouter>
  );

describe('AdminOrders', () => {
  beforeEach(() => {
    (globalThis as any).__mockOrders = [];
    (globalThis as any).__mockOrdersLoading = false;
    vi.clearAllMocks();
  });

  it('shows loading state', () => {
    (globalThis as any).__mockOrdersLoading = true;
    renderAdminOrders();
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders orders header', () => {
    renderAdminOrders();
    expect(screen.getByText('Orders')).toBeInTheDocument();
    expect(screen.getByText('0 total orders')).toBeInTheDocument();
  });

  it('shows empty state', () => {
    renderAdminOrders();
    expect(screen.getByText('No orders yet.')).toBeInTheDocument();
  });

  it('renders order rows', () => {
    (globalThis as any).__mockOrders = [mockOrder];
    renderAdminOrders();
    expect(screen.getAllByText('Jane Doe').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('jane@test.com').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('$149.98').length).toBeGreaterThanOrEqual(1);
  });

  it('shows correct order count', () => {
    (globalThis as any).__mockOrders = [mockOrder];
    renderAdminOrders();
    expect(screen.getByText('1 total order')).toBeInTheDocument();
  });

  it('updates order status via select', async () => {
    (globalThis as any).__mockOrders = [mockOrder];
    const toast = (await import('react-hot-toast')).default;
    renderAdminOrders();
    const selects = screen.getAllByRole('combobox');
    expect(selects.length).toBeGreaterThanOrEqual(1);
    fireEvent.change(selects[0], { target: { value: 'shipped' } });
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Order status updated');
    });
  });

  it('shows error on status update failure', async () => {
    (globalThis as any).__mockOrders = [mockOrder];
    const toast = (await import('react-hot-toast')).default;
    vi.mocked(vi.fn()).mockRejectedValueOnce;
    const axiosMod = await import('../../api/axios');
    (axiosMod.default.patch as any).mockRejectedValueOnce({
      response: { data: { message: 'Status update failed' } },
    });
    renderAdminOrders();
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'shipped' } });
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Status update failed');
    });
  });
});
