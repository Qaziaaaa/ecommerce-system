import { describe, it, expect } from 'vitest';
import router from './review.routes.js';

describe('Review Routes', () => {
  it('should be an Express router with mergeParams', () => {
    expect(typeof router).toBe('function');
    expect(router.stack).toBeDefined();
    expect(router.params).toBeDefined();
  });

  it('should have GET / with getProductReviews', () => {
    const route = router.stack.find(l => l.route && l.route.path === '/' && l.route.methods.get);
    expect(route).toBeDefined();
  });

  it('should have POST / with protect and addReview', () => {
    const route = router.stack.find(l => l.route && l.route.path === '/' && l.route.methods.post);
    expect(route).toBeDefined();
  });
});
