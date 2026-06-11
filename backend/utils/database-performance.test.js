import { describe, it, expect, vi, beforeAll } from 'vitest';

const hoisted = vi.hoisted(() => {
  const onSpy = vi.fn();
  const mockSchema = { pre: vi.fn(), post: vi.fn() };
  const fakeDbTracker = {
    trackDatabaseQueryTime: vi.fn(),
    getPerformanceSummary: vi.fn(() => ({ database: {}, api: {}, errorRate: 0 })),
    triggerAlert: vi.fn(),
  };
  return { onSpy, mockSchema, fakeDbTracker };
});

vi.mock('mongoose', () => ({
  default: {
    plugin: vi.fn((fn) => { fn(hoisted.mockSchema); }),
    connection: { on: hoisted.onSpy, readyState: 1, options: { maxPoolSize: 10, minPoolSize: 5 } },
    Schema: vi.fn(() => ({ pre: vi.fn(), post: vi.fn(), virtual: vi.fn() })),
    model: vi.fn(() => ({ find: vi.fn() })),
    Types: { ObjectId: 'mock-object-id' },
  },
}));

vi.mock('../services/performance.service.js', () => ({ default: hoisted.fakeDbTracker }));
vi.mock('./logger.js', () => ({ default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() } }));

import mongoose from 'mongoose';
import performanceService from '../services/performance.service.js';
import dbPerformanceTracker from './database-performance.js';

describe('database-performance', () => {
  beforeAll(() => {
    // Constructor ran at import time
  });

  describe('setupMongooseMiddleware', () => {
    it('should call mongoose.plugin once', () => {
      expect(mongoose.plugin).toHaveBeenCalledTimes(1);
    });

    it('should pass a function to mongoose.plugin', () => {
      const pluginFn = mongoose.plugin.mock.calls[0][0];
      expect(pluginFn).toBeInstanceOf(Function);
    });

    it('should set up pre-hooks for find operations', () => {
      expect(hoisted.mockSchema.pre).toHaveBeenCalledWith(/^find/, expect.any(Function));
    });

    it('should set up pre-hooks for aggregate', () => {
      expect(hoisted.mockSchema.pre).toHaveBeenCalledWith('aggregate', expect.any(Function));
    });

    it('should set up pre-hooks for save', () => {
      expect(hoisted.mockSchema.pre).toHaveBeenCalledWith('save', expect.any(Function));
    });

    it('should set up pre-hooks for updateOne', () => {
      expect(hoisted.mockSchema.pre).toHaveBeenCalledWith('updateOne', expect.any(Function));
    });

    it('should set up pre-hooks for updateMany', () => {
      expect(hoisted.mockSchema.pre).toHaveBeenCalledWith('updateMany', expect.any(Function));
    });

    it('should set up pre-hooks for deleteOne', () => {
      expect(hoisted.mockSchema.pre).toHaveBeenCalledWith('deleteOne', expect.any(Function));
    });

    it('should set up pre-hooks for deleteMany', () => {
      expect(hoisted.mockSchema.pre).toHaveBeenCalledWith('deleteMany', expect.any(Function));
    });

    it('should set up post-hooks for find operations', () => {
      expect(hoisted.mockSchema.post).toHaveBeenCalledWith(/^find/, expect.any(Function));
    });

    it('should set up post-hooks for aggregate', () => {
      expect(hoisted.mockSchema.post).toHaveBeenCalledWith('aggregate', expect.any(Function));
    });

    it('should set up post-hooks for save', () => {
      expect(hoisted.mockSchema.post).toHaveBeenCalledWith('save', expect.any(Function));
    });

    it('should set up post-hooks for update/delete operations', () => {
      expect(hoisted.mockSchema.post).toHaveBeenCalledWith(
        ['updateOne', 'updateMany', 'deleteOne', 'deleteMany'],
        expect.any(Function),
      );
    });
  });

  describe('setupConnectionMonitoring', () => {
    it('should listen on connected event', () => {
      expect(hoisted.onSpy).toHaveBeenCalledWith('connected', expect.any(Function));
    });

    it('should listen on error event', () => {
      expect(hoisted.onSpy).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('should listen on disconnected event', () => {
      expect(hoisted.onSpy).toHaveBeenCalledWith('disconnected', expect.any(Function));
    });

    it('should listen on reconnected event', () => {
      expect(hoisted.onSpy).toHaveBeenCalledWith('reconnected', expect.any(Function));
    });
  });

  describe('trackOperation', () => {
    it('should call performanceService on success', async () => {
      const opFn = vi.fn().mockResolvedValue([1, 2, 3]);
      const result = await dbPerformanceTracker.trackOperation('find', 'products', opFn);

      expect(result).toEqual([1, 2, 3]);
      expect(performanceService.trackDatabaseQueryTime).toHaveBeenCalledWith(
        'find', 'products', expect.any(Number), 0, 3, true,
      );
    });

    it('should track error operations on failure', async () => {
      const opFn = vi.fn().mockRejectedValue(new Error('db fail'));

      await expect(dbPerformanceTracker.trackOperation('insert', 'orders', opFn)).rejects.toThrow('db fail');

      expect(performanceService.trackDatabaseQueryTime).toHaveBeenCalledWith(
        'insert_error', 'orders', expect.any(Number), 0, 0, false,
      );
    });
  });

  describe('getPerformanceStats', () => {
    it('should return connection state and performance data', () => {
      const stats = dbPerformanceTracker.getPerformanceStats();

      expect(stats.connectionState).toBe('connected');
      expect(stats.databaseMetrics).toBeDefined();
      expect(stats.connectionPool).toBeDefined();
      expect(stats.connectionPool.maxPoolSize).toBe(10);
      expect(stats.connectionPool.minPoolSize).toBe(5);
    });
  });

  describe('createIndexAnalyzer', () => {
    it('should return analyzer with analyzeQuery and generateIndexSuggestion', () => {
      const analyzer = dbPerformanceTracker.createIndexAnalyzer('products');

      expect(analyzer).toHaveProperty('analyzeQuery');
      expect(analyzer).toHaveProperty('generateIndexSuggestion');
    });

    it('should generate index suggestion when docs examined exceed returned', () => {
      const analyzer = dbPerformanceTracker.createIndexAnalyzer('products');
      const suggestion = analyzer.generateIndexSuggestion(
        { name: 'test', status: 'active' },
        { totalDocsExamined: 1000, totalDocsReturned: 10 },
      );

      expect(suggestion).toContain('Consider creating an index');
      expect(suggestion).toContain('name');
      expect(suggestion).toContain('status');
    });

    it('should return acceptable message when performance is fine', () => {
      const analyzer = dbPerformanceTracker.createIndexAnalyzer('products');
      const suggestion = analyzer.generateIndexSuggestion(
        { name: 'test' },
        { totalDocsExamined: 10, totalDocsReturned: 10 },
      );

      expect(suggestion).toBe('Query performance is acceptable');
    });
  });
});
