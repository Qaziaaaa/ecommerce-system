import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BundleAnalysisService, bundleAnalysisService } from '../services/bundleAnalysis';

describe('BundleAnalysisService', () => {
  let service: BundleAnalysisService;

  beforeEach(() => {
    service = BundleAnalysisService.getInstance();
  });

  describe('singleton', () => {
    it('should return the same instance', () => {
      const instance1 = BundleAnalysisService.getInstance();
      const instance2 = BundleAnalysisService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('analyzeBundle', () => {
    it('should return a complete bundle report', async () => {
      const report = await service.analyzeBundle();

      expect(report).toBeDefined();
      expect(report.totalSize).toBeGreaterThan(0);
      expect(report.gzippedSize).toBeGreaterThan(0);
      expect(report.chunks.length).toBeGreaterThan(0);
      expect(report.dependencies.length).toBeGreaterThan(0);
      expect(report.timestamp).toBeInstanceOf(Date);
    });

    it('should include chunk info with all required fields', async () => {
      const report = await service.analyzeBundle();
      for (const chunk of report.chunks) {
        expect(chunk.name).toBeTruthy();
        expect(chunk.size).toBeGreaterThan(0);
        expect(Array.isArray(chunk.modules)).toBe(true);
        expect(typeof chunk.isAsync).toBe('boolean');
      }
    });

    it('should include recommendations', async () => {
      const report = await service.analyzeBundle();
      expect(report.recommendations.length).toBeGreaterThan(0);
      for (const rec of report.recommendations) {
        expect(['chunk-size', 'dependency', 'code-splitting', 'tree-shaking']).toContain(rec.type);
        expect(['low', 'medium', 'high']).toContain(rec.severity);
        expect(rec.message).toBeTruthy();
      }
    });
  });

  describe('identifyLargeChunks', () => {
    it('should return chunks exceeding given threshold', async () => {
      const large = await service.identifyLargeChunks(200 * 1024);
      expect(large.length).toBeGreaterThan(0);
      for (const chunk of large) {
        expect(chunk.size).toBeGreaterThan(200 * 1024);
      }
    });

    it('should return empty array if no chunks exceed threshold', async () => {
      const large = await service.identifyLargeChunks(999999999);
      expect(large).toHaveLength(0);
    });
  });

  describe('generateSizeReport', () => {
    it('should generate a markdown report', async () => {
      const report = await service.generateSizeReport();
      expect(report).toContain('# Bundle Size Report');
      expect(report).toContain('## Summary');
      expect(report).toContain('## Chunks');
    });
  });

  describe('formatBytes', () => {
    it('should format bytes correctly', () => {
      expect((service as any).formatBytes(0)).toBe('0 Bytes');
      expect((service as any).formatBytes(1024)).toBe('1 KB');
      expect((service as any).formatBytes(1048576)).toBe('1 MB');
    });
  });
});
