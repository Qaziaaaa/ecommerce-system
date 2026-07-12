import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import UserOrders from './UserOrders';

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({
    data: (globalThis as any).__testOrders ?? [],
    isLoading: (globalThis as any).__testOrdersLoading ?? false,
  })),
  useMutation: vi.fn((opts: any) => ({
    mutate: (...args: any[]) =>
      opts?.mutationFn?.(...args)
        ?.then?.(opts?.onSuccess)
        ?.catch?.(opts?.onError),
    isPending: (globalThis as any).__testCancelPending ?? false,
  })),
  useQueryClient: vi.fn(() => ({
    invalidateQueries: vi.fn(),
  })),
}));

vi.mock('../api/axios', () => ({
  default: { get: vi.fn(), delete: vi.fn() },
}));

vi.mock('react-hot-toast', () => {
  const mock = { success: vi.fn(), error: vi.fn() };
  return { default: mock, ...mock };
});

vi.mock('../components/SEOMeta', () => ({
  default: () => null,
}));

const mockOrder = {
  _id: 'ord1',
  orderStatus: 'delivered',
  totalAmount: 149.98,
  createdAt: '2025-01-15T10:00:00Z',
  shippingAddress: { street: '123 Main St', city: 'NYC', zipCode: '10001' },
  orderItems: [
    {
      _id: 'item1',
      product: { _id: 'p1', name: 'Test Jacket', images: ['/j.jpg'], price: 74.99 },
      quantity: 2,
      price: 74.99,
    },
  ],
};

const renderOrders = (isEmbedded = false) =>
  render(
    <MemoryRouter>
      <UserOrders isEmbedded={isEmbedded} />
    </MemoryRouter>
  );

describe('UserOrders', () => {
  beforeEach(() => {
    (globalThis as any).__testOrders = [];
    (globalThis as any).__testOrdersLoading = false;
    (globalThis as any).__testCancelPending = false;
    vi.clearAllMocks();
  });

  it('shows loading spinner', () => {
    (globalThis as any).__testOrdersLoading = true;
    renderOrders();
    expect(screen.getByText('Loading orders...')).toBeInTheDocument();
  });

  it('shows empty order state', () => {
    renderOrders();
    expect(screen.getByText('No orders yet')).toBeInTheDocument();
    expect(screen.getByText('Browse Collection')).toBeInTheDocument();
  });

  it('renders order header with ID and total', () => {
    (globalThis as any).__testOrders = [mockOrder];
    renderOrders();
    expect(screen.getByText('My Orders')).toBeInTheDocument();
    expect(screen.getByText('1 order')).toBeInTheDocument();
    expect(screen.getAllByText('$149.98').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('delivered')).toBeInTheDocument();
  });

  it('renders order items with product name and quantity', () => {
    (globalThis as any).__testOrders = [mockOrder];
    renderOrders();
    expect(screen.getByText('Test Jacket')).toBeInTheDocument();
    expect(screen.getByText(/Qty 2/)).toBeInTheDocument();
  });

  it('shows delivery progress for non-cancelled orders', () => {
    (globalThis as any).__testOrders = [mockOrder];
    renderOrders();
    expect(screen.getByText('Delivery Progress')).toBeInTheDocument();
    expect(screen.getByText('Order Placed')).toBeInTheDocument();
    expect(screen.getByText('Shipped')).toBeInTheDocument();
    expect(screen.getByText('Delivered')).toBeInTheDocument();
  });

  it('shows cancelled banner for cancelled orders', () => {
    (globalThis as any).__testOrders = [
      { ...mockOrder, orderStatus: 'cancelled' },
    ];
    renderOrders();
    expect(screen.getByText('Order Cancelled')).toBeInTheDocument();
  });

  it('shows cancel button for pending/processing orders', () => {
    (globalThis as any).__testOrders = [
      { ...mockOrder, orderStatus: 'pending' },
    ];
    renderOrders();
    expect(screen.getByText('Cancel Order')).toBeInTheDocument();
  });

  it('confirms and cancels an order', async () => {
    (globalThis as any).__testOrders = [
      { ...mockOrder, orderStatus: 'pending' },
    ];
    const toast = (await import('react-hot-toast')).default;
    renderOrders();
    fireEvent.click(screen.getByText('Cancel Order'));
    fireEvent.click(screen.getAllByText('Cancel Order')[1]);
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Order cancelled. Stock has been restored.');
    });
  });

  it('does not cancel order when cancel is dismissed', () => {
    (globalThis as any).__testOrders = [
      { ...mockOrder, orderStatus: 'pending' },
    ];
    renderOrders();
    fireEvent.click(screen.getByText('Cancel Order'));
    fireEvent.click(screen.getByText('Keep'));
  });

  it('shows error toast on cancel failure', async () => {
    (globalThis as any).__testOrders = [
      { ...mockOrder, orderStatus: 'pending' },
    ];
    const toast = (await import('react-hot-toast')).default;
    vi.mocked(vi.fn()).mockRejectedValueOnce;

    const axiosMod = await import('../api/axios');
    (axiosMod.default.delete as any).mockRejectedValueOnce({
      response: { data: { message: 'Cancel failed' } },
    });
    renderOrders();
    fireEvent.click(screen.getByText('Cancel Order'));
    fireEvent.click(screen.getAllByText('Cancel Order')[1]);
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Cancel failed');
    });
  });

  it('does not show cancel button for delivered orders', () => {
    (globalThis as any).__testOrders = [mockOrder];
    renderOrders();
    expect(screen.queryByText('Cancel Order')).not.toBeInTheDocument();
  });

  it('renders without title and count when embedded', () => {
    (globalThis as any).__testOrders = [mockOrder];
    renderOrders(true);
    expect(screen.queryByText('My Orders')).not.toBeInTheDocument();
    expect(screen.queryByText('1 order')).not.toBeInTheDocument();
    expect(screen.getByText('Test Jacket')).toBeInTheDocument();
  });

  it('shows shipping address', () => {
    (globalThis as any).__testOrders = [mockOrder];
    renderOrders();
    expect(screen.getByText(/123 Main St/)).toBeInTheDocument();
  });
});
