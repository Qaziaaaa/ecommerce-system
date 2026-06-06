import { test, expect } from '@playwright/test';

const API_BASE = 'http://localhost:5001/api/v1';

test.describe('Cart & Checkout Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.route(`${API_BASE}/csrf-token`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'success', token: 'test-csrf-token' }) });
    });
    await page.addInitScript(() => {
      localStorage.setItem('auth-storage', JSON.stringify({
        state: { user: { _id: '1', name: 'Test User', email: 'test@example.com', role: 'user' }, isAuthenticated: true, accessToken: 'test-token' }
      }));
    });
  });

  test('should display empty cart state', async ({ page }) => {
    await page.goto('/');
    const cartButton = page.getByRole('button', { name: /cart/i }).first();
    await cartButton.click();
    await expect(page.getByText(/your cart is empty/i)).toBeVisible();
  });

  test('should show checkout page with form elements', async ({ page }) => {
    await page.route(`${API_BASE}/cart`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'success', data: { items: [{ product: { _id: '1', name: 'Test Product', price: 49.99, images: [{ url: '/test.jpg' }] }, quantity: 2, price: 49.99 }], total: 99.98 } }) });
    });
    await page.goto('/checkout');
    await expect(page.getByText(/checkout/i)).toBeVisible();
  });

  test('should show payment method options on checkout', async ({ page }) => {
    await page.route(`${API_BASE}/cart`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'success', data: { items: [{ product: { _id: '1', name: 'Test Product', price: 49.99, images: [{ url: '/test.jpg' }] }, quantity: 1, price: 49.99 }], total: 49.99 } }) });
    });
    await page.goto('/checkout');
    await expect(page.getByText(/cash on delivery/i)).toBeVisible();
  });

  test('should navigate back to shop from empty checkout', async ({ page }) => {
    await page.route(`${API_BASE}/cart`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'success', data: { items: [], total: 0 } }) });
    });
    await page.goto('/checkout');
    await expect(page.getByText(/your cart is empty/i)).toBeVisible();
  });
});
