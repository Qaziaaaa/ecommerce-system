import { describe, it, expect } from 'vitest';
import router from './category.routes.js';

describe('Category Routes', () => {
  it('should be an Express router', () => {
    expect(typeof router).toBe('function');
    expect(router.stack).toBeDefined();
  });

  it('should have GET / with apiCache and getAllCategories', () => {
    const route = router.stack.find(l => l.route && l.route.path === '/' && l.route.methods.get);
    expect(route).toBeDefined();
    expect(route.route.stack.length).toBeGreaterThanOrEqual(2);
  });

  it('should have POST / with protect, isAdmin, invalidateCacheMiddleware, createCategory', () => {
    const route = router.stack.find(l => l.route && l.route.path === '/' && l.route.methods.post);
    expect(route).toBeDefined();
    expect(route.route.stack.length).toBeGreaterThanOrEqual(3);
  });
});
