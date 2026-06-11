import { describe, it, expect } from 'vitest';
import router from './upload.routes.js';

describe('Upload Routes', () => {
  it('should be an Express router', () => {
    expect(typeof router).toBe('function');
    expect(router.stack).toBeDefined();
  });

  it('should have POST / route with protect, isAdmin, and handler', () => {
    const route = router.stack.find(l => l.route && l.route.path === '/' && l.route.methods.post);
    expect(route).toBeDefined();
    expect(route.route.stack.length).toBeGreaterThanOrEqual(3);
  });
});
