import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminUsers from './Users';
import { useAuthStore } from '../../store/useAuthStore';

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({
    data: (globalThis as any).__mockUsers ?? [],
    isLoading: (globalThis as any).__mockUsersLoading ?? false,
  })),
  useMutation: vi.fn((opts: any) => ({
    mutate: (...args: any[]) => Promise.resolve(opts?.mutationFn?.(...args)).then(opts?.onSuccess).catch(opts?.onError),
    isPending: false,
    variables: null,
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

const mockUser = { _id: 'u1', name: 'Jane Doe', email: 'jane@test.com', role: 'user', isVerified: true, createdAt: '2024-01-01T00:00:00Z' };
const mockAdmin = { _id: 'u2', name: 'Admin User', email: 'admin@test.com', role: 'admin', isVerified: true, createdAt: '2024-01-01T00:00:00Z' };

const renderAdminUsers = () =>
  render(
    <MemoryRouter>
      <AdminUsers />
    </MemoryRouter>
  );

describe('AdminUsers', () => {
  beforeEach(() => {
    (globalThis as any).__mockUsers = [];
    (globalThis as any).__mockUsersLoading = false;
    useAuthStore.setState({ user: null, isAuthenticated: false });
    vi.clearAllMocks();
  });

  it('shows loading state', () => {
    (globalThis as any).__mockUsersLoading = true;
    renderAdminUsers();
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders users header', () => {
    renderAdminUsers();
    expect(screen.getByText('Users')).toBeInTheDocument();
  });

  it('shows correct user count', () => {
    (globalThis as any).__mockUsers = [mockUser];
    renderAdminUsers();
    expect(screen.getByText('1 registered user')).toBeInTheDocument();
  });

  it('renders user rows', () => {
    (globalThis as any).__mockUsers = [mockUser];
    renderAdminUsers();
    expect(screen.getAllByText('Jane Doe').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('jane@test.com').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('user').length).toBeGreaterThanOrEqual(1);
  });

  it('shows verified badge', () => {
    (globalThis as any).__mockUsers = [mockUser];
    renderAdminUsers();
    expect(screen.getAllByText('Verified').length).toBeGreaterThanOrEqual(1);
  });

  it('shows Make Admin button for regular users', () => {
    (globalThis as any).__mockUsers = [mockUser];
    renderAdminUsers();
    expect(screen.getAllByText('Make Admin').length).toBeGreaterThanOrEqual(1);
  });

  it('shows Revoke Admin for admin users', () => {
    (globalThis as any).__mockUsers = [mockAdmin];
    renderAdminUsers();
    expect(screen.getAllByText('Revoke Admin').length).toBeGreaterThanOrEqual(1);
  });

  it('prevents changing own role', () => {
    useAuthStore.setState({ user: { _id: 'u1', name: 'Jane Doe', email: 'jane@test.com', role: 'user' }, isAuthenticated: true });
    (globalThis as any).__mockUsers = [mockUser];
    renderAdminUsers();
    expect(screen.getAllByText('Make Admin')[0]).toBeDisabled();
  });

  it('changes role via confirm dialog', async () => {
    (globalThis as any).__mockUsers = [mockUser];
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const toast = (await import('react-hot-toast')).default;
    renderAdminUsers();
    fireEvent.click(screen.getAllByText('Make Admin')[0]);
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('User role updated');
    });
  });
});
