import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import request from 'supertest';

vi.mock('cors', () => ({ default: vi.fn(() => (req, res, next) => next()) }));
vi.mock('cookie-parser', () => ({ default: vi.fn(() => (req, res, next) => next()) }));
vi.mock('helmet', () => ({ default: vi.fn(() => (req, res, next) => next()) }));
vi.mock('morgan', () => ({ default: vi.fn(() => (req, res, next) => next()) }));
const { compressionMock } = vi.hoisted(() => {
  const fn = () => (req, res, next) => next();
  fn.filter = (req, res) => true;
  return { compressionMock: fn };
});
vi.mock('compression', () => ({ default: compressionMock }));
vi.mock('express-rate-limit', () => ({ default: vi.fn(() => (req, res, next) => next()) }));
vi.mock('crypto', () => ({
  default: {
    randomBytes: vi.fn(() => ({ toString: vi.fn(() => 'mock-csrf-token') })),
  },
}));
vi.mock('@sentry/node', () => ({ default: { init: vi.fn(), setupExpressErrorHandler: vi.fn() } }));
vi.mock('swagger-ui-express', () => ({ default: { serve: [], setup: vi.fn(() => (req, res, next) => next()) } }));
vi.mock('./config/swagger.js', () => ({ default: {} }));

vi.mock('./middlewares/requestId.middleware.js', () => ({ default: (req, res, next) => next() }));
vi.mock('./middlewares/error.middleware.js', () => ({ globalErrorHandler: (err, req, res, next) => res.status(err.statusCode || 500).json({ status: 'error', message: err.message }) }));
vi.mock('./middlewares/performance.middleware.js', () => ({
  performanceMiddleware: (req, res, next) => next(),
  resourceMonitoringMiddleware: (req, res, next) => next(),
  healthCheckMiddleware: (req, res, next) => next(),
  cacheHeadersMiddleware: (req, res, next) => next(),
}));
vi.mock('./middlewares/resilience.middleware.js', () => ({ errorRateMiddleware: (req, res, next) => next() }));

const { mockWebhookRouter, mockMainRouter } = vi.hoisted(() => {
  const wr = () => {};
  wr.post = () => {};
  const mr = () => {};
  mr.get = () => {};
  mr.post = () => {};
  mr.put = () => {};
  mr.patch = () => {};
  mr.delete = () => {};
  mr.use = () => {};
  mr.all = () => {};
  mr.route = () => ({ get: () => mr, post: () => mr });
  return { mockWebhookRouter: wr, mockMainRouter: mr };
});
vi.mock('./routes/index.js', () => ({ default: mockMainRouter }));
vi.mock('./routes/webhook.routes.js', () => ({ default: mockWebhookRouter }));
vi.mock('./middlewares/csrf.middleware.js', () => ({ csrfProtection: (req, res, next) => next(), setTokenCookie: vi.fn(() => 'mock-csrf-token') }));

describe('App', () => {
  let app;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.SENTRY_DSN = '';
    app = (await import('./app.js')).default;
  });

  it('should be a valid Express app', () => {
    expect(app).toBeDefined();
    expect(typeof app).toBe('function');
  });

  it('should return 200 on health endpoint', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.message).toBe('Server is healthy');
  });

  it('should return 200 on API health endpoint', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('should return text on root endpoint', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Nova E-Commerce API is running!');
  });

  it('should return CSRF token on /api/v1/csrf-token', async () => {
    const res = await request(app).get('/api/v1/csrf-token');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.token).toBe('mock-csrf-token');
  });

  it('should redirect /api-docs to /api/v1/docs', async () => {
    const res = await request(app).get('/api-docs');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/api/v1/docs');
  });

  it('should return 404 for unknown routes', async () => {
    const res = await request(app).get('/nonexistent');
    expect(res.status).toBe(404);
  });
});
