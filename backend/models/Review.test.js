import { describe, it, expect } from 'vitest';
import Review from '../models/Review.js';

describe('Review Model', () => {
  describe('schema', () => {
    it('should have user as required ref to User', () => {
      const path = Review.schema.paths.user;
      expect(path).toBeDefined();
      expect(path.instance).toBe('ObjectId');
      expect(path.options.ref).toBe('User');
      expect(path.options.required[0]).toBe(true);
    });

    it('should have product as required ref to Product', () => {
      const path = Review.schema.paths.product;
      expect(path).toBeDefined();
      expect(path.instance).toBe('ObjectId');
      expect(path.options.ref).toBe('Product');
      expect(path.options.required[0]).toBe(true);
    });

    it('should have rating as required Number with min 1 and max 5', () => {
      const path = Review.schema.paths.rating;
      expect(path).toBeDefined();
      expect(path.instance).toBe('Number');
      expect(path.options.required[0]).toBe(true);
      expect(path.options.min).toBe(1);
      expect(path.options.max).toBe(5);
    });

    it('should have comment as required String', () => {
      const path = Review.schema.paths.comment;
      expect(path).toBeDefined();
      expect(path.instance).toBe('String');
      expect(path.options.required[0]).toBe(true);
    });

    it('should have isApproved with default true', () => {
      const path = Review.schema.paths.isApproved;
      expect(path).toBeDefined();
      expect(path.instance).toBe('Boolean');
      expect(path.options.default).toBe(true);
    });

    it('should have timestamps enabled', () => {
      expect(Review.schema.options.timestamps).toBe(true);
    });
  });

  describe('validation', () => {
    it('should fail if user is missing', () => {
      const review = new Review({ product: '507f1f77bcf86cd799439011', rating: 4, comment: 'Good' });
      const err = review.validateSync();
      expect(err.errors.user).toBeDefined();
    });

    it('should fail if product is missing', () => {
      const review = new Review({ user: '507f1f77bcf86cd799439011', rating: 4, comment: 'Good' });
      const err = review.validateSync();
      expect(err.errors.product).toBeDefined();
    });

    it('should fail if rating is missing', () => {
      const review = new Review({ user: '507f1f77bcf86cd799439011', product: '507f1f77bcf86cd799439011', comment: 'Good' });
      const err = review.validateSync();
      expect(err.errors.rating).toBeDefined();
    });

    it('should fail if comment is missing', () => {
      const review = new Review({ user: '507f1f77bcf86cd799439011', product: '507f1f77bcf86cd799439011', rating: 4 });
      const err = review.validateSync();
      expect(err.errors.comment).toBeDefined();
    });

    it('should fail if rating is below 1', () => {
      const review = new Review({ user: '507f1f77bcf86cd799439011', product: '507f1f77bcf86cd799439011', rating: 0, comment: 'Bad' });
      const err = review.validateSync();
      expect(err.errors.rating).toBeDefined();
    });

    it('should fail if rating is above 5', () => {
      const review = new Review({ user: '507f1f77bcf86cd799439011', product: '507f1f77bcf86cd799439011', rating: 6, comment: 'Good' });
      const err = review.validateSync();
      expect(err.errors.rating).toBeDefined();
    });
  });

  describe('indexes', () => {
    it('should have unique compound index on product and user', () => {
      const index = Review.schema.indexes().find(i => {
        const key = i[0];
        return key.product === 1 && key.user === 1;
      });
      expect(index).toBeDefined();
      expect(index[1].unique).toBe(true);
    });
  });
});
