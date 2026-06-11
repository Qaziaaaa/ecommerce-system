import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Signup from './Signup';

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

const renderSignup = () =>
  render(
    <MemoryRouter>
      <Signup />
    </MemoryRouter>
  );

describe('Signup', () => {
  beforeEach(() => {
    (globalThis as any).__mockNavigate = vi.fn();
    (globalThis as any).__mockSetAuth = vi.fn();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('renders join nova title', () => {
    renderSignup();
    expect(screen.getByText('JOIN NOVA')).toBeInTheDocument();
    expect(screen.getByText('Complete Passwordless Enrollment')).toBeInTheDocument();
  });

  it('shows name, email, phone fields in step 1', () => {
    renderSignup();
    expect(screen.getByPlaceholderText('Enter your name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter your email')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter phone number')).toBeInTheDocument();
  });

  it('sends OTP and advances to step 2', async () => {
    renderSignup();
    const axiosMod = await import('../api/axios');
    (axiosMod.default.post as any).mockResolvedValueOnce({});
    fireEvent.change(screen.getByPlaceholderText('Enter your name'), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByPlaceholderText('Enter your email'), { target: { value: 'test@test.com' } });
    fireEvent.click(screen.getByText('Create Account'));
    await waitFor(() => {
      expect(screen.getByText('Verify & Create Account')).toBeInTheDocument();
    });
  });

  it('shows error toast on failed OTP send', async () => {
    renderSignup();
    const axiosMod = await import('../api/axios');
    (axiosMod.default.post as any).mockRejectedValueOnce({
      response: { data: { message: 'Failed to send OTP' } },
    });
    const toast = (await import('react-hot-toast')).default;
    fireEvent.change(screen.getByPlaceholderText('Enter your name'), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByPlaceholderText('Enter your email'), { target: { value: 'test@test.com' } });
    fireEvent.click(screen.getByText('Create Account'));
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to send OTP');
    });
  });

  it('redirects to login when user already exists', async () => {
    vi.useFakeTimers();
    renderSignup();
    const axiosMod = await import('../api/axios');
    (axiosMod.default.post as any).mockRejectedValueOnce({
      response: { data: { message: 'An account with this email already exists' } },
    });
    const toast = (await import('react-hot-toast')).default;
    fireEvent.change(screen.getByPlaceholderText('Enter your name'), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByPlaceholderText('Enter your email'), { target: { value: 'test@test.com' } });
    fireEvent.click(screen.getByText('Create Account'));
    await vi.advanceTimersByTimeAsync(1500);
    expect(toast.error).toHaveBeenCalledWith('An account with this email already exists. Redirecting to login...');
    expect((globalThis as any).__mockNavigate).toHaveBeenCalledWith('/login');
    vi.useRealTimers();
  });

  it('shows OTP input after advancing to step 2', async () => {
    renderSignup();
    const axiosMod = await import('../api/axios');
    (axiosMod.default.post as any).mockResolvedValueOnce({});
    fireEvent.change(screen.getByPlaceholderText('Enter your name'), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByPlaceholderText('Enter your email'), { target: { value: 'test@test.com' } });
    fireEvent.click(screen.getByText('Create Account'));
    await waitFor(() => {
      expect(screen.getByPlaceholderText('000000')).toBeInTheDocument();
    });
  });

  it('shows back and resend OTP buttons in step 2', async () => {
    renderSignup();
    const axiosMod = await import('../api/axios');
    (axiosMod.default.post as any).mockResolvedValueOnce({});
    fireEvent.change(screen.getByPlaceholderText('Enter your name'), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByPlaceholderText('Enter your email'), { target: { value: 'test@test.com' } });
    fireEvent.click(screen.getByText('Create Account'));
    await waitFor(() => {
      expect(screen.getByText('Back')).toBeInTheDocument();
      expect(screen.getByText('Resend OTP')).toBeInTheDocument();
    });
  });

  it('verifies OTP successfully and navigates home', async () => {
    renderSignup();
    const axiosMod = await import('../api/axios');
    (axiosMod.default.post as any).mockResolvedValueOnce({});
    (axiosMod.default.post as any).mockResolvedValueOnce({ data: { user: { name: 'Test User', email: 'test@test.com' } } });
    const toast = (await import('react-hot-toast')).default;
    fireEvent.change(screen.getByPlaceholderText('Enter your name'), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByPlaceholderText('Enter your email'), { target: { value: 'test@test.com' } });
    fireEvent.click(screen.getByText('Create Account'));
    await waitFor(() => expect(screen.getByPlaceholderText('000000')).toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText('000000'), { target: { value: '123456' } });
    fireEvent.click(screen.getByText('Verify & Create Account'));
    await waitFor(() => {
      expect((globalThis as any).__mockSetAuth).toHaveBeenCalledWith({ name: 'Test User', email: 'test@test.com' });
      expect(toast.success).toHaveBeenCalledWith('Account created and logged in!');
      expect((globalThis as any).__mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('shows error on invalid OTP', async () => {
    renderSignup();
    const axiosMod = await import('../api/axios');
    (axiosMod.default.post as any).mockResolvedValueOnce({});
    (axiosMod.default.post as any).mockRejectedValueOnce({
      response: { data: { message: 'Invalid OTP' } },
    });
    const toast = (await import('react-hot-toast')).default;
    fireEvent.change(screen.getByPlaceholderText('Enter your name'), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByPlaceholderText('Enter your email'), { target: { value: 'test@test.com' } });
    fireEvent.click(screen.getByText('Create Account'));
    await waitFor(() => expect(screen.getByPlaceholderText('000000')).toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText('000000'), { target: { value: '000000' } });
    fireEvent.click(screen.getByText('Verify & Create Account'));
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Invalid OTP');
    });
  });

  it('resends OTP in step 2', async () => {
    renderSignup();
    const axiosMod = await import('../api/axios');
    (axiosMod.default.post as any).mockResolvedValueOnce({});
    (axiosMod.default.post as any).mockResolvedValueOnce({});
    const toast = (await import('react-hot-toast')).default;
    fireEvent.change(screen.getByPlaceholderText('Enter your name'), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByPlaceholderText('Enter your email'), { target: { value: 'test@test.com' } });
    fireEvent.click(screen.getByText('Create Account'));
    await waitFor(() => expect(screen.getByText('Resend OTP')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Resend OTP'));
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('New OTP sent to your email');
    });
  });

  it('returns to step 1 when clicking back', async () => {
    renderSignup();
    const axiosMod = await import('../api/axios');
    (axiosMod.default.post as any).mockResolvedValueOnce({});
    fireEvent.change(screen.getByPlaceholderText('Enter your name'), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByPlaceholderText('Enter your email'), { target: { value: 'test@test.com' } });
    fireEvent.click(screen.getByText('Create Account'));
    await waitFor(() => expect(screen.getByText('Back')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Back'));
    expect(screen.getByText('Create Account')).toBeInTheDocument();
  });

  it('shows Sign In Instead link', () => {
    renderSignup();
    expect(screen.getByText('Sign In Instead')).toBeInTheDocument();
  });

  it('shows loading spinner during OTP send', async () => {
    renderSignup();
    const axiosMod = await import('../api/axios');
    (axiosMod.default.post as any).mockImplementationOnce(() => new Promise(() => {}));
    fireEvent.change(screen.getByPlaceholderText('Enter your name'), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByPlaceholderText('Enter your email'), { target: { value: 'test@test.com' } });
    fireEvent.click(screen.getByText('Create Account'));
    const btn = screen.getByRole('button', { name: '' });
    expect(btn.querySelector('.animate-spin')).toBeInTheDocument();
  });
});
