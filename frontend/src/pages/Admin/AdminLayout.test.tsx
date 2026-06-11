import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminLayout from './AdminLayout';
import { useAuthStore } from '../../store/useAuthStore';

vi.mock('../components/SEOMeta', () => ({
  default: () => null,
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, Outlet: () => <div data-testid="outlet">Outlet Content</div> };
});

const renderAdminLayout = (initialEntries = ['/admin']) =>
  render(
    <MemoryRouter initialEntries={initialEntries}>
      <AdminLayout />
    </MemoryRouter>
  );

describe('AdminLayout', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: { _id: 'u1', name: 'Jane Doe', email: 'jane@test.com', role: 'admin' },
      isAuthenticated: true,
    });
  });

  it('renders NOVA brand link', () => {
    renderAdminLayout();
    const novaLink = screen.getByText('NOVA');
    expect(novaLink).toBeInTheDocument();
    expect(novaLink.closest('a')).toHaveAttribute('href', '/');
  });

  it('renders admin panel label', () => {
    renderAdminLayout();
    expect(screen.getByText('Admin Panel')).toBeInTheDocument();
  });

  it('displays user email', () => {
    renderAdminLayout();
    expect(screen.getByText('jane@test.com')).toBeInTheDocument();
  });

  it('renders all nav items', () => {
    renderAdminLayout();
    expect(screen.getAllByText('Dashboard').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Products').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Orders').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Users').length).toBeGreaterThanOrEqual(1);
  });

  it('highlights active nav item', () => {
    renderAdminLayout(['/admin/products']);
    const productsLinks = screen.getAllByText('Products');
    const sidebarLink = productsLinks[0].closest('a');
    expect(sidebarLink?.className).toContain('bg-[#EBE7E0]');
  });

  it('renders Back to Store link', () => {
    renderAdminLayout();
    const backLink = screen.getByText('Back to Store');
    expect(backLink.closest('a')).toHaveAttribute('href', '/');
  });

  it('renders Sign Out button', () => {
    renderAdminLayout();
    expect(screen.getByText('Sign Out')).toBeInTheDocument();
  });

  it('renders outlet content', () => {
    renderAdminLayout();
    expect(screen.getByTestId('outlet')).toBeInTheDocument();
  });

  it('shows mobile hamburger menu button', () => {
    renderAdminLayout();
    const buttons = screen.getAllByRole('button');
    const menuBtn = buttons.find(b => b.querySelector('svg.lucide-menu'));
    expect(menuBtn).toBeTruthy();
  });

  it('shows user name in header', () => {
    renderAdminLayout();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
  });

  it('shows header title based on active route', () => {
    renderAdminLayout(['/admin']);
    expect(screen.getAllByText('Dashboard').length).toBeGreaterThanOrEqual(1);
  });

  it('displays date in header', () => {
    renderAdminLayout();
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    expect(screen.getByText(today)).toBeInTheDocument();
  });
});
