import { describe, it, expect } from 'vitest';
import router from './wishlist.routes.js';

describe('Wishlist Routes', () => {
  it('should be an Express router', () => {
    expect(typeof router).toBe('function');
    expect(router.stack).toBeDefined();
  });

  it('should have a use-level protect middleware', () => {
    const protectLayer = router.stack[0];
    expect(protectLayer).toBeDefined();
    expect(protectLayer.route).toBeUndefined();
  });

  it('should have GET / route', () => {
    const route = router.stack.find(l => l.route && l.route.path === '/' && l.route.methods.get);
    expect(route).toBeDefined();
  });

  it('should have POST /:productId route', () => {
    const route = router.stack.find(l => l.route && l.route.path === '/:productId' && l.route.methods.post);
    expect(route).toBeDefined();
  });

  it('should have DELETE /:productId route', () => {
    const route = router.stack.find(l => l.route && l.route.path === '/:productId' && l.route.methods.delete);
    expect(route).toBeDefined();
  });
});
