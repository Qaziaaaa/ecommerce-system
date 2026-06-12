import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Checkout from './Checkout';
import { useCartStore } from '../store/useCartStore';
import { useAuthStore } from '../store/useAuthStore';

vi.mock('react-hot-toast', () => {
  const mock = { success: vi.fn(), error: vi.fn() };
  return { default: mock, ...mock };
});

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}));

vi.mock('../api/axios', () => ({
  default: { post: vi.fn().mockResolvedValue({ data: {} }) },
}));

vi.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }: any) => <div data-testid="stripe-elements">{children}</div>,
  PaymentElement: () => <div data-testid="payment-element" />,
  useStripe: vi.fn(() => ({})),
  useElements: vi.fn(() => ({})),
}));

vi.mock('@stripe/stripe-js', () => ({
  loadStripe: vi.fn(() => Promise.resolve({})),
}));

const mockProduct = {
  _id: 'p1',
  id: 1,
  name: 'Test Jacket',
  price: 199.99,
  quantity: 2,
  img: '/test.jpg',
  description: '',
  category: '',
  images: [],
  stock: 0,
};

import axiosInstance from '../api/axios';

const renderCheckout = () =>
  render(
    <MemoryRouter>
      <Checkout />
    </MemoryRouter>
  );

const fillRequiredFields = () => {
  const emailInput = screen.getByPlaceholderText('you@example.com');
  fireEvent.change(emailInput, { target: { value: 'a@b.com' } });

  const inputs = screen.getAllByRole('textbox') as HTMLInputElement[];
  const firstName = inputs.find(i => i.type === 'text' && !i.placeholder);
  if (firstName) fireEvent.change(firstName, { target: { value: 'John' } });
  const lastName = inputs.find(i => i.type === 'text' && i !== firstName && !i.placeholder && i.value === '');
  if (lastName) fireEvent.change(lastName, { target: { value: 'Doe' } });
  const addressInput = screen.getByPlaceholderText('123 Shopping Lane, Apt 4');
  fireEvent.change(addressInput, { target: { value: '1 Main St' } });
  const cityInputs = inputs.filter(i => i.type === 'text' && i.value === '');
  if (cityInputs.length > 0) fireEvent.change(cityInputs[0], { target: { value: 'NYC' } });
  if (cityInputs.length > 1) fireEvent.change(cityInputs[1], { target: { value: '10001' } });
};

describe('Checkout', () => {
  beforeEach(() => {
    useCartStore.setState({ cart: [], isCartOpen: false });
    useAuthStore.setState({ user: null, isAuthenticated: false });
    vi.clearAllMocks();
  });

  it('renders empty cart state', () => {
    renderCheckout();
    expect(screen.getByText('CART IS EMPTY')).toBeInTheDocument();
    const shopLink = screen.getByRole('link', { name: 'Return to Shop' });
    expect(shopLink).toHaveAttribute('href', '/shop');
  });

  it('renders checkout form with items', () => {
    useCartStore.setState({ cart: [mockProduct] });
    renderCheckout();
    expect(screen.getByText('SECURE CHECKOUT')).toBeInTheDocument();
    expect(screen.getByText('Contact Information')).toBeInTheDocument();
    expect(screen.getByText('Shipping Address')).toBeInTheDocument();
    expect(screen.getByText('Payment Details')).toBeInTheDocument();
    expect(screen.getByText('Test Jacket')).toBeInTheDocument();
    const prices = screen.getAllByText('$399.98');
    expect(prices.length).toBeGreaterThanOrEqual(1);
  });

  it('renders COD as default payment method', () => {
    useCartStore.setState({ cart: [mockProduct] });
    renderCheckout();
    expect(screen.getByLabelText('Cash on DeliveryPay at doorstep')).toBeChecked();
  });

  it('switches payment method to Credit Card', () => {
    useCartStore.setState({ cart: [mockProduct] });
    renderCheckout();
    const ccRadio = screen.getByLabelText('Credit CardPowered by Stripe');
    fireEvent.click(ccRadio);
    expect(ccRadio).toBeChecked();
    expect(screen.getByLabelText('Cash on DeliveryPay at doorstep')).not.toBeChecked();
  });

  it('shows validation error on empty COD submit', async () => {
    useCartStore.setState({ cart: [mockProduct] });
    renderCheckout();
    fireEvent.click(screen.getByText(/Place COD Order/i));
    expect(await screen.findByText(/fill in all contact/i)).toBeInTheDocument();
  });

  it('submits COD order and shows success', async () => {
    const mockPost = vi.mocked(axiosInstance.post);
    mockPost.mockResolvedValue({ data: {} });

    useCartStore.setState({ cart: [mockProduct] });
    renderCheckout();

    fillRequiredFields();
    fireEvent.click(screen.getByText(/Place COD Order/i));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalled();
    });
    expect(screen.getByText('ORDER CONFIRMED')).toBeInTheDocument();
  });

  it('shows friendly error on COD stock failure', async () => {
    const mockPost = vi.mocked(axiosInstance.post);
    mockPost.mockRejectedValue({
      response: { data: { message: 'This product only has 2 units left' } },
    });

    useCartStore.setState({ cart: [mockProduct] });
    renderCheckout();

    fillRequiredFields();
    fireEvent.click(screen.getByText(/Place COD Order/i));

    expect(await screen.findByText(/sold out/i)).toBeInTheDocument();
  });

  it('applies coupon code successfully', async () => {
    const mockPost = vi.mocked(axiosInstance.post);
    mockPost.mockResolvedValue({
      data: { data: { coupon: { code: 'SAVE10', calculatedDiscount: 20 } } },
    });

    useCartStore.setState({ cart: [mockProduct] });
    renderCheckout();

    const couponInput = screen.getByPlaceholderText('Enter code here');
    fireEvent.change(couponInput, { target: { value: 'SAVE10' } });
    fireEvent.click(screen.getByText('Apply'));

    expect(await screen.findByText(/SAVE10 Applied/i)).toBeInTheDocument();
    expect(screen.getByText(/-\$20\.00/)).toBeInTheDocument();
  });

  it('removes applied coupon', async () => {
    const mockPost = vi.mocked(axiosInstance.post);
    mockPost.mockResolvedValue({
      data: { data: { coupon: { code: 'SAVE10', calculatedDiscount: 20 } } },
    });

    useCartStore.setState({ cart: [mockProduct] });
    const { container } = render(
      <MemoryRouter>
        <Checkout />
      </MemoryRouter>
    );

    const couponInput = screen.getByPlaceholderText('Enter code here');
    fireEvent.change(couponInput, { target: { value: 'SAVE10' } });
    fireEvent.click(screen.getByText('Apply'));
    expect(await screen.findByText(/SAVE10 Applied/i)).toBeInTheDocument();

    const xBtn = container.querySelector('.text-green-800 button') || container.querySelector('button.text-green-800');
    if (xBtn) {
      fireEvent.click(xBtn);
    } else {
      const buttons = container.querySelectorAll('button');
      const removeBtn = Array.from(buttons).find(b => b.closest('.text-green-800'));
      if (removeBtn) fireEvent.click(removeBtn);
    }
    expect(screen.queryByText(/SAVE10 Applied/i)).not.toBeInTheDocument();
  });

  it('shows coupon error on invalid code', async () => {
    const mockPost = vi.mocked(axiosInstance.post);
    mockPost.mockRejectedValue({
      response: { data: { message: 'Invalid coupon code' } },
    });

    useCartStore.setState({ cart: [mockProduct] });
    renderCheckout();

    const couponInput = screen.getByPlaceholderText('Enter code here');
    fireEvent.change(couponInput, { target: { value: 'INVALID' } });
    fireEvent.click(screen.getByText('Apply'));

    const hotToast = await import('react-hot-toast');
    await waitFor(() => expect(hotToast.default.error).toHaveBeenCalled());
  });

  it('pre-fills user name and email when authenticated', () => {
    useCartStore.setState({ cart: [mockProduct] });
    useAuthStore.setState({
      user: { _id: 'u1', name: 'Jane Doe', email: 'jane@test.com', role: 'user' },
      isAuthenticated: true,
    });
    renderCheckout();
    expect(screen.getByDisplayValue('jane@test.com')).toBeInTheDocument();
  });

  it('pre-fills default address when user has addresses', () => {
    useCartStore.setState({ cart: [mockProduct] });
    useAuthStore.setState({
      user: {
        _id: 'u1', name: 'Jane Doe', email: 'jane@test.com', role: 'user',
        addresses: [
          { _id: 'a1', street: '456 Oak St', city: 'NYC', zipCode: '10001', isDefault: true },
        ],
      },
      isAuthenticated: true,
    });
    renderCheckout();
    expect(screen.getByDisplayValue('456 Oak St')).toBeInTheDocument();
    expect(screen.getByDisplayValue('NYC')).toBeInTheDocument();
    expect(screen.getByDisplayValue('10001')).toBeInTheDocument();
  });

  it('shows saved address quick select buttons', () => {
    useCartStore.setState({ cart: [mockProduct] });
    useAuthStore.setState({
      user: {
        _id: 'u1', name: 'Jane Doe', email: 'jane@test.com', role: 'user',
        addresses: [
          { _id: 'a1', street: '456 Oak St', city: 'NYC', zipCode: '10001', isDefault: true },
        ],
      },
      isAuthenticated: true,
    });
    renderCheckout();
    expect(screen.getByText('456 Oak St')).toBeInTheDocument();
    expect(screen.getByText('NYC, 10001')).toBeInTheDocument();
    expect(screen.getByText('Default')).toBeInTheDocument();
  });

  it('shows order summary with subtotal and free shipping', () => {
    useCartStore.setState({ cart: [mockProduct] });
    renderCheckout();
    const prices = screen.getAllByText('$399.98');
    expect(prices.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Free')).toBeInTheDocument();
  });
});
