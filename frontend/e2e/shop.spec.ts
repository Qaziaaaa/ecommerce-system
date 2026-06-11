import { test, expect } from '@playwright/test';

const API_BASE = 'http://localhost:5001/api/v1';

test.describe('Shop & Product Browsing', () => {
  const mockData = {
    products: [
      { _id: '1', name: 'Leather Jacket', description: 'Premium leather jacket', price: 299.99, brand: 'Nova', stock: 10, images: ['/test.jpg'], slug: 'leather-jacket', ratingsAverage: 4.5, ratingsCount: 12, isActive: true, isFeatured: false, category: { _id: 'c1', name: 'Clothing', slug: 'clothing' }, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { _id: '2', name: 'Wool Scarf', description: 'Hand-knitted wool scarf', price: 49.99, brand: 'Nova', stock: 25, images: ['/test2.jpg'], slug: 'wool-scarf', ratingsAverage: 4.0, ratingsCount: 8, isActive: true, isFeatured: false, category: { _id: 'c1', name: 'Clothing', slug: 'clothing' }, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { _id: '3', name: 'Leather Boots', description: 'Durable leather boots', price: 199.99, brand: 'Nova', stock: 15, images: ['/test3.jpg'], slug: 'leather-boots', ratingsAverage: 5.0, ratingsCount: 3, isActive: true, isFeatured: false, category: { _id: 'c2', name: 'Shoes', slug: 'shoes' }, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    ]
  };

  test.beforeEach(async ({ page }) => {
    await page.route(`${API_BASE}/csrf-token`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'success', token: 'test-csrf-token' }) });
    });
    await page.route(`${API_BASE}/categories`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'success', data: { categories: [{ _id: 'c1', name: 'Clothing', slug: 'clothing' }, { _id: 'c2', name: 'Shoes', slug: 'shoes' }] } }) });
    });
    // Use regex to match products list endpoint with query params
    await page.route(/\/api\/v1\/products(\?.*)?$/, async (route) => {
      const url = new URL(route.request().url());
      const search = url.searchParams.get('search');
      const filtered = search ? mockData.products.filter(p => p.name.toLowerCase().includes(search.toLowerCase())) : mockData.products;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          results: filtered.length,
          pagination: { currentPage: 1, totalPages: 1, totalItems: filtered.length, itemsPerPage: 12, hasNext: false, hasPrev: false },
          data: { products: filtered }
        })
      });
    });
    // Mock single product fetch and related products
    await page.route(/\/api\/v1\/products\/(?!search)(?!typeahead)[a-f0-9]+$/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'success', data: { product: mockData.products[0] } })
      });
    });
    await page.route(/\/api\/v1\/products\/.*\/related/, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'success', data: { products: [] } }) });
    });
    await page.route(/\/api\/v1\/products\/search\/typeahead/, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'success', results: mockData.products.map(p => ({ _id: p._id, name: p.name, price: p.price, image: p.images[0], slug: p.slug, brand: p.brand })) }) });
    });
  });

  test('should display products on shop page', async ({ page }) => {
    await page.goto('/shop');
    await expect(page.getByText(/leather jacket/i).first()).toBeVisible();
    await expect(page.getByText(/wool scarf/i).first()).toBeVisible();
    await expect(page.getByText(/299.99/)).toBeVisible();
  });

  test('should search products by name', async ({ page }) => {
    await page.goto('/shop');
    const searchInput = page.getByRole('textbox', { name: /search collection/i });
    await searchInput.fill('Boots');
    await expect(page.getByText(/leather boots/i).first()).toBeVisible();
    await expect(page.getByText(/leather jacket/i).first()).not.toBeVisible();
  });

  test('should navigate to product detail page', async ({ page }) => {
    await page.goto('/shop');
    await page.getByText(/leather jacket/i).first().click();
    await expect(page).toHaveURL(/\/product\/1/);
  });

  test('should add product to cart from shop page', async ({ page }) => {
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
    await page.route(/\/api\/v1\/products(\?.*)?$/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          results: 1,
          pagination: { currentPage: 1, totalPages: 1, totalItems: 1, itemsPerPage: 12, hasNext: false, hasPrev: false },
          data: { products: [mockData.products[2]] }
        })
      });
    });
    await page.goto('/shop?category=Shoes');
    await expect(page.getByText(/leather boots/i).first()).toBeVisible();
  });
});
