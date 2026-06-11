import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Profile from './Profile';
import { useAuthStore } from '../store/useAuthStore';

vi.mock('../api/axios', () => ({
  default: { put: vi.fn(), post: vi.fn(), delete: vi.fn() },
}));

vi.mock('react-hot-toast', () => {
  const mock = { success: vi.fn(), error: vi.fn() };
  return { default: mock, ...mock };
});

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: [], isLoading: false })),
  useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}));

vi.mock('./UserOrders', () => ({
  default: ({ isEmbedded }: any) =>
    isEmbedded ? <div data-testid="embedded-orders">Orders Placeholder</div> : null,
}));

vi.mock('../components/SEOMeta', () => ({
  default: () => null,
}));

const mockUser = {
  _id: 'u1',
  name: 'Jane Doe',
  email: 'jane@test.com',
  role: 'user' as const,
  addresses: [
    { _id: 'a1', street: '123 Main St', city: 'NYC', zipCode: '10001', isDefault: true },
  ],
};

const renderProfile = () =>
  render(
    <MemoryRouter>
      <Profile />
    </MemoryRouter>
  );

describe('Profile', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, isAuthenticated: false });
    vi.clearAllMocks();
  });

  it('renders user avatar with initials', () => {
    useAuthStore.setState({ user: mockUser, isAuthenticated: true });
    renderProfile();
    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('renders user name and email', () => {
    useAuthStore.setState({ user: mockUser, isAuthenticated: true });
    renderProfile();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('jane@test.com')).toBeInTheDocument();
  });

  it('renders tab navigation buttons', () => {
    useAuthStore.setState({ user: mockUser, isAuthenticated: true });
    renderProfile();
    expect(screen.getByText('Profile Details')).toBeInTheDocument();
    expect(screen.getByText('Addresses')).toBeInTheDocument();
    expect(screen.getByText('Order History')).toBeInTheDocument();
  });

  it('shows Profile Details tab by default', () => {
    useAuthStore.setState({ user: mockUser, isAuthenticated: true });
    renderProfile();
    expect(screen.getByText('Personal Information')).toBeInTheDocument();
    expect(screen.getByText('Save Profile Details')).toBeInTheDocument();
  });

  it('pre-fills name input with user name', () => {
    useAuthStore.setState({ user: mockUser, isAuthenticated: true });
    renderProfile();
    const input = screen.getByDisplayValue('Jane Doe');
    expect(input).toBeInTheDocument();
  });

  it('shows disabled email input', () => {
    useAuthStore.setState({ user: mockUser, isAuthenticated: true });
    renderProfile();
    const emailInput = screen.getByDisplayValue('jane@test.com');
    expect(emailInput).toBeDisabled();
  });

  it('switches to Addresses tab', () => {
    useAuthStore.setState({ user: mockUser, isAuthenticated: true });
    renderProfile();
    fireEvent.click(screen.getByText('Addresses'));
    expect(screen.getByText('Saved Addresses')).toBeInTheDocument();
    expect(screen.getByText('123 Main St')).toBeInTheDocument();
  });

  it('switches to Order History tab and shows embedded orders', () => {
    useAuthStore.setState({ user: mockUser, isAuthenticated: true });
    renderProfile();
    fireEvent.click(screen.getByText('Order History'));
    expect(screen.getAllByText('Order History').length).toBe(2);
    expect(screen.getByTestId('embedded-orders')).toBeInTheDocument();
  });

  it('shows Add New button and form on Addresses tab', () => {
    useAuthStore.setState({ user: mockUser, isAuthenticated: true });
    renderProfile();
    fireEvent.click(screen.getByText('Addresses'));
    fireEvent.click(screen.getByText('Add New'));
    expect(screen.getByPlaceholderText('123 Example Street, Apt 4')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('New York')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('10001')).toBeInTheDocument();
  });

  it('shows Default badge on default address', () => {
    useAuthStore.setState({ user: mockUser, isAuthenticated: true });
    renderProfile();
    fireEvent.click(screen.getByText('Addresses'));
    expect(screen.getByText('Default')).toBeInTheDocument();
  });

  it('shows empty address state when user has no addresses', () => {
    useAuthStore.setState({
      user: { ...mockUser, addresses: [] },
      isAuthenticated: true,
    });
    renderProfile();
    fireEvent.click(screen.getByText('Addresses'));
    expect(screen.getByText('No addresses saved yet')).toBeInTheDocument();
  });

  it('updates profile name successfully', async () => {
    useAuthStore.setState({ user: mockUser, isAuthenticated: true });
    const axiosMod = await import('../api/axios');
    (axiosMod.default.put as any).mockResolvedValueOnce({
      data: { user: { ...mockUser, name: 'Jane Updated' } },
    });
    const toast = (await import('react-hot-toast')).default;
    renderProfile();
    const nameInput = screen.getByDisplayValue('Jane Doe');
    fireEvent.change(nameInput, { target: { value: 'Jane Updated' } });
    fireEvent.click(screen.getByText('Save Profile Details'));
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Profile updated successfully');
    });
    expect(useAuthStore.getState().user?.name).toBe('Jane Updated');
  });

  it('shows error on profile update failure', async () => {
    useAuthStore.setState({ user: mockUser, isAuthenticated: true });
    const axiosMod = await import('../api/axios');
    (axiosMod.default.put as any).mockRejectedValueOnce({
      response: { data: { message: 'Update failed' } },
    });
    const toast = (await import('react-hot-toast')).default;
    renderProfile();
    const nameInput = screen.getByDisplayValue('Jane Doe');
    fireEvent.change(nameInput, { target: { value: 'Jane Updated' } });
    fireEvent.click(screen.getByText('Save Profile Details'));
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Update failed');
    });
  });

  it('adds new address successfully', async () => {
    useAuthStore.setState({ user: mockUser, isAuthenticated: true });
    const axiosMod = await import('../api/axios');
    const updatedUser = {
      ...mockUser,
      addresses: [
        ...(mockUser.addresses || []),
        { _id: 'a2', street: '456 Oak St', city: 'LA', zipCode: '90001', isDefault: false },
      ],
    };
    (axiosMod.default.post as any).mockResolvedValueOnce({
      data: { user: updatedUser },
    });
    const toast = (await import('react-hot-toast')).default;
    renderProfile();
    fireEvent.click(screen.getByText('Addresses'));
    fireEvent.click(screen.getByText('Add New'));
    fireEvent.change(screen.getByPlaceholderText('123 Example Street, Apt 4'), {
      target: { value: '456 Oak St' },
    });
    fireEvent.change(screen.getByPlaceholderText('New York'), {
      target: { value: 'LA' },
    });
    fireEvent.change(screen.getByPlaceholderText('10001'), {
      target: { value: '90001' },
    });
    fireEvent.click(screen.getByText('Save Address'));
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Address added successfully');
    });
  });

  it('deletes an address', async () => {
    useAuthStore.setState({ user: mockUser, isAuthenticated: true });
    const axiosMod = await import('../api/axios');
    (axiosMod.default.delete as any).mockResolvedValueOnce({
      data: { user: { ...mockUser, addresses: [] } },
    });
    const toast = (await import('react-hot-toast')).default;
    renderProfile();
    fireEvent.click(screen.getByText('Addresses'));
    fireEvent.click(screen.getByLabelText('Delete address'));
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Address removed');
    });
  });

  it('sets default address', async () => {
    const userWithTwoAddresses = {
      ...mockUser,
      addresses: [
        { _id: 'a1', street: '123 Main St', city: 'NYC', zipCode: '10001', isDefault: true },
        { _id: 'a2', street: '456 Oak St', city: 'LA', zipCode: '90001', isDefault: false },
      ],
    };
    useAuthStore.setState({ user: userWithTwoAddresses, isAuthenticated: true });
    const axiosMod = await import('../api/axios');
    (axiosMod.default.put as any).mockResolvedValueOnce({
      data: {
        user: {
          ...userWithTwoAddresses,
          addresses: [
            { _id: 'a1', street: '123 Main St', city: 'NYC', zipCode: '10001', isDefault: false },
            { _id: 'a2', street: '456 Oak St', city: 'LA', zipCode: '90001', isDefault: true },
          ],
        },
      },
    });
    const toast = (await import('react-hot-toast')).default;
    renderProfile();
    fireEvent.click(screen.getByText('Addresses'));
    fireEvent.click(screen.getByText('Set as Default'));
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Default address updated');
    });
  });
});
