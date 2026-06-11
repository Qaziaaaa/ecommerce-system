import { describe, it, expect } from 'vitest';
import Product from '../models/Product.js';

describe('Product Model', () => {
  describe('schema', () => {
    it('should have name field as required trimmed String', () => {
      const path = Product.schema.paths.name;
      expect(path).toBeDefined();
      expect(path.instance).toBe('String');
      expect(path.options.required[0]).toBe(true);
      expect(path.options.trim).toBe(true);
    });

    it('should have slug field as required unique lowercase String with index', () => {
      const path = Product.schema.paths.slug;
      expect(path).toBeDefined();
      expect(path.instance).toBe('String');
      expect(path.options.required).toBe(true);
      expect(path.options.unique).toBe(true);
      expect(path.options.lowercase).toBe(true);
    });

    it('should have description as required String', () => {
      const path = Product.schema.paths.description;
      expect(path).toBeDefined();
      expect(path.instance).toBe('String');
      expect(path.options.required[0]).toBe(true);
    });

    it('should have price as required Number with min 0', () => {
      const path = Product.schema.paths.price;
      expect(path).toBeDefined();
      expect(path.instance).toBe('Number');
      expect(path.options.required[0]).toBe(true);
      expect(path.options.min[0]).toBe(0);
    });

    it('should have discountPrice with custom validator below price', () => {
      const path = Product.schema.paths.discountPrice;
      expect(path).toBeDefined();
      expect(path.instance).toBe('Number');
      expect(path.validators.length).toBeGreaterThanOrEqual(1);
    });

    it('should have category as required ref to Category', () => {
      const path = Product.schema.paths.category;
      expect(path).toBeDefined();
      expect(path.instance).toBe('ObjectId');
      expect(path.options.ref).toBe('Category');
      expect(path.options.required[0]).toBe(true);
    });

    it('should have brand as String', () => {
      const path = Product.schema.paths.brand;
      expect(path).toBeDefined();
      expect(path.instance).toBe('String');
    });

    it('should have images as array of Strings', () => {
      const path = Product.schema.paths.images;
      expect(path).toBeDefined();
      expect(path.instance).toBe('Array');
    });

    it('should have stock as required Number with min 0 and default 0', () => {
      const path = Product.schema.paths.stock;
      expect(path).toBeDefined();
      expect(path.instance).toBe('Number');
      expect(path.options.required[0]).toBe(true);
      expect(path.options.min[0]).toBe(0);
      expect(path.options.default).toBe(0);
    });

    it('should have ratingsAverage with default 4.5, min 1, max 5, and setter', () => {
      const path = Product.schema.paths.ratingsAverage;
      expect(path).toBeDefined();
      expect(path.instance).toBe('Number');
      expect(path.options.default).toBe(4.5);
      expect(path.options.min[0]).toBe(1);
      expect(path.options.max[0]).toBe(5);
      expect(path.options.set).toBeDefined();
    });

    it('should have ratingsCount with default 0', () => {
      const path = Product.schema.paths.ratingsCount;
      expect(path).toBeDefined();
      expect(path.instance).toBe('Number');
      expect(path.options.default).toBe(0);
    });

    it('should have isFeatured with default false', () => {
      const path = Product.schema.paths.isFeatured;
      expect(path).toBeDefined();
      expect(path.instance).toBe('Boolean');
      expect(path.options.default).toBe(false);
    });

    it('should have isActive with default true', () => {
      const path = Product.schema.paths.isActive;
      expect(path).toBeDefined();
      expect(path.instance).toBe('Boolean');
      expect(path.options.default).toBe(true);
    });

    it('should have timestamps enabled', () => {
      expect(Product.schema.options.timestamps).toBe(true);
    });

    it('should round ratingsAverage to 1 decimal', () => {
      const setter = Product.schema.paths.ratingsAverage.options.set;
      expect(setter(4.567)).toBe(4.6);
      expect(setter(4.55)).toBe(4.6);
      expect(setter(4.44)).toBe(4.4);
    });
  });

  describe('validation', () => {
    it('should fail if name is missing', () => {
      const product = new Product({ slug: 'test', description: 'desc', price: 10, category: '507f1f77bcf86cd799439011' });
      const err = product.validateSync();
      expect(err.errors.name).toBeDefined();
    });

    it('should fail if description is missing', () => {
      const product = new Product({ name: 'Test', slug: 'test', price: 10, category: '507f1f77bcf86cd799439011' });
      const err = product.validateSync();
      expect(err.errors.description).toBeDefined();
    });

    it('should fail if price is negative', () => {
      const product = new Product({ name: 'Test', slug: 'test', description: 'desc', price: -5, category: '507f1f77bcf86cd799439011' });
      const err = product.validateSync();
      expect(err.errors.price).toBeDefined();
    });

    it('should fail if stock is negative', () => {
      const product = new Product({ name: 'Test', slug: 'test', description: 'desc', price: 10, stock: -1, category: '507f1f77bcf86cd799439011' });
      const err = product.validateSync();
      expect(err.errors.stock).toBeDefined();
    });
  });

  describe('indexes', () => {
    it('should have text index on name, description, brand', () => {
      const textIndex = Product.schema.indexes().find(i => i[0].name === 'text' && i[0].description === 'text' && i[0].brand === 'text');
      expect(textIndex).toBeDefined();
    });

    it('should have compound index on category, isActive, price', () => {
      const index = Product.schema.indexes().find(i => {
        const key = i[0];
        return key.category === 1 && key.isActive === 1 && key.price === 1;
      });
      expect(index).toBeDefined();
    });

    it('should have compound index on isActive, isFeatured', () => {
      const index = Product.schema.indexes().find(i => {
        const key = i[0];
        return key.isActive === 1 && key.isFeatured === 1;
      });
      expect(index).toBeDefined();
    });

    it('should have compound index on isActive, createdAt descending', () => {
      const index = Product.schema.indexes().find(i => {
        const key = i[0];
        return key.isActive === 1 && key.createdAt === -1;
      });
      expect(index).toBeDefined();
    });
  });
});
