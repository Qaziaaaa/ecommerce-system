import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../models/OTP.js', () => ({ default: { deleteMany: vi.fn(), findOne: vi.fn(), create: vi.fn() } }));
vi.mock('../utils/otp.util.js', () => ({ generateOTP: vi.fn(), hashOTP: vi.fn() }));

let otpService, OTP, otpUtil;

beforeEach(async () => {
  vi.clearAllMocks();
  OTP = (await import('../models/OTP.js')).default;
  otpUtil = await import('../utils/otp.util.js');
  otpService = await import('./otp.service.js');
});

describe('createOTP', () => {
  it('generates OTP, hashes it, stores in DB, returns raw OTP', async () => {
    otpUtil.generateOTP.mockReturnValue('123456');
    otpUtil.hashOTP.mockReturnValue('hashed-123456');
    OTP.create.mockResolvedValue({});

    const result = await otpService.createOTP('test@test.com');
    expect(result).toBe('123456');
    expect(OTP.deleteMany).toHaveBeenCalledWith({ email: 'test@test.com' });
    expect(OTP.create).toHaveBeenCalledWith(expect.objectContaining({
      email: 'test@test.com',
      otp: 'hashed-123456',
    }));
  });
});

describe('verifyOTP', () => {
  it('verifies OTP successfully and deletes it', async () => {
    otpUtil.hashOTP.mockReturnValue('hashed-match');
    OTP.findOne.mockResolvedValue({ email: 'test@test.com', otp: 'hashed-match', expiresAt: new Date(Date.now() + 60000), attempts: 0, save: vi.fn() });

    const result = await otpService.verifyOTP('test@test.com', '123456');
    expect(result).toBe(true);
    expect(OTP.deleteMany).toHaveBeenCalledWith({ email: 'test@test.com' });
  });

  it('throws if OTP not found', async () => {
    OTP.findOne.mockResolvedValue(null);
    await expect(otpService.verifyOTP('test@test.com', '123456')).rejects.toThrow('OTP not found');
  });

  it('throws if OTP expired', async () => {
    OTP.findOne.mockResolvedValue({ email: 'test@test.com', otp: 'hashed', expiresAt: new Date(Date.now() - 1000), attempts: 0 });
    await expect(otpService.verifyOTP('test@test.com', '123456')).rejects.toThrow('OTP expired');
    expect(OTP.deleteMany).toHaveBeenCalledWith({ email: 'test@test.com' });
  });

  it('throws if max attempts reached', async () => {
    OTP.findOne.mockResolvedValue({ email: 'test@test.com', otp: 'hashed', expiresAt: new Date(Date.now() + 60000), attempts: 3 });
    await expect(otpService.verifyOTP('test@test.com', '123456')).rejects.toThrow('Maximum verification attempts');
    expect(OTP.deleteMany).toHaveBeenCalledWith({ email: 'test@test.com' });
  });

  it('increments attempts on wrong OTP', async () => {
    const saveFn = vi.fn();
    OTP.findOne.mockResolvedValue({ email: 'test@test.com', otp: 'hashed-correct', expiresAt: new Date(Date.now() + 60000), attempts: 1, save: saveFn });
    otpUtil.hashOTP.mockReturnValue('hashed-wrong');
    await expect(otpService.verifyOTP('test@test.com', 'wrong')).rejects.toThrow('Invalid OTP');
    expect(saveFn).toHaveBeenCalled();
  });
});

describe('resendOTP', () => {
  it('delegates to createOTP', async () => {
    otpUtil.generateOTP.mockReturnValue('789012');
    otpUtil.hashOTP.mockReturnValue('hashed-789012');
    OTP.create.mockResolvedValue({});
    const result = await otpService.resendOTP('test@test.com');
    expect(result).toBe('789012');
  });
});
