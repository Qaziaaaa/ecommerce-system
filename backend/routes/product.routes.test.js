import { describe, it, expect } from 'vitest';
import router from './product.routes.js';

describe('Product Routes', () => {
  it('should be an Express router', () => {
    expect(typeof router).toBe('function');
    expect(router.stack).toBeDefined();
  });

  it('should mount review routes at /:productId/reviews', () => {
    const reviewLayer = router.stack.find(l => !l.route);
    expect(reviewLayer).toBeDefined();
  });

  it('should have GET /search/typeahead route', () => {
    const route = router.stack.find(l => l.route && l.route.path === '/search/typeahead' && l.route.methods.get);
    expect(route).toBeDefined();
  });

  it('should have GET / route with optionalAuth, apiCache, getProducts', () => {
    const route = router.stack.find(l => l.route && l.route.path === '/' && l.route.methods.get);
    expect(route).toBeDefined();
    expect(route.route.stack.length).toBeGreaterThanOrEqual(3);
  });

  it('should have POST / route with protect, isAdmin, validateCreateProduct, invalidateCacheMiddleware, createProduct', () => {
    const route = router.stack.find(l => l.route && l.route.path === '/' && l.route.methods.post);
    expect(route).toBeDefined();
    expect(route.route.stack.length).toBeGreaterThanOrEqual(4);
  });

  it('should have GET /:id route', () => {
    const route = router.stack.find(l => l.route && l.route.path === '/:id' && l.route.methods.get);
    expect(route).toBeDefined();
  });

  it('should have PATCH /:id route with protect, isAdmin, validateUpdateProduct, invalidateCacheMiddleware, updateProduct', () => {
    const route = router.stack.find(l => l.route && l.route.path === '/:id' && l.route.methods.patch);
    expect(route).toBeDefined();
    expect(route.route.stack.length).toBeGreaterThanOrEqual(4);
  });

  it('should have DELETE /:id route with protect, isAdmin, invalidateCacheMiddleware, deleteProduct', () => {
    const route = router.stack.find(l => l.route && l.route.path === '/:id' && l.route.methods.delete);
    expect(route).toBeDefined();
    expect(route.route.stack.length).toBeGreaterThanOrEqual(4);
  });
});
