import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Login from './Login';

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => (globalThis as any).__mockNavigate ?? vi.fn() };
});

vi.mock('../api/axios', () => ({
  default: { post: vi.fn(), get: vi.fn() },
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock('../components/SEOMeta', () => ({
  default: () => null,
}));

vi.mock('../store/useAuthStore', () => ({
  useAuthStore: (selector?: any) => {
    const state = { setAuth: (globalThis as any).__mockSetAuth };
    return selector ? selector(state) : state;
  },
}));

const renderLogin = (redirectTo?: string) => {
  const initialEntries = redirectTo ? [`/login?redirect=${redirectTo}`] : ['/login'];
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Login />
    </MemoryRouter>
  );
};

describe('Login', () => {
  beforeEach(() => {
    (globalThis as any).__mockNavigate = vi.fn();
    (globalThis as any).__mockSetAuth = vi.fn();
    vi.clearAllMocks();
  });

  it('renders welcome title', () => {
    renderLogin();
    expect(screen.getByText('WELCOME BACK')).toBeInTheDocument();
    expect(screen.getByText('Sign in to your account')).toBeInTheDocument();
  });

  it('shows OTP Login as default mode', () => {
    renderLogin();
    expect(screen.getByText('OTP Login')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter your email')).toBeInTheDocument();
  });

  it('shows Admin Login fields when switching mode', () => {
    renderLogin();
    fireEvent.click(screen.getByRole('button', { name: /admin login/i }));
    expect(screen.getByPlaceholderText('admin@nova.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter admin password')).toBeInTheDocument();
  });

  it('advances to OTP step after sending email', async () => {
    renderLogin();
    const axiosMod = await import('../api/axios');
    (axiosMod.default.post as any).mockResolvedValueOnce({});
    fireEvent.change(screen.getByPlaceholderText('Enter your email'), { target: { value: 'test@test.com' } });
    fireEvent.click(screen.getByText('Continue'));
    await waitFor(() => {
      expect(screen.getByText('Verify & Login')).toBeInTheDocument();
    });
  });

  it('shows error toast on failed OTP send', async () => {
    renderLogin();
    const axiosMod = await import('../api/axios');
    (axiosMod.default.post as any).mockRejectedValueOnce({
      response: { data: { message: 'Failed to send OTP' } },
    });
    const toast = (await import('react-hot-toast')).default;
    fireEvent.change(screen.getByPlaceholderText('Enter your email'), { target: { value: 'test@test.com' } });
    fireEvent.click(screen.getByText('Continue'));
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to send OTP');
    });
  });

  it('shows OTP input after advancing to step 2', async () => {
    renderLogin();
    const axiosMod = await import('../api/axios');
    (axiosMod.default.post as any).mockResolvedValueOnce({});
    fireEvent.change(screen.getByPlaceholderText('Enter your email'), { target: { value: 'test@test.com' } });
    fireEvent.click(screen.getByText('Continue'));
    await waitFor(() => {
      expect(screen.getByPlaceholderText('000000')).toBeInTheDocument();
    });
  });

  it('shows change email and resend OTP buttons in step 2', async () => {
    renderLogin();
    const axiosMod = await import('../api/axios');
    (axiosMod.default.post as any).mockResolvedValueOnce({});
    fireEvent.change(screen.getByPlaceholderText('Enter your email'), { target: { value: 'test@test.com' } });
    fireEvent.click(screen.getByText('Continue'));
    await waitFor(() => {
      expect(screen.getByText('Change Email')).toBeInTheDocument();
      expect(screen.getByText('Resend OTP')).toBeInTheDocument();
    });
  });

  it('verifies OTP successfully and navigates', async () => {
    renderLogin();
    const axiosMod = await import('../api/axios');
    (axiosMod.default.post as any).mockResolvedValueOnce({});
    (axiosMod.default.post as any).mockResolvedValueOnce({ data: { user: { name: 'Test', role: 'user' } } });
    const toast = (await import('react-hot-toast')).default;
    fireEvent.change(screen.getByPlaceholderText('Enter your email'), { target: { value: 'test@test.com' } });
    fireEvent.click(screen.getByText('Continue'));
    await waitFor(() => expect(screen.getByPlaceholderText('000000')).toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText('000000'), { target: { value: '123456' } });
    fireEvent.click(screen.getByText('Verify & Login'));
    await waitFor(() => {
      expect((globalThis as any).__mockSetAuth).toHaveBeenCalledWith({ name: 'Test', role: 'user' });
      expect(toast.success).toHaveBeenCalledWith('Logged in successfully');
      expect((globalThis as any).__mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('shows error on invalid OTP', async () => {
    renderLogin();
    const axiosMod = await import('../api/axios');
    (axiosMod.default.post as any).mockResolvedValueOnce({});
    (axiosMod.default.post as any).mockRejectedValueOnce({
      response: { data: { message: 'Invalid OTP' } },
    });
    const toast = (await import('react-hot-toast')).default;
    fireEvent.change(screen.getByPlaceholderText('Enter your email'), { target: { value: 'test@test.com' } });
    fireEvent.click(screen.getByText('Continue'));
    await waitFor(() => expect(screen.getByPlaceholderText('000000')).toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText('000000'), { target: { value: '000000' } });
    fireEvent.click(screen.getByText('Verify & Login'));
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Invalid OTP');
    });
  });

  it('resends OTP in step 2', async () => {
    renderLogin();
    const axiosMod = await import('../api/axios');
    (axiosMod.default.post as any).mockResolvedValueOnce({});
    (axiosMod.default.post as any).mockResolvedValueOnce({});
    const toast = (await import('react-hot-toast')).default;
    fireEvent.change(screen.getByPlaceholderText('Enter your email'), { target: { value: 'test@test.com' } });
    fireEvent.click(screen.getByText('Continue'));
    await waitFor(() => expect(screen.getByText('Resend OTP')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Resend OTP'));
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('New OTP sent to your email');
    });
  });

  it('returns to step 1 when clicking change email', async () => {
    renderLogin();
    const axiosMod = await import('../api/axios');
    (axiosMod.default.post as any).mockResolvedValueOnce({});
    fireEvent.change(screen.getByPlaceholderText('Enter your email'), { target: { value: 'test@test.com' } });
    fireEvent.click(screen.getByText('Continue'));
    await waitFor(() => expect(screen.getByText('Change Email')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Change Email'));
    expect(screen.getByText('Continue')).toBeInTheDocument();
  });

  it('submits admin login successfully', async () => {
    renderLogin();
    const axiosMod = await import('../api/axios');
    const toast = (await import('react-hot-toast')).default;
    (axiosMod.default.post as any).mockResolvedValueOnce({ data: { user: { name: 'Admin', role: 'admin' } } });
    fireEvent.click(screen.getByRole('button', { name: /admin login/i }));
    fireEvent.change(screen.getByPlaceholderText('admin@nova.com'), { target: { value: 'admin@nova.com' } });
    fireEvent.change(screen.getByPlaceholderText('Enter admin password'), { target: { value: 'password123' } });
    fireEvent.click(screen.getAllByText('Admin Login')[1]);
    await waitFor(() => {
      expect((globalThis as any).__mockSetAuth).toHaveBeenCalledWith({ name: 'Admin', role: 'admin' });
      expect(toast.success).toHaveBeenCalledWith('Admin logged in successfully');
      expect((globalThis as any).__mockNavigate).toHaveBeenCalledWith('/admin');
    });
  });

  it('shows error on failed admin login', async () => {
    renderLogin();
    const axiosMod = await import('../api/axios');
    const toast = (await import('react-hot-toast')).default;
    (axiosMod.default.post as any).mockRejectedValueOnce({
      response: { data: { message: 'Invalid email or password' } },
    });
    fireEvent.click(screen.getByRole('button', { name: /admin login/i }));
    fireEvent.change(screen.getByPlaceholderText('admin@nova.com'), { target: { value: 'admin@nova.com' } });
    fireEvent.change(screen.getByPlaceholderText('Enter admin password'), { target: { value: 'wrong' } });
    fireEvent.click(screen.getAllByText('Admin Login')[1]);
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Invalid email or password');
    });
  });

  it('navigates admin users to /admin after OTP login', async () => {
    renderLogin();
    const axiosMod = await import('../api/axios');
    (axiosMod.default.post as any).mockResolvedValueOnce({});
    (axiosMod.default.post as any).mockResolvedValueOnce({ data: { user: { name: 'Admin', role: 'admin' } } });
    fireEvent.change(screen.getByPlaceholderText('Enter your email'), { target: { value: 'admin@test.com' } });
    fireEvent.click(screen.getByText('Continue'));
    await waitFor(() => expect(screen.getByPlaceholderText('000000')).toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText('000000'), { target: { value: '123456' } });
    fireEvent.click(screen.getByText('Verify & Login'));
    await waitFor(() => {
      expect((globalThis as any).__mockNavigate).toHaveBeenCalledWith('/admin');
    });
  });

  it('uses redirect param for OTP login', async () => {
    renderLogin('/admin/dashboard');
    const axiosMod = await import('../api/axios');
    (axiosMod.default.post as any).mockResolvedValueOnce({});
    (axiosMod.default.post as any).mockResolvedValueOnce({ data: { user: { name: 'Test', role: 'user' } } });
    fireEvent.change(screen.getByPlaceholderText('Enter your email'), { target: { value: 'test@test.com' } });
    fireEvent.click(screen.getByText('Continue'));
    await waitFor(() => expect(screen.getByPlaceholderText('000000')).toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText('000000'), { target: { value: '123456' } });
    fireEvent.click(screen.getByText('Verify & Login'));
    await waitFor(() => {
      expect((globalThis as any).__mockNavigate).toHaveBeenCalledWith('/admin/dashboard');
    });
  });

  it('shows loading spinner during OTP send', async () => {
    renderLogin();
    const axiosMod = await import('../api/axios');
    (axiosMod.default.post as any).mockImplementationOnce(() => new Promise(() => {}));
    fireEvent.change(screen.getByPlaceholderText('Enter your email'), { target: { value: 'test@test.com' } });
    fireEvent.click(screen.getByText('Continue'));
    const btn = screen.getByRole('button', { name: '' });
    expect(btn.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('shows Create Account link', () => {
    renderLogin();
    expect(screen.getByText('Create Account')).toBeInTheDocument();
  });
});
