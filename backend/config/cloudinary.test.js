import { describe, it, expect, vi, beforeEach } from 'vitest';

const cloudinaryConfig = vi.fn();
vi.mock('cloudinary', () => ({
  v2: { config: cloudinaryConfig },
}));

vi.mock('dotenv', () => ({ default: { config: vi.fn() } }));

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CLOUDINARY_CLOUD_NAME = 'test-cloud';
  process.env.CLOUDINARY_API_KEY = 'test-key';
  process.env.CLOUDINARY_API_SECRET = 'test-secret';
});

it('configures cloudinary with env vars', async () => {
  const cloudinary = (await import('./cloudinary.js')).default;
  expect(cloudinaryConfig).toHaveBeenCalledWith({
    cloud_name: 'test-cloud',
    api_key: 'test-key',
    api_secret: 'test-secret',
  });
  expect(cloudinary).toBeDefined();
});
