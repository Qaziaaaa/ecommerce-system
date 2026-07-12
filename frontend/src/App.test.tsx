import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from './App';
import { useAuthStore } from './store/useAuthStore';

vi.mock('./pages/Home', () => ({ default: () => <div>HOME_PAGE</div> }));
vi.mock('./pages/Shop', () => ({ default: () => <div>SHOP_PAGE</div> }));
vi.mock('./pages/ProductDetail', () => ({ default: () => <div>PRODUCT_PAGE</div> }));
vi.mock('./pages/Checkout', () => ({ default: () => <div>CHECKOUT_PAGE</div> }));
vi.mock('./pages/About', () => ({ default: () => <div>ABOUT_PAGE</div> }));
vi.mock('./pages/Contact', () => ({ default: () => <div>CONTACT_PAGE</div> }));
vi.mock('./pages/PrivacyPolicy', () => ({ default: () => <div>PRIVACY_PAGE</div> }));
vi.mock('./pages/TermsOfService', () => ({ default: () => <div>TERMS_PAGE</div> }));
vi.mock('./pages/Login', () => ({ default: () => <div>LOGIN_PAGE</div> }));
vi.mock('./pages/Signup', () => ({ default: () => <div>SIGNUP_PAGE</div> }));
vi.mock('./pages/UserOrders', () => ({ default: () => <div>ORDERS_PAGE</div> }));
vi.mock('./pages/Profile', () => ({ default: () => <div>PROFILE_PAGE</div> }));
vi.mock('./pages/Wishlist', () => ({ default: () => <div>WISHLIST_PAGE</div> }));
vi.mock('./pages/Admin/AdminLayout', () => ({
  default: () => <div>ADMIN_LAYOUT</div>,
}));
vi.mock('./pages/Admin/Dashboard', () => ({ default: () => <div>DASHBOARD_PAGE</div> }));
vi.mock('./pages/Admin/Products', () => ({ default: () => <div>ADMIN_PRODUCTS_PAGE</div> }));
vi.mock('./pages/Admin/Orders', () => ({ default: () => <div>ADMIN_ORDERS_PAGE</div> }));
vi.mock('./pages/Admin/Users', () => ({ default: () => <div>ADMIN_USERS_PAGE</div> }));

vi.mock('./components/Layout', async () => {
  const rr = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  const Outlet = rr.Outlet!;
  return {
    default: () => <div><div data-testid="layout">LAYOUT</div><Outlet /></div>,
  };
});

vi.mock('./components/ScrollToTop', () => ({
  default: () => null,
}));

vi.mock('./components/LoadingSpinner', () => ({
  default: ({ message }: any) => <div>{message}</div>,
}));

vi.mock('./components/ErrorBoundary', () => ({
  default: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('./hooks/usePerformanceMonitoring', () => ({
  usePerformanceMonitoring: vi.fn(),
  useNavigationPerformance: vi.fn(() => ({
    startNavigation: vi.fn(),
    endNavigation: vi.fn(),
  })),
}));

vi.mock('./api/axios', () => ({
  default: { get: vi.fn().mockResolvedValue({ data: {} }) },
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('App', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, isAuthenticated: false });
    vi.clearAllMocks();
  });

  it('renders without crashing', async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByTestId('layout')).toBeInTheDocument();
    });
  });

  it('renders home page at root route', async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText('HOME_PAGE')).toBeInTheDocument();
    });
  });

  it('navigates to shop page', async () => {
    render(<App />);
    window.history.pushState({}, '', '/shop');
    window.dispatchEvent(new PopStateEvent('popstate'));
    await waitFor(() => {
      expect(screen.getByText('SHOP_PAGE')).toBeInTheDocument();
    });
  });

  it('navigates to login page', async () => {
    render(<App />);
    window.history.pushState({}, '', '/login');
    window.dispatchEvent(new PopStateEvent('popstate'));
    await waitFor(() => {
      expect(screen.getByText('LOGIN_PAGE')).toBeInTheDocument();
    });
  });

  it('navigates to signup page', async () => {
    render(<App />);
    window.history.pushState({}, '', '/signup');
    window.dispatchEvent(new PopStateEvent('popstate'));
    await waitFor(() => {
      expect(screen.getByText('SIGNUP_PAGE')).toBeInTheDocument();
    });
  });

  it('navigates to orders page when authenticated', async () => {
    useAuthStore.setState({ user: { _id: 'u1', name: 'User', email: 'u@b.com', role: 'user' }, isAuthenticated: true });
    render(<App />);
    window.history.pushState({}, '', '/orders');
    window.dispatchEvent(new PopStateEvent('popstate'));
    await waitFor(() => {
      expect(screen.getByText('ORDERS_PAGE')).toBeInTheDocument();
    });
  });

  it('navigates to profile page when authenticated', async () => {
    useAuthStore.setState({ user: { _id: 'u1', name: 'User', email: 'u@b.com', role: 'user' }, isAuthenticated: true });
    render(<App />);
    window.history.pushState({}, '', '/profile');
    window.dispatchEvent(new PopStateEvent('popstate'));
    await waitFor(() => {
      expect(screen.getByText('PROFILE_PAGE')).toBeInTheDocument();
    });
  });

  it('navigates to wishlist page when authenticated', async () => {
    useAuthStore.setState({ user: { _id: 'u1', name: 'User', email: 'u@b.com', role: 'user' }, isAuthenticated: true });
    render(<App />);
    window.history.pushState({}, '', '/wishlist');
    window.dispatchEvent(new PopStateEvent('popstate'));
    await waitFor(() => {
      expect(screen.getByText('WISHLIST_PAGE')).toBeInTheDocument();
    });
  });

  it('redirects non-admin to login on admin route', async () => {
    render(<App />);
    window.history.pushState({}, '', '/admin');
    window.dispatchEvent(new PopStateEvent('popstate'));
    await waitFor(() => {
      expect(screen.getByText('LOGIN_PAGE')).toBeInTheDocument();
    });
  });
});
