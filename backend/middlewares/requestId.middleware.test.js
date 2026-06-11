import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockChildLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), child: vi.fn() };
vi.mock('../utils/logger.js', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), child: vi.fn() },
  childLogger: vi.fn(() => mockChildLogger),
}));

vi.mock('crypto', () => ({
  default: { randomUUID: vi.fn(() => 'abc-def-123') },
}));

let requestIdMiddleware;

beforeEach(async () => {
  vi.clearAllMocks();
  requestIdMiddleware = (await import('./requestId.middleware.js')).default;
});

it('assigns requestId from x-request-id header', () => {
  const req = { headers: { 'x-request-id': 'client-req-1' }, get: vi.fn() };
  const res = { setHeader: vi.fn() };
  const next = vi.fn();

  requestIdMiddleware(req, res, next);
  expect(req.requestId).toBe('client-req-1');
  expect(res.setHeader).toHaveBeenCalledWith('X-Request-Id', 'client-req-1');
  expect(next).toHaveBeenCalled();
});

it('generates requestId when header is absent', () => {
  const req = { headers: {}, get: vi.fn() };
  const res = { setHeader: vi.fn() };
  const next = vi.fn();

  requestIdMiddleware(req, res, next);
  expect(req.requestId).toMatch(/^req_/);
  expect(res.setHeader).toHaveBeenCalledWith('X-Request-Id', req.requestId);
});

it('attaches childLogger as req.log', () => {
  const req = { headers: {}, get: vi.fn() };
  const res = { setHeader: vi.fn() };
  const next = vi.fn();

  requestIdMiddleware(req, res, next);
  expect(req.log).toBe(mockChildLogger);
});
