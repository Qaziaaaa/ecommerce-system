import { describe, it, expect } from 'vitest';
import router from './order.routes.js';

describe('Order Routes', () => {
  it('should be an Express router', () => {
    expect(typeof router).toBe('function');
    expect(router.stack).toBeDefined();
  });

  it('should have guest checkout routes without protect middleware', () => {
    const guestLayers = router.stack.filter(l => l.route && !l.route.path.startsWith('/:'));
    const guestPaths = guestLayers.map(l => l.route.path);
    expect(guestPaths).toContain('/guest-checkout');
    expect(guestPaths).toContain('/guest-create-payment-intent');
  });

  it('should have a use-level protect middleware', () => {
    const protectLayer = router.stack.find(l => !l.route);
    expect(protectLayer).toBeDefined();
  });

  it('should have protected routes', () => {
    const protectedRoutes = router.stack.filter(l => l.route);
    const paths = protectedRoutes.map(l => l.route.path);
    expect(paths).toContain('/');
    expect(paths).toContain('/checkout');
    expect(paths).toContain('/create-payment-intent');
    expect(paths).toContain('/cancel-payment-intent');
    expect(paths).toContain('/my-orders');
    expect(paths).toContain('/:id');
    expect(paths).toContain('/:id/status');
  });

  it('should have GET / for isAdmin only', () => {
    const route = router.stack.find(l => l.route && l.route.path === '/' && l.route.methods.get);
    expect(route).toBeDefined();
  });

  it('should have POST routes', () => {
    const postRoutes = router.stack
      .filter(l => l.route && l.route.methods.post)
      .map(l => l.route.path);
    expect(postRoutes).toContain('/checkout');
    expect(postRoutes).toContain('/create-payment-intent');
    expect(postRoutes).toContain('/cancel-payment-intent');
  });

  it('should have GET /my-orders for authenticated user', () => {
    const route = router.stack.find(l => l.route && l.route.path === '/my-orders' && l.route.methods.get);
    expect(route).toBeDefined();
  });

  it('should have GET /:id for single order', () => {
    const route = router.stack.find(l => l.route && l.route.path === '/:id' && l.route.methods.get);
    expect(route).toBeDefined();
  });

  it('should have PATCH /:id/status for admin', () => {
    const route = router.stack.find(l => l.route && l.route.path === '/:id/status' && l.route.methods.patch);
    expect(route).toBeDefined();
  });

  it('should have DELETE /:id for order deletion', () => {
    const route = router.stack.find(l => l.route && l.route.path === '/:id' && l.route.methods.delete);
    expect(route).toBeDefined();
  });
});
