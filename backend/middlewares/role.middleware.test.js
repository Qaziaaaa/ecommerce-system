import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isAdmin } from './role.middleware.js';

let mockReq, mockRes, mockNext;

beforeEach(() => {
  mockReq = {};
  mockRes = { status: vi.fn().mockReturnThis(), json: vi.fn() };
  mockNext = vi.fn();
});

describe('isAdmin', () => {
  it('calls next if user is admin', () => {
    mockReq.user = { role: 'admin' };
    isAdmin(mockReq, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalled();
  });

  it('returns 403 if user is not admin', () => {
    mockReq.user = { role: 'user' };
    isAdmin(mockReq, mockRes, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringMatching(/admin/i) })
    );
  });

  it('returns 403 if no user on request', () => {
    mockReq.user = null;
    isAdmin(mockReq, mockRes, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(403);
  });
});
