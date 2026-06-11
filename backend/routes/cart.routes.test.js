import { describe, it, expect } from 'vitest';
import router from './cart.routes.js';

describe('Cart Routes', () => {
  it('should be an Express router', () => {
    expect(typeof router).toBe('function');
    expect(router.stack).toBeDefined();
  });

  it('should have a use-level middleware (protect)', () => {
    expect(router.stack.length).toBe(3);
    const protectLayer = router.stack[0];
    expect(protectLayer.route).toBeUndefined();
  });

  it('should have GET / route', () => {
    const route = router.stack.find(l => l.route && l.route.path === '/' && l.route.methods.get);
    expect(route).toBeDefined();
  });

  it('should have POST / route', () => {
    const route = router.stack.find(l => l.route && l.route.path === '/' && l.route.methods.post);
    expect(route).toBeDefined();
  });

  it('should have PATCH /:productId route', () => {
    const route = router.stack.find(l => l.route && l.route.path === '/:productId' && l.route.methods.patch);
    expect(route).toBeDefined();
  });

  it('should have DELETE /:productId route', () => {
    const route = router.stack.find(l => l.route && l.route.path === '/:productId' && l.route.methods.delete);
    expect(route).toBeDefined();
  });
});
