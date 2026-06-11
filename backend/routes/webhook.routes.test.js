import { describe, it, expect } from 'vitest';
import router from './webhook.routes.js';

describe('Webhook Routes', () => {
  it('should be an Express router', () => {
    expect(typeof router).toBe('function');
    expect(router.stack).toBeDefined();
  });

  it('should have POST /stripe route', () => {
    const route = router.stack.find(l => l.route && l.route.path === '/stripe' && l.route.methods.post);
    expect(route).toBeDefined();
  });
});
