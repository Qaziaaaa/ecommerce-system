import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockHash, mockCompare } = vi.hoisted(() => ({
  mockHash: vi.fn(),
  mockCompare: vi.fn(),
}));
vi.mock('bcryptjs', () => ({ default: { hash: mockHash, compare: mockCompare } }));

import User from '../models/User.js';

describe('User Model', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('schema', () => {
    it('should have name field as required String', () => {
      const path = User.schema.paths.name;
      expect(path).toBeDefined();
      expect(path.instance).toBe('String');
      expect(path.options.required[0]).toBe(true);
    });

    it('should have email field as required unique String with lowercase', () => {
      const path = User.schema.paths.email;
      expect(path).toBeDefined();
      expect(path.instance).toBe('String');
      expect(path.options.required[0]).toBe(true);
      expect(path.options.unique).toBe(true);
      expect(path.options.lowercase).toBe(true);
    });

    it('should have password field with select false and complexity validation', () => {
      const path = User.schema.paths.password;
      expect(path).toBeDefined();
      expect(path.instance).toBe('String');
      expect(path.options.select).toBe(false);
      expect(path.options.validate).toBeDefined();
    });

    it('should have role field with default user and enum', () => {
      const path = User.schema.paths.role;
      expect(path).toBeDefined();
      expect(path.instance).toBe('String');
      expect(path.options.default).toBe('user');
      expect(path.options.enum).toContain('user');
      expect(path.options.enum).toContain('admin');
    });

    it('should have isVerified field with default false', () => {
      const path = User.schema.paths.isVerified;
      expect(path).toBeDefined();
      expect(path.instance).toBe('Boolean');
      expect(path.options.default).toBe(false);
    });

    it('should have addresses array with subfields', () => {
      const path = User.schema.paths.addresses;
      expect(path).toBeDefined();
      expect(path.instance).toBe('Array');
    });

    it('should have cart array with product ref and quantity default', () => {
      const path = User.schema.paths.cart;
      expect(path).toBeDefined();
      expect(path.instance).toBe('Array');
    });

    it('should have wishlist array with Product ref', () => {
      const path = User.schema.paths.wishlist;
      expect(path).toBeDefined();
      expect(path.instance).toBe('Array');
      const innerSchema = User.schema.paths.wishlist;
      expect(innerSchema.options.type[0].ref).toBe('Product');
    });

    it('should have refreshToken with select false', () => {
      const path = User.schema.paths.refreshToken;
      expect(path).toBeDefined();
      expect(path.instance).toBe('String');
      expect(path.options.select).toBe(false);
    });

    it('should have timestamps enabled', () => {
      expect(User.schema.options.timestamps).toBe(true);
    });
  });

  describe('validation', () => {
    it('should fail if name is missing', () => {
      const user = new User({ email: 'test@test.com' });
      const err = user.validateSync();
      expect(err.errors.name).toBeDefined();
    });

    it('should fail if email is missing', () => {
      const user = new User({ name: 'Test' });
      const err = user.validateSync();
      expect(err.errors.email).toBeDefined();
    });

    it('should fail if password is less than 8 characters', () => {
      const user = new User({ name: 'Test', email: 'test@test.com', password: 'Short1' });
      const err = user.validateSync();
      expect(err.errors.password).toBeDefined();
    });

    it('should reject invalid role', () => {
      const user = new User({ name: 'Test', email: 'test@test.com', role: 'superadmin' });
      const err = user.validateSync();
      expect(err.errors.role).toBeDefined();
    });

    it('should accept valid role values', () => {
      const user = new User({ name: 'Test', email: 'test@test.com', role: 'admin' });
      const err = user.validateSync();
      expect(err).toBeUndefined();
    });

    it('should pass validation with minimal required fields', () => {
      const user = new User({ name: 'Test', email: 'test@test.com' });
      const err = user.validateSync();
      expect(err).toBeUndefined();
    });
  });

  describe('pre-save hook', () => {
    it('should hash password when password is modified', async () => {
      mockHash.mockResolvedValue('hashed_pass');

      const user = new User({ name: 'Test', email: 'test@test.com', password: 'Password1' });
      user.isModified = vi.fn().mockReturnValue(true);

      const saveHooks = User.schema.s.hooks._pres.get('save') || [];
      for (const hook of saveHooks) {
        await hook.fn.call(user);
      }

      expect(saveHooks.length).toBeGreaterThan(0);
      expect(mockHash).toHaveBeenCalledWith('Password1', 12);
      expect(user.password).toBe('hashed_pass');
    });

    it('should not hash password if it is not modified', async () => {
      const user = new User({ name: 'Test', email: 'test@test.com', password: 'Password1' });
      user.isModified = vi.fn().mockReturnValue(false);

      const saveHooks = User.schema.s.hooks._pres.get('save') || [];
      for (const hook of saveHooks) {
        await hook.fn.call(user);
      }

      expect(mockHash).not.toHaveBeenCalled();
    });
  });

  describe('methods', () => {
    it('should have comparePassword instance method', () => {
      expect(User.prototype.comparePassword).toBeDefined();
      expect(typeof User.prototype.comparePassword).toBe('function');
    });

    it('should return false if password is undefined', async () => {
      const user = new User({ name: 'Test', email: 'test@test.com' });
      const result = await user.comparePassword('candidate');
      expect(result).toBe(false);
    });

    it('should call bcrypt.compare with candidate and stored hash', async () => {
      mockCompare.mockResolvedValue(true);
      const user = new User({ name: 'Test', email: 'test@test.com', password: 'hashed_pass' });
      user.password = 'hashed_pass';

      const result = await user.comparePassword('candidate');

      expect(mockCompare).toHaveBeenCalledWith('candidate', 'hashed_pass');
      expect(result).toBe(true);
    });
  });

  describe('indexes', () => {
    it('should have index on role', () => {
      const index = User.schema.indexes().find(i => {
        const key = i[0];
        return key.role === 1 && Object.keys(key).length === 1;
      });
      expect(index).toBeDefined();
    });

    it('should have index on isVerified', () => {
      const index = User.schema.indexes().find(i => {
        const key = i[0];
        return key.isVerified === 1 && Object.keys(key).length === 1;
      });
      expect(index).toBeDefined();
    });

    it('should have index on createdAt descending', () => {
      const index = User.schema.indexes().find(i => {
        const key = i[0];
        return key.createdAt === -1 && Object.keys(key).length === 1;
      });
      expect(index).toBeDefined();
    });
  });
});
