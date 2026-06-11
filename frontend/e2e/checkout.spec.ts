import { test, expect } from '@playwright/test';

const API_BASE = 'http://localhost:5001/api/v1';

test.describe('Cart & Checkout Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.route(`${API_BASE}/csrf-token`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'success', token: 'test-csrf-token' }) });
    });
    await page.route(`${API_BASE}/orders/guest-create-payment-intent`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'success', clientSecret: 'pi_test_secret_123', paymentIntentId: 'pi_123' }) });
    });
    await page.addInitScript(() => {
      localStorage.setItem('auth-storage', JSON.stringify({
        state: { user: { _id: '1', name: 'Test User', email: 'test@example.com', role: 'user' }, isAuthenticated: true, accessToken: 'test-token' }
      }));
    });
  });

  test('should display empty cart state', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('nova-cart-storage', JSON.stringify({ state: { cart: [], isCartOpen: false }, version: 0 }));
      localStorage.removeItem('nova-wishlist-storage');
    });
    await page.goto('/');
    // Click the header cart button
    const cartButton = page.getByRole('button', { name: 'Cart (0)' });
    await cartButton.click();
    await expect(page.getByText(/your cart is empty/i)).toBeVisible();
  });

  test('should show checkout page with form elements', async ({ page }) => {
    await page.addInitScript(() => {
      const cartItem = {
        _id: '1', name: 'Test Product', price: 49.99, quantity: 2, stock: 10,
        images: ['/test.jpg'], slug: 'test-product', brand: 'Nova', description: 'Test',
        ratingsAverage: 0, ratingsCount: 0, isActive: true, isFeatured: false,
        category: { _id: 'c1', name: 'Clothing', slug: 'clothing' },
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
      };
      localStorage.setItem('nova-cart-storage', JSON.stringify({ state: { cart: [cartItem], isCartOpen: false }, version: 0 }));
    });
    await page.goto('/checkout');
    await expect(page.getByText(/secure checkout/i)).toBeVisible();
  });

  test('should show payment method options on checkout', async ({ page }) => {
    await page.addInitScript(() => {
      const cartItem = {
        _id: '1', name: 'Test Product', price: 49.99, quantity: 1, stock: 10,
        images: ['/test.jpg'], slug: 'test-product', brand: 'Nova', description: 'Test',
        ratingsAverage: 0, ratingsCount: 0, isActive: true, isFeatured: false,
        category: { _id: 'c1', name: 'Clothing', slug: 'clothing' },
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
      };
      localStorage.setItem('nova-cart-storage', JSON.stringify({ state: { cart: [cartItem], isCartOpen: false }, version: 0 }));
    });
    await page.goto('/checkout');
    await expect(page.getByText(/cash on delivery/i)).toBeVisible();
  });

  test('should navigate back to shop from empty checkout', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('nova-cart-storage', JSON.stringify({ state: { cart: [], isCartOpen: false }, version: 0 }));
    });
    await page.goto('/checkout');
    await expect(page.getByRole('heading', { name: /cart is empty/i })).toBeVisible();
  });
});
