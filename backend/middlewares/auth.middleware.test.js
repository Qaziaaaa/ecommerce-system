import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../utils/jwt.util.js', () => ({
  verifyToken: vi.fn(),
}));

vi.mock('../models/User.js', () => ({
  default: { findById: vi.fn() },
}));

import { protect, restrictTo } from './auth.middleware.js';
import { verifyToken } from '../utils/jwt.util.js';
import User from '../models/User.js';

let mockReq, mockRes, mockNext;

beforeEach(() => {
  mockReq = { cookies: {} };
  mockRes = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  };
  mockNext = vi.fn();
});

describe('protect', () => {
  it('returns 401 if no token cookie', async () => {
    await protect(mockReq, mockRes, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringMatching(/not logged in/i) })
    );
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('returns 401 if token is invalid', async () => {
    mockReq.cookies.accessToken = 'bad-token';
    verifyToken.mockImplementation(() => { throw new Error('jwt malformed'); });
    await protect(mockReq, mockRes, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringMatching(/invalid|expired/i) })
    );
  });

  it('returns 401 if user not found', async () => {
    mockReq.cookies.accessToken = 'valid-token';
    verifyToken.mockReturnValue({ userId: 'user123' });
    User.findById.mockReturnValue({ select: vi.fn().mockResolvedValue(null) });
    await protect(mockReq, mockRes, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringMatching(/no longer exists/i) })
    );
  });

  it('attaches user to req and calls next on success', async () => {
    mockReq.cookies.accessToken = 'valid-token';
    const fakeUser = { _id: 'user123', name: 'Test', email: 'test@test.com', role: 'user' };
    verifyToken.mockReturnValue({ userId: 'user123' });
    User.findById.mockReturnValue({ select: vi.fn().mockResolvedValue(fakeUser) });
    await protect(mockReq, mockRes, mockNext);
    expect(mockReq.user).toEqual(fakeUser);
    expect(mockNext).toHaveBeenCalled();
  });
});

describe('restrictTo', () => {
  it('calls next if user has required role', () => {
    mockReq.user = { role: 'admin' };
    restrictTo('admin')(mockReq, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalled();
  });

  it('returns 403 if user lacks required role', () => {
    mockReq.user = { role: 'user' };
    restrictTo('admin')(mockReq, mockRes, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringMatching(/permission/i) })
    );
    expect(mockNext).not.toHaveBeenCalled();
  });
});
