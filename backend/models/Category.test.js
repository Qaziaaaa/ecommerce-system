import { describe, it, expect } from 'vitest';
import Category from '../models/Category.js';

describe('Category Model', () => {
  describe('schema', () => {
    it('should have name as required trimmed String', () => {
      const path = Category.schema.paths.name;
      expect(path).toBeDefined();
      expect(path.instance).toBe('String');
      expect(path.options.required[0]).toBe(true);
      expect(path.options.trim).toBe(true);
    });

    it('should have slug as required unique lowercase String with index', () => {
      const path = Category.schema.paths.slug;
      expect(path).toBeDefined();
      expect(path.instance).toBe('String');
      expect(path.options.required).toBe(true);
      expect(path.options.unique).toBe(true);
      expect(path.options.lowercase).toBe(true);
    });

    it('should have parentCategory as ref to Category with default null', () => {
      const path = Category.schema.paths.parentCategory;
      expect(path).toBeDefined();
      expect(path.instance).toBe('ObjectId');
      expect(path.options.ref).toBe('Category');
      expect(path.options.default).toBe(null);
    });

    it('should have isActive with default true', () => {
      const path = Category.schema.paths.isActive;
      expect(path).toBeDefined();
      expect(path.instance).toBe('Boolean');
      expect(path.options.default).toBe(true);
    });

    it('should have timestamps enabled', () => {
      expect(Category.schema.options.timestamps).toBe(true);
    });
  });

  describe('validation', () => {
    it('should fail if name is missing', () => {
      const category = new Category({ slug: 'test-cat' });
      const err = category.validateSync();
      expect(err.errors.name).toBeDefined();
    });

    it('should pass with required fields', () => {
      const category = new Category({ name: 'Electronics', slug: 'electronics' });
      const err = category.validateSync();
      expect(err).toBeUndefined();
    });
  });
});
