import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('multer', () => {
  const fn = vi.fn(() => ({
    single: vi.fn(() => (req, res, next) => next()),
  }));
  fn.memoryStorage = vi.fn(() => ({}));
  return { default: fn };
});

vi.mock('multer-storage-cloudinary', () => ({
  CloudinaryStorage: vi.fn(),
}));

const cloudinaryConfig = vi.fn();
vi.mock('../config/cloudinary.js', () => ({ default: { config: cloudinaryConfig } }));

const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
vi.mock('../utils/logger.js', () => ({ default: mockLogger }));

let uploadModule;

beforeEach(async () => {
  vi.clearAllMocks();
  uploadModule = await import('./upload.middleware.js');
});

it('exports default upload middleware', () => {
  expect(uploadModule.default).toBeDefined();
  expect(typeof uploadModule.default.single).toBe('function');
});

it('exports monitoredUpload', () => {
  expect(uploadModule.monitoredUpload).toBeDefined();
  expect(typeof uploadModule.monitoredUpload).toBe('function');
});

it('monitoredUpload creates middleware that monitors memory', async () => {
  const middleware = uploadModule.monitoredUpload('image');
  const req = { file: { originalname: 'test.jpg', size: 1000 } };
  const res = {};
  const next = vi.fn();

  await new Promise((resolve) => middleware(req, res, () => { next(); resolve(); }));
  expect(next).toHaveBeenCalled();
});
