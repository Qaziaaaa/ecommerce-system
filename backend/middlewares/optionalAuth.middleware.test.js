import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../utils/jwt.util.js', () => ({ verifyToken: vi.fn() }));
vi.mock('../models/User.js', () => ({ default: { findById: vi.fn() } }));

let optionalAuth, verifyToken, User;

beforeEach(async () => {
  vi.clearAllMocks();
  verifyToken = (await import('../utils/jwt.util.js')).verifyToken;
  User = (await import('../models/User.js')).default;
  optionalAuth = (await import('./optionalAuth.middleware.js')).optionalAuth;
});

it('attaches user when valid Bearer token is present', async () => {
  const req = { headers: { authorization: 'Bearer valid-token' } };
  const res = {};
  const next = vi.fn();
  verifyToken.mockReturnValue({ userId: 'u1' });
  User.findById.mockResolvedValue({ _id: 'u1', name: 'Test' });

  await optionalAuth(req, res, next);
  expect(req.user).toEqual({ _id: 'u1', name: 'Test' });
  expect(next).toHaveBeenCalled();
});

it('proceeds without user when no token present', async () => {
  const req = { headers: {} };
  const res = {};
  const next = vi.fn();

  await optionalAuth(req, res, next);
  expect(req.user).toBeUndefined();
  expect(next).toHaveBeenCalled();
});

it('proceeds without user when token is invalid', async () => {
  const req = { headers: { authorization: 'Bearer bad-token' } };
  const res = {};
  const next = vi.fn();
  verifyToken.mockImplementation(() => { throw new Error('jwt malformed'); });

  await optionalAuth(req, res, next);
  expect(req.user).toBeUndefined();
  expect(next).toHaveBeenCalled();
});

it('proceeds if User.findById fails', async () => {
  const req = { headers: { authorization: 'Bearer valid-token' } };
  const res = {};
  const next = vi.fn();
  verifyToken.mockReturnValue({ userId: 'u1' });
  User.findById.mockResolvedValue(null);

  await optionalAuth(req, res, next);
  expect(req.user).toBeUndefined();
  expect(next).toHaveBeenCalled();
});
