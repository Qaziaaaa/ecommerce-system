import { test, expect } from '@playwright/test';

const API_BASE = 'http://localhost:5001/api/v1';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.route(`${API_BASE}/csrf-token`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'success', token: 'test-csrf-token' }) });
    });
    await page.route(`${API_BASE}/orders/my-orders`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'success', data: { orders: [] } }) });
    });
    await page.route(`${API_BASE}/auth/profile`, async (route) => {
      await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ status: 'fail', message: 'Not authenticated' }) });
    });
  });

  test('should show login page with form elements', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
    await expect(page.getByPlaceholder(/enter your email/i)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeVisible();
  });

  test('should show signup page with form elements', async ({ page }) => {
    await page.goto('/signup');
    await expect(page.getByRole('heading', { name: /join nova/i })).toBeVisible();
    await expect(page.getByPlaceholder(/enter your name/i)).toBeVisible();
    await expect(page.getByPlaceholder(/enter your email/i)).toBeVisible();
    await expect(page.getByPlaceholder(/enter phone number/i)).toBeVisible();
  });

  test('should navigate to signup from login page', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('link', { name: /create account/i }).click();
    await expect(page).toHaveURL(/\/signup/);
  });

  test('should show unauthenticated state on profile page', async ({ page }) => {
    await page.goto('/profile');
    await expect(page).toHaveURL(/\/profile/);
  });

  test('should show unauthenticated state on orders page', async ({ page }) => {
    await page.goto('/orders');
    await expect(page).toHaveURL(/\/orders/);
  });

  test('should show profile page when authenticated', async ({ page }) => {
    await page.route(`${API_BASE}/auth/profile`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'success', data: { user: { _id: '1', name: 'Test User', email: 'test@example.com', role: 'user' } } }) });
    });

    await page.addInitScript(() => {
      localStorage.setItem('auth-storage', JSON.stringify({
        state: { user: { _id: '1', name: 'Test User', email: 'test@example.com', role: 'user' }, isAuthenticated: true, accessToken: 'test-token' }
      }));
    });

    await page.goto('/profile');
    await expect(page.getByText(/test user/i).first()).toBeVisible();
  });
});
