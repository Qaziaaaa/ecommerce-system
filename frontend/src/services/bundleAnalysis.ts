/**
 * Bundle Analysis Service
 * Provides runtime bundle size monitoring and reporting
 */

export interface ChunkInfo {
  name: string;
  size: number;
  gzippedSize?: number;
  modules: string[];
  isAsync: boolean;
}

export interface BundleReport {
  totalSize: number;
  gzippedSize: number;
  chunks: ChunkInfo[];
  dependencies: DependencyInfo[];
  recommendations: OptimizationRecommendation[];
  timestamp: Date;
}

export interface DependencyInfo {
  name: string;
  size: number;
  version: string;
  isDevDependency: boolean;
}

export interface OptimizationRecommendation {
  type: 'chunk-size' | 'dependency' | 'code-splitting' | 'tree-shaking';
  severity: 'low' | 'medium' | 'high';
  message: string;
  affectedChunks: string[];
}

export interface BundleSizeThresholds {
  initialBundle: number; // 500KB
  asyncChunk: number; // 250KB
  vendor: number; // 1MB
  warning: number; // 400KB
}

export class BundleAnalysisService {
  private static instance: BundleAnalysisService;
  private thresholds: BundleSizeThresholds = {
    initialBundle: 500 * 1024, // 500KB
    asyncChunk: 250 * 1024, // 250KB
    vendor: 1024 * 1024, // 1MB
    warning: 400 * 1024, // 400KB
  };

  private constructor() {}

  public static getInstance(): BundleAnalysisService {
    if (!BundleAnalysisService.instance) {
      BundleAnalysisService.instance = new BundleAnalysisService();
    }
    return BundleAnalysisService.instance;
  }

  /**
   * Analyze current bundle from build stats
   */
  public async analyzeBundle(): Promise<BundleReport> {
    try {
      // In production, this would read from build stats
      // For now, we'll simulate with available data
      const chunks = await this.getChunkInfo();
      const dependencies = await this.getDependencyInfo();
      
      const totalSize = chunks.reduce((sum, chunk) => sum + chunk.size, 0);
      const gzippedSize = chunks.reduce((sum, chunk) => sum + (chunk.gzippedSize || chunk.size * 0.3), 0);
      
      const recommendations = this.generateRecommendations(chunks, dependencies);

      return {
        totalSize,
        gzippedSize,
        chunks,
        dependencies,
        recommendations,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('Bundle analysis failed:', error);
      throw new Error('Failed to analyze bundle');
    }
  }

  /**
   * Identify chunks exceeding size threshold
   */
  public async identifyLargeChunks(threshold?: number): Promise<ChunkInfo[]> {
    const sizeThreshold = threshold || this.thresholds.warning;
    
    try {
      // Get actual chunk data from the analysis
      const chunks = await this.getChunkInfo();
      return chunks.filter(chunk => chunk.size > sizeThreshold);
    } catch (error) {
      console.error('Failed to identify large chunks:', error);
      return [];
    }
  }

  /**
   * Generate comprehensive size report
   */
  public async generateSizeReport(): Promise<string> {
    const report = await this.analyzeBundle();
    
    let output = '# Bundle Size Report\n\n';
    output += `Generated: ${report.timestamp.toISOString()}\n\n`;
    output += `## Summary\n`;
    output += `- Total Size: ${this.formatBytes(report.totalSize)}\n`;
    output += `- Gzipped Size: ${this.formatBytes(report.gzippedSize)}\n`;
    output += `- Number of Chunks: ${report.chunks.length}\n\n`;
    
    output += `## Chunks\n`;
    report.chunks.forEach(chunk => {
      const status = chunk.size > this.thresholds.warning ? '⚠️' : '✅';
      output += `${status} **${chunk.name}**: ${this.formatBytes(chunk.size)}`;
      if (chunk.gzippedSize) {
        output += ` (${this.formatBytes(chunk.gzippedSize)} gzipped)`;
      }
      output += ` - ${chunk.isAsync ? 'Async' : 'Sync'}\n`;
    });
    
    if (report.recommendations.length > 0) {
      output += `\n## Recommendations\n`;
      report.recommendations.forEach(rec => {
        const icon = rec.severity === 'high' ? '🔴' : rec.severity === 'medium' ? '🟡' : '🟢';
        output += `${icon} **${rec.type}**: ${rec.message}\n`;
      });
    }
    
    return output;
  }

  /**
   * Track bundle size over time
   */
  public trackBundleSize(): void {
    if (typeof window !== 'undefined' && 'performance' in window) {
      // Track resource loading performance
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.name.includes('.js') || entry.name.includes('.css')) {
            const resourceEntry = entry as PerformanceResourceTiming;
            this.logResourceSize(entry.name, resourceEntry.transferSize || 0);
          }
        });
      });
      
      observer.observe({ entryTypes: ['resource'] });
    }
  }

  /**
   * Monitor bundle size in development
   */
  public setupDevelopmentMonitoring(): void {
    if (process.env.NODE_ENV === 'development') {
      // Log bundle information in development
      console.group('🔍 Bundle Analysis');
      console.log('Bundle monitoring active');
      console.log('Thresholds:', this.thresholds);
      console.groupEnd();
      
      this.trackBundleSize();
    }
  }

  private async getChunkInfo(): Promise<ChunkInfo[]> {
    // In a real implementation, this would read from Vite's build stats
    // For now, return mock data based on our current configuration
    return [
      {
        name: 'vendor-react',
        size: 450 * 1024,
        gzippedSize: 135 * 1024,
        modules: ['react', 'react-dom', 'react-router-dom'],
        isAsync: false,
      },
      {
        name: 'vendor-stripe',
        size: 180 * 1024,
        gzippedSize: 54 * 1024,
        modules: ['@stripe/stripe-js', '@stripe/react-stripe-js'],
        isAsync: true,
      },
      {
        name: 'vendor-charts',
        size: 320 * 1024,
        gzippedSize: 96 * 1024,
        modules: ['recharts'],
        isAsync: true,
      },
      {
        name: 'vendor-motion',
        size: 120 * 1024,
        gzippedSize: 36 * 1024,
        modules: ['motion'],
        isAsync: true,
      },
      {
        name: 'vendor-state',
        size: 95 * 1024,
        gzippedSize: 28 * 1024,
        modules: ['zustand', '@tanstack/react-query', 'axios'],
        isAsync: false,
      },
      {
        name: 'vendor-ui',
        size: 85 * 1024,
        gzippedSize: 25 * 1024,
        modules: ['lucide-react', 'react-hot-toast'],
        isAsync: false,
      },
    ];
  }

  private async getDependencyInfo(): Promise<DependencyInfo[]> {
    // Mock dependency information
    return [
      { name: 'react', size: 150 * 1024, version: '19.0.0', isDevDependency: false },
      { name: 'react-dom', size: 200 * 1024, version: '19.0.0', isDevDependency: false },
      { name: 'recharts', size: 320 * 1024, version: '3.8.0', isDevDependency: false },
      { name: '@stripe/stripe-js', size: 120 * 1024, version: '8.11.0', isDevDependency: false },
    ];
  }

  private generateRecommendations(chunks: ChunkInfo[], dependencies: DependencyInfo[]): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];

    // Check for large chunks
    chunks.forEach(chunk => {
      if (chunk.size > this.thresholds.initialBundle && !chunk.isAsync) {
        recommendations.push({
          type: 'chunk-size',
          severity: 'high',
          message: `Chunk "${chunk.name}" exceeds initial bundle threshold (${this.formatBytes(this.thresholds.initialBundle)}). Consider code splitting.`,
          affectedChunks: [chunk.name],
        });
      } else if (chunk.size > this.thresholds.warning) {
        recommendations.push({
          type: 'chunk-size',
          severity: 'medium',
          message: `Chunk "${chunk.name}" is approaching size limit. Monitor for further growth.`,
          affectedChunks: [chunk.name],
        });
      }
    });

    // Check for large dependencies
    dependencies.forEach(dep => {
      if (dep.size > 200 * 1024) { // 200KB threshold
        recommendations.push({
          type: 'dependency',
          severity: 'medium',
          message: `Dependency "${dep.name}" is large (${this.formatBytes(dep.size)}). Consider alternatives or lazy loading.`,
          affectedChunks: [],
        });
      }
    });

    return recommendations;
  }

  private logResourceSize(name: string, size: number): void {
    if (size > this.thresholds.warning) {
      console.warn(`⚠️ Large resource loaded: ${name} (${this.formatBytes(size)})`);
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Export singleton instance
export const bundleAnalysisService = BundleAnalysisService.getInstance();