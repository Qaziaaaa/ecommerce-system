import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@emailjs/nodejs', () => ({ default: { send: vi.fn() } }));

let emailjs, emailService;

beforeEach(async () => {
  vi.clearAllMocks();
  emailjs = (await import('@emailjs/nodejs')).default;
  process.env.EMAILJS_SERVICE_ID = 'svc';
  process.env.EMAILJS_TEMPLATE_ID = 'tpl';
  process.env.EMAILJS_PUBLIC_KEY = 'pk';
  process.env.EMAILJS_PRIVATE_KEY = 'pv';
  emailService = await import('./email.service.js');
});

afterEach(() => {
  delete process.env.EMAILJS_SERVICE_ID;
  delete process.env.EMAILJS_TEMPLATE_ID;
  delete process.env.EMAILJS_PUBLIC_KEY;
  delete process.env.EMAILJS_PRIVATE_KEY;
  delete process.env.NODE_ENV;
});

describe('sendOTPEmail', () => {
  it('sends email and returns true', async () => {
    emailjs.send.mockResolvedValue({});
    const result = await emailService.sendOTPEmail('test@test.com', '123456');
    expect(result).toBe(true);
    expect(emailjs.send).toHaveBeenCalledWith('svc', 'tpl', expect.objectContaining({
      to_email: 'test@test.com',
      otp_code: '123456',
    }), expect.any(Object));
  });

  it('throws if env vars are missing', async () => {
    delete process.env.EMAILJS_SERVICE_ID;
    await expect(emailService.sendOTPEmail('test@test.com', '123456')).rejects.toThrow(/EmailJS environment variables/);
  });

  it('throws with EmailJS Error prefix on emailjs failure', async () => {
    emailjs.send.mockRejectedValue(new Error('Bad request'));
    await expect(emailService.sendOTPEmail('test@test.com', '123456')).rejects.toThrow('EmailJS Error: Bad request');
  });

  it('handles non-Error rejection gracefully', async () => {
    emailjs.send.mockRejectedValue({ status: 500, message: 'Server error' });
    await expect(emailService.sendOTPEmail('test@test.com', '123456')).rejects.toThrow(/EmailJS Error/);
  });

  it('logs OTP to console in development mode', async () => {
    process.env.NODE_ENV = 'development';
    emailjs.send.mockResolvedValue({});
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await emailService.sendOTPEmail('dev@test.com', '654321');
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('654321'));
    spy.mockRestore();
  });
});
