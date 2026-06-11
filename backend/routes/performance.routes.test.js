import { describe, it, expect } from 'vitest';
import router from './performance.routes.js';

describe('Performance Routes', () => {
  it('should be an Express router', () => {
    expect(typeof router).toBe('function');
    expect(router.stack).toBeDefined();
  });

  it('should have public health check route', () => {
    const route = router.stack.find(l => l.route && l.route.path === '/health' && l.route.methods.get);
    expect(route).toBeDefined();
  });

  it('should have public POST /metrics route', () => {
    const route = router.stack.find(l => l.route && l.route.path === '/metrics' && l.route.methods.post);
    expect(route).toBeDefined();
  });

  it('should have protected GET /summary route', () => {
    const route = router.stack.find(l => l.route && l.route.path === '/summary' && l.route.methods.get);
    expect(route).toBeDefined();
  });

  it('should have protected GET /metrics/query route', () => {
    const route = router.stack.find(l => l.route && l.route.path === '/metrics/query' && l.route.methods.get);
    expect(route).toBeDefined();
  });

  it('should have protected admin GET /alerts route', () => {
    const route = router.stack.find(l => l.route && l.route.path === '/alerts' && l.route.methods.get);
    expect(route).toBeDefined();
  });

  it('should have protected admin report routes', () => {
    const paths = router.stack
      .filter(l => l.route && l.route.methods.get)
      .map(l => l.route.path);
    expect(paths).toContain('/report/daily');
    expect(paths).toContain('/report/deployment');
  });

  it('should have protected admin POST /alerts/rules route', () => {
    const route = router.stack.find(l => l.route && l.route.path === '/alerts/rules' && l.route.methods.post);
    expect(route).toBeDefined();
  });

  it('should have protected admin POST /alerts/channels route', () => {
    const route = router.stack.find(l => l.route && l.route.path === '/alerts/channels' && l.route.methods.post);
    expect(route).toBeDefined();
  });
});
