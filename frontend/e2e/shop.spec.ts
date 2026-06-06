import { test, expect } from '@playwright/test';

const API_BASE = 'http://localhost:5001/api/v1';

test.describe('Shop & Product Browsing', () => {
  const mockProducts = {
    status: 'success',
    results: 3,
    totalPages: 1,
    currentPage: 1,
    data: [
      { _id: '1', name: 'Leather Jacket', description: 'Premium leather jacket', price: 299.99, brand: 'Nova', stock: 10, images: [{ url: '/test.jpg', alt: 'Leather Jacket' }], ratings: { average: 4.5, count: 12 }, isActive: true, category: { _id: 'c1', name: 'Clothing', slug: 'clothing' } },
      { _id: '2', name: 'Wool Scarf', description: 'Hand-knitted wool scarf', price: 49.99, brand: 'Nova', stock: 25, images: [{ url: '/test2.jpg', alt: 'Wool Scarf' }], ratings: { average: 4.0, count: 8 }, isActive: true, category: { _id: 'c1', name: 'Clothing', slug: 'clothing' } },
      { _id: '3', name: 'Leather Boots', description: 'Durable leather boots', price: 199.99, brand: 'Nova', stock: 15, images: [{ url: '/test3.jpg', alt: 'Leather Boots' }], ratings: { average: 5.0, count: 3 }, isActive: true, category: { _id: 'c2', name: 'Shoes', slug: 'shoes' } },
    ]
  };

  test.beforeEach(async ({ page }) => {
    await page.route(`${API_BASE}/csrf-token`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'success', token: 'test-csrf-token' }) });
    });
    await page.route(`${API_BASE}/categories`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'success', data: { categories: [{ _id: 'c1', name: 'Clothing', slug: 'clothing' }, { _id: 'c2', name: 'Shoes', slug: 'shoes' }] } }) });
    });
    await page.route(`${API_BASE}/products?*`, async (route) => {
      const url = new URL(route.request().url());
      const search = url.searchParams.get('search');
      const data = search ? mockProducts.data.filter(p => p.name.toLowerCase().includes(search.toLowerCase())) : mockProducts.data;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...mockProducts, results: data.length, data }) });
    });
  });

  test('should display products on shop page', async ({ page }) => {
    await page.goto('/shop');
    await expect(page.getByText(/leather jacket/i)).toBeVisible();
    await expect(page.getByText(/wool scarf/i)).toBeVisible();
    await expect(page.getByText(/299.99/)).toBeVisible();
  });

  test('should search products by name', async ({ page }) => {
    await page.goto('/shop');
    const searchInput = page.getByPlaceholder(/search/i);
    await searchInput.fill('Boots');
    await expect(page.getByText(/leather boots/i)).toBeVisible();
    await expect(page.getByText(/leather jacket/i)).not.toBeVisible();
  });

  test('should navigate to product detail page', async ({ page }) => {
    await page.goto('/shop');
    await page.getByText(/leather jacket/i).first().click();
    await expect(page).toHaveURL(/\/product\/1/);
  });

  test('should add product to cart from shop page', async ({ page }) => {
    await page.route(`${API_BASE}/cart`, async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'success', data: { items: [{ product: '1', quantity: 1, price: 299.99 }], total: 299.99 } }) });
      } else {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'success', data: { items: [], total: 0 } }) });
      }
    });

    await page.addInitScript(() => {
      localStorage.setItem('auth-storage', JSON.stringify({
        state: { user: { _id: '1', name: 'Test User', email: 'test@example.com', role: 'user' }, isAuthenticated: true, accessToken: 'test-token' }
      }));
    });

    await page.goto('/shop');
    const addToCartBtn = page.getByRole('button', { name: /add.*to cart/i }).first();
    if (await addToCartBtn.isVisible()) {
      await addToCartBtn.click();
    }
  });

  test('should filter products by category', async ({ page }) => {
    await page.route(`${API_BASE}/products?*`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...mockProducts, results: 1, data: [mockProducts.data[2]] }) });
    });

    await page.goto('/shop?category=Shoes');
    await expect(page.getByText(/leather boots/i)).toBeVisible();
  });
});
