import { describe, it, expect } from 'vitest';
import router from './index.js';

describe('Routes Index', () => {
  it('should be an Express router (function with stack)', () => {
    expect(typeof router).toBe('function');
    expect(router.stack).toBeDefined();
    expect(Array.isArray(router.stack)).toBe(true);
  });

  it('should mount auth routes at /auth', () => {
    const layer = router.stack.find(l => {
      return l.regexp && l.regexp.test && l.regexp.test('/auth/test');
    });
    expect(layer).toBeDefined();
  });

  it('should mount product routes at /products', () => {
    const layer = router.stack.find(l => l.regexp && l.regexp.test('/products/test'));
    expect(layer).toBeDefined();
  });

  it('should mount cart routes at /cart', () => {
    const layer = router.stack.find(l => l.regexp && l.regexp.test('/cart/test'));
    expect(layer).toBeDefined();
  });

  it('should mount order routes at /orders', () => {
    const layer = router.stack.find(l => l.regexp && l.regexp.test('/orders/test'));
    expect(layer).toBeDefined();
  });

  it('should mount admin routes at /admin', () => {
    const layer = router.stack.find(l => l.regexp && l.regexp.test('/admin/test'));
    expect(layer).toBeDefined();
  });

  it('should mount category routes at /categories', () => {
    const layer = router.stack.find(l => l.regexp && l.regexp.test('/categories/test'));
    expect(layer).toBeDefined();
  });

  it('should mount upload routes at /upload', () => {
    const layer = router.stack.find(l => l.regexp && l.regexp.test('/upload/test'));
    expect(layer).toBeDefined();
  });

  it('should mount coupon routes at /coupons', () => {
    const layer = router.stack.find(l => l.regexp && l.regexp.test('/coupons/test'));
    expect(layer).toBeDefined();
  });

  it('should mount wishlist routes at /wishlist', () => {
    const layer = router.stack.find(l => l.regexp && l.regexp.test('/wishlist/test'));
    expect(layer).toBeDefined();
  });

  it('should mount performance routes at /performance', () => {
    const layer = router.stack.find(l => l.regexp && l.regexp.test('/performance/test'));
    expect(layer).toBeDefined();
  });
});
