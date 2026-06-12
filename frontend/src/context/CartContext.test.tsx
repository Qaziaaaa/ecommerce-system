import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CartProvider, useCart } from '../context/CartContext';

function TestComponent() {
  const { cart, addToCart, updateQuantity, removeFromCart, clearCart, cartTotal, cartCount } = useCart();
  return (
    <div>
      <span data-testid="count">{cartCount}</span>
      <span data-testid="total">{cartTotal.toFixed(2)}</span>
      <ul>
        {cart.map((item) => (
          <li key={item.id} data-testid={`cart-item-${item.id}`}>
            {item.name} x{item.quantity} - ${(item.price * item.quantity).toFixed(2)}
          </li>
        ))}
      </ul>
      <button onClick={() => addToCart({ id: 1, name: 'Tote Bag', price: 85, tag: 'BEST SELLER', category: 'Bags', img: '/bag.jpg', description: 'A bag' })}>
        Add Tote
      </button>
      <button onClick={() => addToCart({ id: 2, name: 'Wallet', price: 45, tag: 'NEW', category: 'Accessories', img: '/wallet.jpg', description: 'A wallet' })}>
        Add Wallet
      </button>
      <button onClick={() => updateQuantity(1, 1)}>Increase Tote</button>
      <button onClick={() => updateQuantity(1, -1)}>Decrease Tote</button>
      <button onClick={() => removeFromCart(2)}>Remove Wallet</button>
      <button onClick={() => clearCart()}>Clear</button>
    </div>
  );
}

function renderWithCart(ui: React.ReactElement) {
  return render(<CartProvider>{ui}</CartProvider>);
}

describe('CartContext', () => {
  it('starts with empty cart', () => {
    renderWithCart(<TestComponent />);
    expect(screen.getByTestId('count').textContent).toBe('0');
    expect(screen.getByTestId('total').textContent).toBe('0.00');
  });

  it('adds item to cart', () => {
    renderWithCart(<TestComponent />);
    fireEvent.click(screen.getByText('Add Tote'));
    expect(screen.getByTestId('cart-item-1')).toBeInTheDocument();
    expect(screen.getByTestId('cart-item-1').textContent).toContain('Tote Bag x1');
    expect(screen.getByTestId('count').textContent).toBe('1');
    expect(screen.getByTestId('total').textContent).toBe('85.00');
  });

  it('increments quantity for existing item', () => {
    renderWithCart(<TestComponent />);
    fireEvent.click(screen.getByText('Add Tote'));
    fireEvent.click(screen.getByText('Add Tote'));
    expect(screen.getByTestId('cart-item-1').textContent).toContain('x2');
    expect(screen.getByTestId('count').textContent).toBe('2');
    expect(screen.getByTestId('total').textContent).toBe('170.00');
  });

  it('increases quantity via updateQuantity', () => {
    renderWithCart(<TestComponent />);
    fireEvent.click(screen.getByText('Add Tote'));
    fireEvent.click(screen.getByText('Increase Tote'));
    expect(screen.getByTestId('cart-item-1').textContent).toContain('x2');
    expect(screen.getByTestId('count').textContent).toBe('2');
  });

  it('decreases quantity via updateQuantity', () => {
    renderWithCart(<TestComponent />);
    fireEvent.click(screen.getByText('Add Tote'));
    fireEvent.click(screen.getByText('Increase Tote'));
    fireEvent.click(screen.getByText('Decrease Tote'));
    expect(screen.getByTestId('cart-item-1').textContent).toContain('x1');
    expect(screen.getByTestId('count').textContent).toBe('1');
  });

  it('does not decrease quantity below 1', () => {
    renderWithCart(<TestComponent />);
    fireEvent.click(screen.getByText('Add Tote'));
    fireEvent.click(screen.getByText('Decrease Tote'));
    expect(screen.getByTestId('cart-item-1').textContent).toContain('x1');
    expect(screen.getByTestId('count').textContent).toBe('1');
  });

  it('removes item from cart', () => {
    renderWithCart(<TestComponent />);
    fireEvent.click(screen.getByText('Add Tote'));
    fireEvent.click(screen.getByText('Add Wallet'));
    expect(screen.getByTestId('cart-item-1')).toBeInTheDocument();
    expect(screen.getByTestId('cart-item-2')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Remove Wallet'));
    expect(screen.queryByTestId('cart-item-2')).toBeNull();
    expect(screen.getByTestId('cart-item-1')).toBeInTheDocument();
  });

  it('clears cart', () => {
    renderWithCart(<TestComponent />);
    fireEvent.click(screen.getByText('Add Tote'));
    fireEvent.click(screen.getByText('Add Wallet'));
    fireEvent.click(screen.getByText('Clear'));
    expect(screen.queryByTestId('cart-item-1')).toBeNull();
    expect(screen.queryByTestId('cart-item-2')).toBeNull();
    expect(screen.getByTestId('count').textContent).toBe('0');
  });

  it('computes correct total for multiple items', () => {
    renderWithCart(<TestComponent />);
    fireEvent.click(screen.getByText('Add Tote'));
    fireEvent.click(screen.getByText('Add Wallet'));
    expect(screen.getByTestId('total').textContent).toBe('130.00');
  });

  it('useCart throws without CartProvider', () => {
    function BadComponent() {
      useCart();
      return null;
    }
    expect(() => render(<BadComponent />)).toThrow('useCart must be used within a CartProvider');
  });
});
