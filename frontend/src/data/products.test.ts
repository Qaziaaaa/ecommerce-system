import { describe, it, expect } from 'vitest';
import { PRODUCTS } from '../data/products';

describe('Products Data', () => {
  it('should export 8 products', () => {
    expect(PRODUCTS).toHaveLength(8);
  });

  it('should have unique ids', () => {
    const ids = PRODUCTS.map(p => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('should have unique names', () => {
    const names = PRODUCTS.map(p => p.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('should have all required fields for each product', () => {
    for (const product of PRODUCTS) {
      expect(product.id).toBeGreaterThan(0);
      expect(product.tag).toBeTruthy();
      expect(product.category).toBeTruthy();
      expect(product.name).toBeTruthy();
      expect(product.price).toBeGreaterThan(0);
      expect(product.img).toMatch(/^https?:\/\//);
      expect(product.description).toBeTruthy();
    }
  });

  it('should have valid categories', () => {
    const categories = PRODUCTS.map(p => p.category);
    expect(categories).toContain('Bags');
    expect(categories).toContain('Audio');
    expect(categories).toContain('Accessories');
    expect(categories).toContain('Home');
  });

  it('should have valid tags', () => {
    const tags = PRODUCTS.map(p => p.tag);
    const validTags = ['BEST SELLER', 'NEW ARRIVAL', 'LIMITED EDITION', 'ESSENTIAL', 'POPULAR', 'PREMIUM'];
    for (const tag of tags) {
      expect(validTags).toContain(tag);
    }
  });

  it('should have prices in valid range', () => {
    for (const product of PRODUCTS) {
      expect(product.price).toBeGreaterThanOrEqual(10);
      expect(product.price).toBeLessThanOrEqual(1000);
    }
  });
});
