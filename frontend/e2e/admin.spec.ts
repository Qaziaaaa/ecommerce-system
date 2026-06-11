import { test, expect } from '@playwright/test';

const API_BASE = 'http://localhost:5001/api/v1';

test.describe('Admin Panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.route(`${API_BASE}/csrf-token`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'success', token: 'test-csrf-token' }) });
    });
  });

  test('should redirect non-admin user from admin routes', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('auth-storage', JSON.stringify({
        state: { user: { _id: '2', name: 'Regular User', email: 'user@test.com', role: 'user' }, isAuthenticated: true, accessToken: 'test-user-token' }
      }));
    });
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/login/);
  });

  test('should load admin dashboard with metrics', async ({ page }) => {
    await page.route(`${API_BASE}/admin/dashboard`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'success', data: { totalUsers: 10, totalOrders: 25, totalRevenue: 5000, totalProducts: 15 } }) });
    });
    await page.route(`${API_BASE}/admin/sales/monthly`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'success', data: [] }) });
    });
    await page.route(`${API_BASE}/admin/analytics/category`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'success', data: [] }) });
    });
    await page.route(`${API_BASE}/admin/analytics/logistics`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'success', data: [] }) });
    });
    await page.route(`${API_BASE}/admin/products/top`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'success', data: [] }) });
    });
    await page.addInitScript(() => {
      localStorage.setItem('auth-storage', JSON.stringify({
        state: { user: { _id: '1', name: 'Admin User', email: 'admin@nova.com', role: 'admin' }, isAuthenticated: true, accessToken: 'test-admin-token' }
      }));
    });
    await page.goto('/admin');
    await expect(page.getByText(/dashboard/i).first()).toBeVisible();
  });

  test('should show sidebar navigation for admin', async ({ page }) => {
    await page.route(`${API_BASE}/admin/dashboard`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'success', data: { totalUsers: 10, totalOrders: 25, totalRevenue: 5000, totalProducts: 15 } }) });
    });
    await page.route(`${API_BASE}/admin/sales/monthly`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'success', data: [] }) });
    });
    await page.route(`${API_BASE}/admin/analytics/category`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'success', data: [] }) });
    });
    await page.route(`${API_BASE}/admin/analytics/logistics`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'success', data: [] }) });
    });
    await page.route(`${API_BASE}/admin/products/top`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'success', data: [] }) });
    });
    await page.addInitScript(() => {
      localStorage.setItem('auth-storage', JSON.stringify({
        state: { user: { _id: '1', name: 'Admin User', email: 'admin@nova.com', role: 'admin' }, isAuthenticated: true, accessToken: 'test-admin-token' }
      }));
    });
    await page.goto('/admin');
    await expect(page.getByRole('link', { name: /products/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /orders/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /users/i })).toBeVisible();
  });

  test('should display admin products list', async ({ page }) => {
    await page.route(`${API_BASE}/admin/products`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'success', data: { products: [{ _id: '1', name: 'Test Product', price: 99.99, stock: 10 }] } }) });
    });
    await page.addInitScript(() => {
      localStorage.setItem('auth-storage', JSON.stringify({
        state: { user: { _id: '1', name: 'Admin User', email: 'admin@nova.com', role: 'admin' }, isAuthenticated: true, accessToken: 'test-admin-token' }
      }));
    });
    await page.goto('/admin/products');
    await expect(page.getByText(/test product/i)).toBeVisible();
  });

  test('should display admin orders list', async ({ page }) => {
    await page.route(`${API_BASE}/orders`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'success', data: { orders: [{ _id: 'o1', user: { name: 'Alice', email: 'alice@test.com' }, orderStatus: 'pending', paymentStatus: 'pending', totalAmount: 150, createdAt: new Date().toISOString() }] } }) });
    });
    await page.addInitScript(() => {
      localStorage.setItem('auth-storage', JSON.stringify({
        state: { user: { _id: '1', name: 'Admin User', email: 'admin@nova.com', role: 'admin' }, isAuthenticated: true, accessToken: 'test-admin-token' }
      }));
    });
    await page.goto('/admin/orders');
    await expect(page.getByText('pending').first()).toBeVisible();
  });

  test('should display admin users list', async ({ page }) => {
    await page.route(`${API_BASE}/admin/users`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'success', data: [{ _id: 'u1', name: 'User One', email: 'user1@test.com', role: 'user', isVerified: true, createdAt: new Date().toISOString() }] }) });
    });
    await page.addInitScript(() => {
      localStorage.setItem('auth-storage', JSON.stringify({
        state: { user: { _id: '1', name: 'Admin User', email: 'admin@nova.com', role: 'admin' }, isAuthenticated: true, accessToken: 'test-admin-token' }
      }));
    });
    await page.goto('/admin/users');
    await expect(page.getByText(/user one/i).first()).toBeVisible();
  });
});
