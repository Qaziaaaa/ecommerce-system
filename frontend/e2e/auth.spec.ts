import { test, expect } from '@playwright/test';

const API_BASE = 'http://localhost:5001/api/v1';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.route(`${API_BASE}/csrf-token`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'success', token: 'test-csrf-token' }) });
    });
  });

  test('should show login page with form elements', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /send otp/i })).toBeVisible();
  });

  test('should show signup page with form elements', async ({ page }) => {
    await page.goto('/signup');
    await expect(page.getByRole('heading', { name: /create account/i })).toBeVisible();
    await expect(page.getByLabel(/name/i)).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/phone/i)).toBeVisible();
  });

  test('should show error on login with invalid email', async ({ page }) => {
    await page.route(`${API_BASE}/auth/login`, async (route) => {
      await route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ status: 'error', message: 'Invalid email address' }) });
    });

    await page.goto('/login');
    await page.getByLabel(/email/i).fill('invalid-email');
    await page.getByRole('button', { name: /send otp/i }).click();
    await expect(page.getByText(/invalid/i)).toBeVisible();
  });

  test('should navigate to signup from login page', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('link', { name: /sign up/i }).click();
    await expect(page).toHaveURL(/\/signup/);
  });

  test('should redirect unauthenticated user from profile to login', async ({ page }) => {
    await page.goto('/profile');
    await expect(page).toHaveURL(/\/login/);
  });

  test('should redirect unauthenticated user from orders to login', async ({ page }) => {
    await page.goto('/orders');
    await expect(page).toHaveURL(/\/login/);
  });

  test('should show profile page when authenticated', async ({ page }) => {
    await page.route(`${API_BASE}/auth/profile`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'success', user: { _id: '1', name: 'Test User', email: 'test@example.com', role: 'user' } }) });
    });

    await page.addInitScript(() => {
      localStorage.setItem('auth-storage', JSON.stringify({
        state: { user: { _id: '1', name: 'Test User', email: 'test@example.com', role: 'user' }, isAuthenticated: true, accessToken: 'test-token' }
      }));
    });

    await page.goto('/profile');
    await expect(page.getByText(/test user/i)).toBeVisible();
  });
});
