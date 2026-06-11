import { describe, it, expect } from 'vitest';
import router from './coupon.routes.js';

describe('Coupon Routes', () => {
  it('should be an Express router', () => {
    expect(typeof router).toBe('function');
    expect(router.stack).toBeDefined();
  });

  it('should have POST /apply with protect and applyCoupon', () => {
    const route = router.stack.find(l => l.route && l.route.path === '/apply' && l.route.methods.post);
    expect(route).toBeDefined();
    expect(route.route.stack.length).toBe(2);
  });
});
