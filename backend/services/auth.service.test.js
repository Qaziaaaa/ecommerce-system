import { describe, it, expect, vi, beforeEach } from 'vitest';
import User from '../models/User.js';
import * as otpService from './otp.service.js';
import * as emailService from './email.service.js';

vi.mock('../models/User.js', () => ({ default: { findOne: vi.fn(), create: vi.fn(), updateOne: vi.fn() } }));
vi.mock('./otp.service.js', () => ({ createOTP: vi.fn(), verifyOTP: vi.fn(), resendOTP: vi.fn() }));
vi.mock('./email.service.js', () => ({ sendOTPEmail: vi.fn() }));

let authService;

beforeEach(async () => {
  vi.clearAllMocks();
  delete process.env.ADMIN_EMAIL;
  authService = await import('./auth.service.js');
});

describe('sendAuthenticationOTP', () => {
  it('sends OTP for signup when user does not exist', async () => {
    User.findOne.mockResolvedValue(null);
    otpService.createOTP.mockResolvedValue('123456');
    emailService.sendOTPEmail.mockResolvedValue();

    const result = await authService.sendAuthenticationOTP('test@test.com', 'signup');
    expect(result).toBe(true);
    expect(otpService.createOTP).toHaveBeenCalledWith('test@test.com');
    expect(emailService.sendOTPEmail).toHaveBeenCalledWith('test@test.com', '123456');
  });

  it('throws if signup with existing email', async () => {
    User.findOne.mockResolvedValue({ _id: 'u1', email: 'test@test.com' });
    await expect(authService.sendAuthenticationOTP('test@test.com', 'signup')).rejects.toThrow(
      /already exists/i
    );
  });

  it('sends OTP for login when user exists', async () => {
    User.findOne.mockResolvedValue({ _id: 'u1', email: 'test@test.com' });
    otpService.createOTP.mockResolvedValue('654321');
    emailService.sendOTPEmail.mockResolvedValue();

    const result = await authService.sendAuthenticationOTP('test@test.com', 'login');
    expect(result).toBe(true);
  });

  it('throws if login with non-existent email', async () => {
    User.findOne.mockResolvedValue(null);
    await expect(authService.sendAuthenticationOTP('unknown@test.com', 'login')).rejects.toThrow(
      /sign up first/i
    );
  });
});

describe('verifyAuthenticationOTP', () => {
  it('verifies OTP and returns existing user', async () => {
    otpService.verifyOTP.mockResolvedValue(true);
    const fakeUser = { _id: 'u1', email: 'test@test.com', name: 'Test', role: 'user', isVerified: false };
    User.findOne.mockResolvedValue(fakeUser);

    const result = await authService.verifyAuthenticationOTP('test@test.com', '123456');
    expect(result.user).toEqual(fakeUser);
  });

  it('marks existing user as verified if not verified', async () => {
    otpService.verifyOTP.mockResolvedValue(true);
    const fakeUser = { _id: 'u1', email: 'test@test.com', isVerified: false };
    User.findOne.mockResolvedValue(fakeUser);

    await authService.verifyAuthenticationOTP('test@test.com', '123456');
    expect(User.updateOne).toHaveBeenCalledWith(
      { _id: 'u1' },
      { $set: { isVerified: true } }
    );
  });

  it('throws if OTP verification fails', async () => {
    otpService.verifyOTP.mockRejectedValue(new Error('Invalid OTP'));
    await expect(authService.verifyAuthenticationOTP('test@test.com', 'wrong')).rejects.toThrow('Invalid OTP');
  });

  it('creates a new user for signup when no user exists', async () => {
    otpService.verifyOTP.mockResolvedValue(true);
    User.findOne.mockResolvedValue(null);
    const newUser = { _id: 'u2', email: 'new@test.com', name: 'New', role: 'user', isVerified: true };
    User.create.mockResolvedValue(newUser);

    const result = await authService.verifyAuthenticationOTP('new@test.com', '123456', 'New');
    expect(User.create).toHaveBeenCalledWith(expect.objectContaining({ email: 'new@test.com', name: 'New' }));
    expect(result.user).toEqual(newUser);
  });

  it('throws for signup when no name provided', async () => {
    otpService.verifyOTP.mockResolvedValue(true);
    User.findOne.mockResolvedValue(null);
    await expect(authService.verifyAuthenticationOTP('new@test.com', '123456')).rejects.toThrow(
      /name is required/i
    );
  });

  it('assigns admin role if email matches ADMIN_EMAIL', async () => {
    process.env.ADMIN_EMAIL = 'admin@store.com';
    otpService.verifyOTP.mockResolvedValue(true);
    User.findOne.mockResolvedValue(null);
    User.create.mockResolvedValue({ _id: 'a1', email: 'admin@store.com', name: 'Admin', role: 'admin' });

    const result = await authService.verifyAuthenticationOTP('admin@store.com', '123456', 'Admin');
    expect(User.create).toHaveBeenCalledWith(expect.objectContaining({ role: 'admin' }));
    expect(result.user.role).toBe('admin');
  });
});

describe('resendAuthenticationOTP', () => {
  it('delegates to sendAuthenticationOTP', async () => {
    User.findOne.mockResolvedValue({ _id: 'u1' });
    otpService.createOTP.mockResolvedValue('789012');
    emailService.sendOTPEmail.mockResolvedValue();

    const result = await authService.resendAuthenticationOTP('test@test.com', 'login');
    expect(result).toBe(true);
  });
});
