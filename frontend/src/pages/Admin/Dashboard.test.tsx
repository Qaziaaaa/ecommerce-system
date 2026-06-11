import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from './Dashboard';

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(({ queryKey }: any) => {
    const loading = (globalThis as any).__mockDashboardLoading ?? false;
    if (loading) return { isLoading: true };
    if (queryKey?.[0] === 'admin-sales') return { data: (globalThis as any).__mockSales ?? [], isLoading: false };
    if (queryKey?.[0] === 'admin-categories-analytics') return { data: (globalThis as any).__mockCategories ?? [], isLoading: false };
    if (queryKey?.[0] === 'admin-logistics') return { data: (globalThis as any).__mockLogistics ?? [], isLoading: false };
    if (queryKey?.[0] === 'admin-top-products') return { data: (globalThis as any).__mockTopProducts ?? [], isLoading: false };
    return { data: (globalThis as any).__mockDashboardData ?? {}, isLoading: false };
  }),
}));

vi.mock('../../api/axios', () => ({
  default: { get: vi.fn() },
}));

vi.mock('../../components/SEOMeta', () => ({
  default: () => null,
}));

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  AreaChart: ({ children }: any) => <div>{children}</div>,
  Area: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  PieChart: ({ children }: any) => <div>{children}</div>,
  Pie: ({ children }: any) => <div>{children}</div>,
  Cell: () => null,
  BarChart: ({ children }: any) => <div>{children}</div>,
  Bar: () => null,
}));

const renderDashboard = () =>
  render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>
  );

describe('Admin Dashboard', () => {
  beforeEach(() => {
    (globalThis as any).__mockDashboardLoading = false;
    (globalThis as any).__mockDashboardData = null;
    vi.clearAllMocks();
  });

  it('shows loading state', () => {
    (globalThis as any).__mockDashboardLoading = true;
    renderDashboard();
    expect(screen.getByText('Generating Insights...')).toBeInTheDocument();
  });

  it('renders dashboard title', () => {
    (globalThis as any).__mockDashboardData = {};
    renderDashboard();
    expect(screen.getByText('BI DASHBOARD')).toBeInTheDocument();
  });

  it('renders stat cards with default values', () => {
    (globalThis as any).__mockDashboardData = {};
    renderDashboard();
    expect(screen.getByText('Total Revenue')).toBeInTheDocument();
    expect(screen.getByText('Total Orders')).toBeInTheDocument();
    expect(screen.getByText('Total Customers')).toBeInTheDocument();
    expect(screen.getByText('Product Inventory')).toBeInTheDocument();
  });

  it('renders stat cards with provided values', () => {
    (globalThis as any).__mockDashboardData = {
      totalRevenue: 50000,
      totalOrders: 150,
      totalUsers: 80,
      totalProducts: 200,
    };
    renderDashboard();
    expect(screen.getByText('$50,000')).toBeInTheDocument();
    expect(screen.getByText('150')).toBeInTheDocument();
    expect(screen.getByText('80')).toBeInTheDocument();
    expect(screen.getByText('200')).toBeInTheDocument();
  });

  it('renders revenue growth chart section', () => {
    (globalThis as any).__mockDashboardData = {};
    renderDashboard();
    expect(screen.getByText('Revenue Growth')).toBeInTheDocument();
  });

  it('renders market share section', () => {
    (globalThis as any).__mockDashboardData = {};
    renderDashboard();
    expect(screen.getByText('MARKET SHARE')).toBeInTheDocument();
  });

  it('renders order status section', () => {
    (globalThis as any).__mockDashboardData = {};
    renderDashboard();
    expect(screen.getByText('Order Status')).toBeInTheDocument();
  });

  it('renders trending items section', () => {
    (globalThis as any).__mockDashboardData = {};
    (globalThis as any).__mockTopProducts = [{ name: 'Test Jacket', sold: 50 }];
    renderDashboard();
    expect(screen.getByText('Trending Items')).toBeInTheDocument();
    expect(screen.getByText('Test Jacket')).toBeInTheDocument();
    expect(screen.getByText('50 SOLD')).toBeInTheDocument();
  });
});
