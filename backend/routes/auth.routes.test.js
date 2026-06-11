import { describe, it, expect } from 'vitest';
import router from './auth.routes.js';

describe('Auth Routes', () => {
  it('should be an Express router', () => {
    expect(typeof router).toBe('function');
    expect(router.stack).toBeDefined();
  });

  it('should have POST /admin-login route', () => {
    const route = router.stack.find(l => l.route && l.route.path === '/admin-login' && l.route.methods.post);
    expect(route).toBeDefined();
  });

  it('should have POST /send-otp route', () => {
    const route = router.stack.find(l => l.route && l.route.path === '/send-otp' && l.route.methods.post);
    expect(route).toBeDefined();
  });

  it('should have POST /signup route', () => {
    const route = router.stack.find(l => l.route && l.route.path === '/signup' && l.route.methods.post);
    expect(route).toBeDefined();
  });

  it('should have POST /login route', () => {
    const route = router.stack.find(l => l.route && l.route.path === '/login' && l.route.methods.post);
    expect(route).toBeDefined();
  });

  it('should have POST /verify-otp route', () => {
    const route = router.stack.find(l => l.route && l.route.path === '/verify-otp' && l.route.methods.post);
    expect(route).toBeDefined();
  });

  it('should have POST /resend-otp route', () => {
    const route = router.stack.find(l => l.route && l.route.path === '/resend-otp' && l.route.methods.post);
    expect(route).toBeDefined();
  });

  it('should have POST /refresh route', () => {
    const route = router.stack.find(l => l.route && l.route.path === '/refresh' && l.route.methods.post);
    expect(route).toBeDefined();
  });

  it('should have GET /profile route', () => {
    const route = router.stack.find(l => l.route && l.route.path === '/profile' && l.route.methods.get);
    expect(route).toBeDefined();
  });

  it('should have PUT /profile route', () => {
    const route = router.stack.find(l => l.route && l.route.path === '/profile' && l.route.methods.put);
    expect(route).toBeDefined();
  });

  it('should have POST /logout route', () => {
    const route = router.stack.find(l => l.route && l.route.path === '/logout' && l.route.methods.post);
    expect(route).toBeDefined();
  });

  it('should have POST /profile/addresses route', () => {
    const route = router.stack.find(l => l.route && l.route.path === '/profile/addresses' && l.route.methods.post);
    expect(route).toBeDefined();
  });

  it('should have DELETE /profile/addresses/:id route', () => {
    const route = router.stack.find(l => l.route && l.route.path === '/profile/addresses/:id' && l.route.methods.delete);
    expect(route).toBeDefined();
  });

  it('should have PUT /profile/addresses/:id/default route', () => {
    const route = router.stack.find(l => l.route && l.route.path === '/profile/addresses/:id/default' && l.route.methods.put);
    expect(route).toBeDefined();
  });
});
