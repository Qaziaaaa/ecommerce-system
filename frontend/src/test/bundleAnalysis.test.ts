/**
 * Property-Based Tests for Bundle Analysis
 * Feature: ecommerce-optimization
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { bundleAnalysisService, ChunkInfo, BundleReport } from '../services/bundleAnalysis';

describe('Bundle Analysis Property-Based Tests', () => {
  beforeEach(() => {
    // Reset any state before each test
  });

  describe('Property 1: Bundle Analysis Accuracy', () => {
    /**
     * **Validates: Requirements 1.3**
     * 
     * For any bundle configuration with chunks of varying sizes, 
     * the Bundle Analyzer SHALL correctly identify and report all chunks 
     * exceeding the 500KB threshold, with no false positives or false negatives.
     */
    it('should correctly identify chunks exceeding 500KB threshold', async () => {
      // Feature: ecommerce-optimization, Property 1: Bundle Analysis Accuracy
      
      const chunkGenerator = fc.record({
        name: fc.string({ minLength: 1, maxLength: 50 }).filter(name => name.trim().length > 0),
        size: fc.integer({ min: 1000, max: 2000000 }), // 1KB to 2MB
        gzippedSize: fc.option(fc.integer({ min: 500, max: 600000 })), // Optional gzipped size
        modules: fc.array(fc.string({ minLength: 1, maxLength: 30 }).filter(m => m.trim().length > 0), { minLength: 1, maxLength: 10 }),
        isAsync: fc.boolean(),
      });

      const bundleConfigGenerator = fc.array(chunkGenerator, { minLength: 1, maxLength: 20 });

      await fc.assert(
        fc.asyncProperty(bundleConfigGenerator, async (chunks: ChunkInfo[]) => {
          // Ensure unique chunk names
          const uniqueChunks = chunks.map((chunk, index) => ({
            ...chunk,
            name: `test-chunk-${index}-${chunk.name.replace(/\s+/g, '-')}`,
          }));

          // Mock the chunk analysis to use our test data
          const originalGetChunkInfo = (bundleAnalysisService as any).getChunkInfo;
          (bundleAnalysisService as any).getChunkInfo = async () => uniqueChunks;

          try {
            const threshold = 500 * 1024; // 500KB
            const largeChunks = await bundleAnalysisService.identifyLargeChunks(threshold);
            
            // Property: All chunks exceeding threshold should be identified
            const expectedLargeChunks = uniqueChunks.filter(chunk => chunk.size > threshold);
            
            // Check no false negatives: all large chunks are identified
            for (const expectedChunk of expectedLargeChunks) {
              const found = largeChunks.find(chunk => 
                chunk.name === expectedChunk.name && chunk.size === expectedChunk.size
              );
              expect(found).toBeDefined();
            }
            
            // Check no false positives: no small chunks are identified as large
            for (const identifiedChunk of largeChunks) {
              expect(identifiedChunk.size).toBeGreaterThan(threshold);
            }
            
            // Property: Exact count should match
            expect(largeChunks.length).toBe(expectedLargeChunks.length);
            
          } finally {
            // Restore original method
            (bundleAnalysisService as any).getChunkInfo = originalGetChunkInfo;
          }
        }),
        { numRuns: 100 }
      );
    });

    it('should handle edge cases around the 500KB threshold', async () => {
      // Test edge cases specifically around the threshold
      const edgeCaseGenerator = fc.record({
        name: fc.string({ minLength: 1, maxLength: 20 }).filter(name => name.trim().length > 0),
        size: fc.integer({ min: 500 * 1024 - 100, max: 500 * 1024 + 100 }), // Around 500KB
        gzippedSize: fc.option(fc.integer({ min: 150000, max: 200000 })),
        modules: fc.array(fc.string({ minLength: 1, maxLength: 10 }).filter(m => m.trim().length > 0), { minLength: 1, maxLength: 5 }),
        isAsync: fc.boolean(),
      });

      await fc.assert(
        fc.asyncProperty(fc.array(edgeCaseGenerator, { minLength: 1, maxLength: 10 }), async (chunks: ChunkInfo[]) => {
          // Ensure unique chunk names
          const uniqueChunks = chunks.map((chunk, index) => ({
            ...chunk,
            name: `edge-chunk-${index}-${chunk.name.replace(/\s+/g, '-')}`,
          }));

          const originalGetChunkInfo = (bundleAnalysisService as any).getChunkInfo;
          (bundleAnalysisService as any).getChunkInfo = async () => uniqueChunks;

          try {
            const threshold = 500 * 1024;
            const largeChunks = await bundleAnalysisService.identifyLargeChunks(threshold);
            
            // Property: Boundary conditions must be handled correctly
            for (const chunk of uniqueChunks) {
              const isIdentifiedAsLarge = largeChunks.some(lc => lc.name === chunk.name);
              const shouldBeIdentifiedAsLarge = chunk.size > threshold;
              
              expect(isIdentifiedAsLarge).toBe(shouldBeIdentifiedAsLarge);
            }
          } finally {
            (bundleAnalysisService as any).getChunkInfo = originalGetChunkInfo;
          }
        }),
        { numRuns: 50 }
      );
    });
  });

  describe('Property 2: Complete Chunk Reporting', () => {
    /**
     * **Validates: Requirements 1.4**
     * 
     * For any production build containing N chunks, the Bundle Analyzer 
     * SHALL generate a size report that includes exactly N chunks with 
     * accurate size information for each.
     */
    it('should generate complete size report with all chunks', async () => {
      // Feature: ecommerce-optimization, Property 2: Complete Chunk Reporting
      
      const chunkGenerator = fc.record({
        name: fc.string({ minLength: 1, maxLength: 30 }).filter(name => name.trim().length > 0),
        size: fc.integer({ min: 1000, max: 1000000 }), // 1KB to 1MB
        gzippedSize: fc.option(fc.integer({ min: 300, max: 300000 })),
        modules: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 8 }),
        isAsync: fc.boolean(),
      });

      await fc.assert(
        fc.asyncProperty(fc.array(chunkGenerator, { minLength: 1, maxLength: 15 }), async (chunks: ChunkInfo[]) => {
          // Ensure unique chunk names to avoid conflicts
          const uniqueChunks = chunks.map((chunk, index) => ({
            ...chunk,
            name: `${chunk.name}-${index}`,
          }));

          const originalGetChunkInfo = (bundleAnalysisService as any).getChunkInfo;
          const originalGetDependencyInfo = (bundleAnalysisService as any).getDependencyInfo;
          
          (bundleAnalysisService as any).getChunkInfo = async () => uniqueChunks;
          (bundleAnalysisService as any).getDependencyInfo = async () => [];

          try {
            const report = await bundleAnalysisService.analyzeBundle();
            
            // Property: Report must include exactly N chunks
            expect(report.chunks.length).toBe(uniqueChunks.length);
            
            // Property: Each chunk must have accurate size information
            for (const originalChunk of uniqueChunks) {
              const reportedChunk = report.chunks.find(c => c.name === originalChunk.name);
              expect(reportedChunk).toBeDefined();
              expect(reportedChunk!.size).toBe(originalChunk.size);
              expect(reportedChunk!.isAsync).toBe(originalChunk.isAsync);
              expect(reportedChunk!.modules).toEqual(originalChunk.modules);
              
              if (originalChunk.gzippedSize !== undefined) {
                expect(reportedChunk!.gzippedSize).toBe(originalChunk.gzippedSize);
              }
            }
            
            // Property: Total size should be sum of all chunk sizes
            const expectedTotalSize = uniqueChunks.reduce((sum, chunk) => sum + chunk.size, 0);
            expect(report.totalSize).toBe(expectedTotalSize);
            
            // Property: Report should have valid timestamp
            expect(report.timestamp).toBeInstanceOf(Date);
            expect(report.timestamp.getTime()).toBeLessThanOrEqual(Date.now());
            
          } finally {
            (bundleAnalysisService as any).getChunkInfo = originalGetChunkInfo;
            (bundleAnalysisService as any).getDependencyInfo = originalGetDependencyInfo;
          }
        }),
        { numRuns: 100 }
      );
    });

    it('should generate accurate size report text format', async () => {
      // Test the text report generation completeness
      const chunkGenerator = fc.record({
        name: fc.string({ minLength: 1, maxLength: 20 }).filter(name => /^[a-zA-Z0-9-_]+$/.test(name)),
        size: fc.integer({ min: 5000, max: 800000 }),
        gzippedSize: fc.option(fc.integer({ min: 1500, max: 240000 })),
        modules: fc.array(fc.string({ minLength: 1, maxLength: 15 }), { minLength: 1, maxLength: 5 }),
        isAsync: fc.boolean(),
      });

      await fc.assert(
        fc.asyncProperty(fc.array(chunkGenerator, { minLength: 1, maxLength: 8 }), async (chunks: ChunkInfo[]) => {
          const uniqueChunks = chunks.map((chunk, index) => ({
            ...chunk,
            name: `chunk-${index}-${chunk.name}`,
          }));

          const originalGetChunkInfo = (bundleAnalysisService as any).getChunkInfo;
          const originalGetDependencyInfo = (bundleAnalysisService as any).getDependencyInfo;
          
          (bundleAnalysisService as any).getChunkInfo = async () => uniqueChunks;
          (bundleAnalysisService as any).getDependencyInfo = async () => [];

          try {
            const sizeReport = await bundleAnalysisService.generateSizeReport();
            
            // Property: Report should contain all chunk names
            for (const chunk of uniqueChunks) {
              expect(sizeReport).toContain(chunk.name);
            }
            
            // Property: Report should contain size information
            expect(sizeReport).toContain('Total Size:');
            expect(sizeReport).toContain('Gzipped Size:');
            expect(sizeReport).toContain('Number of Chunks:');
            
            // Property: Report should indicate async/sync status
            const asyncChunks = uniqueChunks.filter(c => c.isAsync);
            const syncChunks = uniqueChunks.filter(c => !c.isAsync);
            
            if (asyncChunks.length > 0) {
              expect(sizeReport).toContain('Async');
            }
            if (syncChunks.length > 0) {
              expect(sizeReport).toContain('Sync');
            }
            
            // Property: Report should be valid markdown format
            expect(sizeReport).toMatch(/^# Bundle Size Report/);
            expect(sizeReport).toContain('## Summary');
            expect(sizeReport).toContain('## Chunks');
            
          } finally {
            (bundleAnalysisService as any).getChunkInfo = originalGetChunkInfo;
            (bundleAnalysisService as any).getDependencyInfo = originalGetDependencyInfo;
          }
        }),
        { numRuns: 50 }
      );
    });
  });

  describe('Bundle Analysis Integration Properties', () => {
    it('should maintain consistency between different analysis methods', async () => {
      // Property: Different analysis methods should return consistent data
      const chunkGenerator = fc.record({
        name: fc.string({ minLength: 1, maxLength: 25 }).filter(name => name.trim().length > 0),
        size: fc.integer({ min: 10000, max: 1500000 }),
        gzippedSize: fc.option(fc.integer({ min: 3000, max: 450000 })),
        modules: fc.array(fc.string({ minLength: 1, maxLength: 12 }).filter(m => m.trim().length > 0), { minLength: 1, maxLength: 6 }),
        isAsync: fc.boolean(),
      });

      await fc.assert(
        fc.asyncProperty(fc.array(chunkGenerator, { minLength: 2, maxLength: 10 }), async (chunks: ChunkInfo[]) => {
          const uniqueChunks = chunks.map((chunk, index) => ({
            ...chunk,
            name: `consistency-test-chunk-${index}`,
          }));

          const originalGetChunkInfo = (bundleAnalysisService as any).getChunkInfo;
          const originalGetDependencyInfo = (bundleAnalysisService as any).getDependencyInfo;
          
          (bundleAnalysisService as any).getChunkInfo = async () => uniqueChunks;
          (bundleAnalysisService as any).getDependencyInfo = async () => [];

          try {
            // Get data from different methods
            const fullReport = await bundleAnalysisService.analyzeBundle();
            const largeChunks = await bundleAnalysisService.identifyLargeChunks(400 * 1024); // 400KB threshold
            
            // Property: Large chunks identified should be subset of all chunks in report
            for (const largeChunk of largeChunks) {
              const foundInReport = fullReport.chunks.find(c => 
                c.name === largeChunk.name && c.size === largeChunk.size
              );
              expect(foundInReport).toBeDefined();
            }
            
            // Property: All chunks in report should have consistent data
            expect(fullReport.chunks.length).toBe(uniqueChunks.length);
            
            // Property: Large chunks should actually be large
            for (const largeChunk of largeChunks) {
              expect(largeChunk.size).toBeGreaterThan(400 * 1024);
            }
            
          } finally {
            (bundleAnalysisService as any).getChunkInfo = originalGetChunkInfo;
            (bundleAnalysisService as any).getDependencyInfo = originalGetDependencyInfo;
          }
        }),
        { numRuns: 75 }
      );
    });
  });
});