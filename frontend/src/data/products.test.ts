import { describe, it, expect } from 'vitest';
import { PRODUCTS } from '../data/products';

describe('Products Data', () => {
  it('should export 50 products', () => {
    expect(PRODUCTS).toHaveLength(50);
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
      expect(product.name).toBeTruthy();
      expect(product.price).toBeGreaterThan(0);
      expect(product.img).toMatch(/^https?:\/\//);
      expect(product.description).toBeTruthy();
      expect(product.category).toBeTruthy();
      expect(product.subCategory).toBeTruthy();
      expect(product.rating.stars).toBeGreaterThanOrEqual(1);
      expect(product.rating.stars).toBeLessThanOrEqual(5);
      expect(product.rating.count).toBeGreaterThanOrEqual(0);
      expect(product.keywords.length).toBeGreaterThan(0);
    }
  });

  it('should have prices in valid range', () => {
    for (const product of PRODUCTS) {
      expect(product.price).toBeGreaterThanOrEqual(1);
      expect(product.price).toBeLessThanOrEqual(5000);
    }
  });

  it('should cover multiple categories', () => {
    const categories = [...new Set(PRODUCTS.map(p => p.category))];
    expect(categories).toContain('Beauty & Personal Care');
    expect(categories).toContain('Electronics & Gadgets');
    expect(categories).toContain('Fashion & Apparel');
    expect(categories).toContain('Home & Kitchen');
    expect(categories).toContain('Health & Fitness');
  });
});
