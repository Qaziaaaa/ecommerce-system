import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { validateEnv } from './env.js';

describe('validateEnv', () => {
  const OLD_ENV = { ...process.env };

  afterEach(() => {
    process.env = { ...OLD_ENV };
  });

  it('throws when required env vars are missing', () => {
    delete process.env.PORT;
    expect(() => validateEnv()).toThrow(/PORT/);
  });

  it('passes when all required env vars are present', () => {
    process.env.PORT = '5000';
    process.env.MONGO_URI = 'mongodb://test';
    process.env.JWT_SECRET = 'secret';
    process.env.JWT_REFRESH_SECRET = 'refresh';
    process.env.JWT_EXPIRES_IN = '1h';
    process.env.NODE_ENV = 'test';
    process.env.CLOUDINARY_CLOUD_NAME = 'cloud';
    process.env.CLOUDINARY_API_KEY = 'key';
    process.env.CLOUDINARY_API_SECRET = 'secret';
    process.env.STRIPE_SECRET_KEY = 'sk_test';
    process.env.EMAILJS_SERVICE_ID = 's';
    process.env.EMAILJS_TEMPLATE_ID = 't';
    process.env.EMAILJS_PUBLIC_KEY = 'pk';
    process.env.EMAILJS_PRIVATE_KEY = 'pv';
    process.env.CORS_ORIGIN = '*';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
    expect(() => validateEnv()).not.toThrow();
  });

  it('reports all missing vars', () => {
    delete process.env.PORT;
    delete process.env.MONGO_URI;
    delete process.env.JWT_SECRET;
    delete process.env.JWT_REFRESH_SECRET;
    delete process.env.JWT_EXPIRES_IN;
    delete process.env.NODE_ENV;
    delete process.env.CLOUDINARY_CLOUD_NAME;
    delete process.env.CLOUDINARY_API_KEY;
    delete process.env.CLOUDINARY_API_SECRET;
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.EMAILJS_SERVICE_ID;
    delete process.env.EMAILJS_TEMPLATE_ID;
    delete process.env.EMAILJS_PUBLIC_KEY;
    delete process.env.EMAILJS_PRIVATE_KEY;
    delete process.env.CORS_ORIGIN;
    expect(() => validateEnv()).toThrow(/PORT.*MONGO_URI.*JWT_SECRET/);
  });
});
