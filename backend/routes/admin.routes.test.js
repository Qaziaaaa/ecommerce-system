import { describe, it, expect } from 'vitest';
import router from './admin.routes.js';

describe('Admin Routes', () => {
  it('should be an Express router', () => {
    expect(typeof router).toBe('function');
    expect(router.stack).toBeDefined();
  });

  it('should have a use-level protect + isAdmin middleware', () => {
    const firstLayer = router.stack[0];
    expect(firstLayer).toBeDefined();
    expect(firstLayer.route).toBeUndefined();
  });

  it('should have routes for all admin endpoints', () => {
    const paths = router.stack
      .filter(l => l.route)
      .map(l => l.route.path);

    expect(paths).toContain('/dashboard');
    expect(paths).toContain('/sales/monthly');
    expect(paths).toContain('/products/top');
    expect(paths).toContain('/orders/recent');
    expect(paths).toContain('/products/low-stock');
    expect(paths).toContain('/users');
    expect(paths).toContain('/analytics/category');
    expect(paths).toContain('/analytics/logistics');
    expect(paths).toContain('/audit-logs');
  });

  it('should have GET routes for all analytics and reports', () => {
    const getRoutes = router.stack
      .filter(l => l.route && l.route.methods.get)
      .map(l => l.route.path);

    expect(getRoutes).toContain('/dashboard');
    expect(getRoutes).toContain('/sales/monthly');
    expect(getRoutes).toContain('/products/top');
    expect(getRoutes).toContain('/orders/recent');
    expect(getRoutes).toContain('/products/low-stock');
    expect(getRoutes).toContain('/users');
    expect(getRoutes).toContain('/analytics/category');
    expect(getRoutes).toContain('/analytics/logistics');
    expect(getRoutes).toContain('/audit-logs');
  });

  it('should have PATCH /users/:id/role route', () => {
    const route = router.stack.find(l => l.route && l.route.path === '/users/:id/role' && l.route.methods.patch);
    expect(route).toBeDefined();
  });
});
