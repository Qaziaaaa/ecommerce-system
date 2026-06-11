import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('crypto', () => ({
  default: {
    randomBytes: vi.fn(() => ({ toString: vi.fn(() => 'a'.repeat(64)) })),
  },
}));

let csrf;

beforeEach(async () => {
  vi.clearAllMocks();
  csrf = await import('./csrf.middleware.js');
});

describe('csrfProtection', () => {
  it('skips protection for GET requests', () => {
    const req = { method: 'GET', headers: {}, cookies: {} };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    csrf.csrfProtection(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 403 when no token provided', () => {
    const req = { method: 'POST', headers: {}, cookies: {} };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    csrf.csrfProtection(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ csrfRetry: true }));
  });

  it('calls next when valid x-xsrf-token header provided', () => {
    const req = { method: 'POST', headers: { 'x-xsrf-token': 'a'.repeat(64) }, cookies: {} };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    csrf.csrfProtection(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('returns 403 for invalid token format', () => {
    const req = { method: 'POST', headers: { 'x-xsrf-token': 'not-hex' }, cookies: {} };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    csrf.csrfProtection(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Invalid CSRF token.' }));
  });

  it('accepts token from cookie when no header', () => {
    const req = { method: 'POST', headers: {}, cookies: { 'XSRF-TOKEN': 'a'.repeat(64) } };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    csrf.csrfProtection(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('accepts token from Bearer auth header', () => {
    const req = { method: 'POST', headers: { authorization: `Bearer ${'b'.repeat(64)}` }, cookies: {} };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    csrf.csrfProtection(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('handles PUT and DELETE methods', () => {
    for (const method of ['PUT', 'DELETE', 'PATCH']) {
      const req = { method, headers: { 'x-xsrf-token': 'a'.repeat(64) }, cookies: {} };
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
      const next = vi.fn();
      csrf.csrfProtection(req, res, next);
      expect(next).toHaveBeenCalled();
    }
  });
});

describe('setTokenCookie', () => {
  it('sets XSRF-TOKEN cookie with random hex token', () => {
    const res = { cookie: vi.fn() };
    const token = csrf.setTokenCookie(res);
    expect(res.cookie).toHaveBeenCalledWith('XSRF-TOKEN', expect.any(String), expect.any(Object));
    expect(token).toBe('a'.repeat(64));
  });

  it('uses secure SameSite=None in production', () => {
    process.env.NODE_ENV = 'production';
    const res = { cookie: vi.fn() };
    csrf.setTokenCookie(res);
    expect(res.cookie).toHaveBeenCalledWith('XSRF-TOKEN', expect.any(String), expect.objectContaining({ secure: true, sameSite: 'None' }));
    delete process.env.NODE_ENV;
  });
});
