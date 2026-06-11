import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../utils/AppError.js', () => {
  function AppError(message, statusCode) {
    this.message = message;
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
  }
  return { default: AppError };
});

vi.mock('../services/auth.service.js', () => ({
  sendAuthenticationOTP: vi.fn(),
  verifyAuthenticationOTP: vi.fn(),
  resendAuthenticationOTP: vi.fn(),
}));

vi.mock('../utils/jwt.util.js', () => ({
  generateAccessToken: vi.fn(() => 'access-token'),
  generateRefreshToken: vi.fn(() => 'refresh-token'),
  verifyRefreshToken: vi.fn(),
}));

vi.mock('bcryptjs', () => {
  const hash = vi.fn();
  const compare = vi.fn();
  return {
    default: { hash, compare },
    hash,
    compare,
  };
});

import bcrypt from 'bcryptjs';
import * as authService from '../services/auth.service.js';
import * as jwtUtil from '../utils/jwt.util.js';
import User from '../models/User.js';
import * as controller from './auth.controller.js';

function mockReq(overrides = {}) {
  return {
    body: {},
    cookies: {},
    params: {},
    user: { _id: 'u1', name: 'Test', email: 'test@test.com', role: 'user', addresses: [], save: vi.fn().mockResolvedValue(true) },
    ...overrides,
  };
}

function mockRes() {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.cookie = vi.fn().mockReturnValue(res);
  res.clearCookie = vi.fn().mockReturnValue(res);
  return res;
}

describe('sendOTP', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('sends OTP and returns success', async () => {
    const req = mockReq({ body: { email: 'test@test.com', type: 'signup' } });
    const res = mockRes();
    const next = vi.fn();
    authService.sendAuthenticationOTP.mockResolvedValue();

    await controller.sendOTP(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'success' }));
  });

  it('returns 400 if email missing', async () => {
    const req = mockReq({ body: {} });
    const res = mockRes();
    const next = vi.fn();

    await controller.sendOTP(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
  });

  it('calls next on service error', async () => {
    const req = mockReq({ body: { email: 'test@test.com' } });
    const res = mockRes();
    const next = vi.fn();
    authService.sendAuthenticationOTP.mockRejectedValue(new Error('Service error'));

    await controller.sendOTP(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'Service error' }));
  });
});

describe('verifyOTP', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('verifies OTP, sets cookies, returns user', async () => {
    const req = mockReq({ body: { email: 'test@test.com', otp: '123456' } });
    const res = mockRes();
    const next = vi.fn();
    authService.verifyAuthenticationOTP.mockResolvedValue({
      user: { _id: 'u1', name: 'Test', email: 'test@test.com', role: 'user' },
    });
    vi.spyOn(bcrypt, 'hash').mockResolvedValue('hashed-token');
    User.findByIdAndUpdate = vi.fn().mockResolvedValue();

    await controller.verifyOTP(req, res, next);

    expect(res.cookie).toHaveBeenCalledWith('accessToken', 'access-token', expect.any(Object));
    expect(res.cookie).toHaveBeenCalledWith('refreshToken', 'refresh-token', expect.any(Object));
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      status: 'success',
      user: expect.objectContaining({ _id: 'u1' }),
    }));
  });

  it('returns 400 if email or otp missing', async () => {
    const req = mockReq({ body: { email: 'test@test.com' } });
    const res = mockRes();
    const next = vi.fn();

    await controller.verifyOTP(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
  });
});

describe('refreshToken', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('rotates tokens on valid refresh token', async () => {
    const req = mockReq({ cookies: { refreshToken: 'valid-refresh' } });
    const res = mockRes();
    const next = vi.fn();
    jwtUtil.verifyRefreshToken.mockReturnValue({ userId: 'u1' });
    vi.spyOn(bcrypt, 'compare').mockResolvedValue(true);
    vi.spyOn(bcrypt, 'hash').mockResolvedValue('new-hashed-token');
    User.findById = vi.fn(() => ({ select: vi.fn().mockResolvedValue({ _id: 'u1', refreshToken: 'stored-hash' }) }));
    User.findByIdAndUpdate = vi.fn().mockResolvedValue();

    await controller.refreshToken(req, res, next);
    expect(res.cookie).toHaveBeenCalledWith('accessToken', 'access-token', expect.any(Object));
    expect(res.cookie).toHaveBeenCalledWith('refreshToken', 'refresh-token', expect.any(Object));
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('returns 401 if refresh token missing', async () => {
    const req = mockReq({ cookies: {} });
    const res = mockRes();
    const next = vi.fn();

    await controller.refreshToken(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });
});

describe('logout', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('clears tokens and invalidates refresh token', async () => {
    const req = mockReq({ user: { _id: 'u1' } });
    const res = mockRes();
    const next = vi.fn();
    User.findByIdAndUpdate = vi.fn().mockResolvedValue();

    await controller.logout(req, res, next);
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith('u1', { $unset: { refreshToken: 1 } });
    expect(res.clearCookie).toHaveBeenCalledWith('accessToken', expect.any(Object));
    expect(res.clearCookie).toHaveBeenCalledWith('refreshToken', expect.any(Object));
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe('adminLogin', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('logs in as admin with matching ADMIN_EMAIL', async () => {
    process.env.ADMIN_EMAIL = 'admin@store.com';
    process.env.ADMIN_PASSWORD = 'Admin@123';
    const req = mockReq({ body: { email: 'admin@store.com', password: 'Admin@123' } });
    const res = mockRes();
    const next = vi.fn();

    const selectMock = vi.fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ _id: 'a1', name: 'Admin', email: 'admin@store.com', role: 'admin', password: 'hashed' });
    User.findOne = vi.fn(() => ({ select: selectMock }));
    User.create = vi.fn().mockResolvedValue({ _id: 'a1', name: 'Admin', email: 'admin@store.com', role: 'admin', password: 'hashed' });
    User.findByIdAndUpdate = vi.fn().mockResolvedValue();

    bcrypt.compare.mockResolvedValue(true);
    bcrypt.hash.mockResolvedValue('hashed-token');

    await controller.adminLogin(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('returns 401 for non-admin email without account', async () => {
    const req = mockReq({ body: { email: 'user@test.com', password: 'password' } });
    const res = mockRes();
    const next = vi.fn();
    User.findOne = vi.fn(() => ({ select: vi.fn().mockResolvedValue(null) }));

    await controller.adminLogin(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });
});

describe('resendOTP', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('resends OTP and returns success', async () => {
    const req = mockReq({ body: { email: 'test@test.com', type: 'login' } });
    const res = mockRes();
    const next = vi.fn();
    authService.resendAuthenticationOTP.mockResolvedValue();

    await controller.resendOTP(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('returns 400 if email missing', async () => {
    const req = mockReq({ body: {} });
    const res = mockRes();
    const next = vi.fn();

    await controller.resendOTP(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
  });
});

describe('getProfile', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns user from req.user', async () => {
    const req = mockReq({ user: { _id: 'u1', name: 'Test' } });
    const res = mockRes();
    const next = vi.fn();

    await controller.getProfile(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      status: 'success',
      user: { _id: 'u1', name: 'Test' },
    }));
  });

  it('returns 404 if no user', async () => {
    const req = mockReq({ user: null });
    const res = mockRes();
    const next = vi.fn();

    await controller.getProfile(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
  });
});

describe('updateProfile', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('updates user name', async () => {
    const user = { _id: 'u1', name: 'Old', email: 'test@test.com', save: vi.fn().mockResolvedValue(true) };
    const req = mockReq({ user, body: { name: 'New Name' } });
    const res = mockRes();
    const next = vi.fn();

    await controller.updateProfile(req, res, next);
    expect(user.name).toBe('New Name');
    expect(user.save).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe('addAddress', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('adds address to user', async () => {
    const user = { _id: 'u1', name: 'Test', addresses: [], save: vi.fn().mockResolvedValue(true) };
    const req = mockReq({ user, body: { street: '123 St', city: 'NYC', zipCode: '10001' } });
    const res = mockRes();
    const next = vi.fn();

    await controller.addAddress(req, res, next);
    expect(user.addresses).toHaveLength(1);
    expect(user.addresses[0].street).toBe('123 St');
    expect(user.save).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('returns 400 if required fields missing', async () => {
    const req = mockReq({ body: { street: '123 St' } });
    const res = mockRes();
    const next = vi.fn();

    await controller.addAddress(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
  });
});

describe('removeAddress', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('removes address from user', async () => {
    const addrId = 'a1';
    const user = {
      _id: 'u1',
      addresses: [{ _id: addrId, street: '123 St', isDefault: true }],
      save: vi.fn().mockResolvedValue(true),
    };
    const req = mockReq({ user, params: { id: addrId } });
    const res = mockRes();
    const next = vi.fn();

    await controller.removeAddress(req, res, next);
    expect(user.addresses).toHaveLength(0);
    expect(user.save).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe('setDefaultAddress', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('sets default address', async () => {
    const addrId = 'a2';
    const user = {
      _id: 'u1',
      addresses: [
        { _id: 'a1', street: 'Old', isDefault: true },
        { _id: addrId, street: 'New', isDefault: false },
      ],
      save: vi.fn().mockResolvedValue(true),
    };
    const req = mockReq({ user, params: { id: addrId } });
    const res = mockRes();
    const next = vi.fn();

    await controller.setDefaultAddress(req, res, next);
    expect(user.addresses[0].isDefault).toBe(false);
    expect(user.addresses[1].isDefault).toBe(true);
    expect(user.save).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('returns 404 if address not found', async () => {
    const user = {
      _id: 'u1',
      addresses: [{ _id: 'a1', street: 'Only', isDefault: true }],
      save: vi.fn().mockResolvedValue(true),
    };
    const req = mockReq({ user, params: { id: 'nonexistent' } });
    const res = mockRes();
    const next = vi.fn();

    await controller.setDefaultAddress(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
  });
});
