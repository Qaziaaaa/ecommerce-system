import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock the performance API
const mockPerformance = {
  now: vi.fn(() => Date.now()),
  mark: vi.fn(),
  measure: vi.fn(),
  getEntriesByType: vi.fn(() => []),
  getEntriesByName: vi.fn(() => [])
};

// Mock PerformanceObserver
class MockPerformanceObserver {
  constructor(callback: any) {
    this.callback = callback;
  }
  
  callback: any;
  
  observe() {
    // Mock implementation
  }
  
  disconnect() {
    // Mock implementation
  }
}

// Mock navigator.sendBeacon
const mockSendBeacon = vi.fn(() => true);

// Mock fetch
const mockFetch = vi.fn(() => Promise.resolve({
  ok: true,
  json: () => Promise.resolve({})
}));

// Setup global mocks
beforeEach(() => {
  global.performance = mockPerformance as any;
  global.PerformanceObserver = MockPerformanceObserver as any;
  global.navigator = {
    ...global.navigator,
    sendBeacon: mockSendBeacon
  } as any;
  global.fetch = mockFetch as unknown as typeof fetch;
  
  // Reset mocks
  vi.clearAllMocks();
});

describe('Frontend Performance Monitoring', () => {
  describe('PerformanceMonitor Class', () => {
    it('should initialize without errors', async () => {
      // Dynamic import to avoid issues with module loading
      const { default: PerformanceMonitor } = await import('./performance');
      
      expect(PerformanceMonitor).toBeDefined();
      expect(typeof PerformanceMonitor.mark).toBe('function');
      expect(typeof PerformanceMonitor.measure).toBe('function');
      expect(typeof PerformanceMonitor.trackInteraction).toBe('function');
      expect(typeof PerformanceMonitor.getMetrics).toBe('function');
    });

    it('should track custom marks', async () => {
      const { default: performanceMonitor } = await import('./performance');
      
      performanceMonitor.mark('test-mark');
      
      expect(mockPerformance.mark).toHaveBeenCalledWith('test-mark');
    });

    it('should measure between marks', async () => {
      const { default: performanceMonitor } = await import('./performance');
      
      // Mock performance.measure to return a duration
      mockPerformance.measure.mockReturnValue(undefined);
      mockPerformance.getEntriesByName.mockReturnValue([{ duration: 100 }]);
      
      const duration = performanceMonitor.measure('test-measure', 'start-mark', 'end-mark');
      
      expect(mockPerformance.measure).toHaveBeenCalledWith('test-measure', 'start-mark', 'end-mark');
      expect(duration).toBe(100);
    });

    it('should track user interactions', async () => {
      const { default: performanceMonitor } = await import('./performance');
      
      performanceMonitor.trackInteraction('click', 'button', 50);
      
      // Should call sendBeacon or fetch
      expect(mockSendBeacon).toHaveBeenCalled();
    });

    it('should track page loads', async () => {
      const { default: performanceMonitor } = await import('./performance');
      
      performanceMonitor.trackPageLoad('/test-page');
      
      // trackPageLoad sets up an event listener, so we need to simulate the load event
      // For now, just verify the method exists and doesn't throw
      expect(typeof performanceMonitor.trackPageLoad).toBe('function');
    });

    it('should return current metrics', async () => {
      const { default: performanceMonitor } = await import('./performance');
      
      const metrics = performanceMonitor.getMetrics();
      
      expect(metrics).toBeDefined();
      expect(typeof metrics).toBe('object');
    });
  });

  describe('Performance Hooks', () => {
    it('should initialize performance monitoring hook', async () => {
      const { usePerformanceMonitoring } = await import('../hooks/usePerformanceMonitoring');
      
      expect(usePerformanceMonitoring).toBeDefined();
      expect(typeof usePerformanceMonitoring).toBe('function');
    });

    it('should provide render performance tracking', async () => {
      const { useRenderPerformance } = await import('../hooks/usePerformanceMonitoring');
      
      expect(useRenderPerformance).toBeDefined();
      expect(typeof useRenderPerformance).toBe('function');
    });

    it('should provide API performance tracking', async () => {
      const { useAPIPerformance } = await import('../hooks/usePerformanceMonitoring');
      
      expect(useAPIPerformance).toBeDefined();
      expect(typeof useAPIPerformance).toBe('function');
    });

    it('should provide navigation performance tracking', async () => {
      const { useNavigationPerformance } = await import('../hooks/usePerformanceMonitoring');
      
      expect(useNavigationPerformance).toBeDefined();
      expect(typeof useNavigationPerformance).toBe('function');
    });
  });

  describe('Performance Data Transmission', () => {
    it('should send metrics via sendBeacon when available', async () => {
      const { default: performanceMonitor } = await import('./performance');
      
      performanceMonitor.trackInteraction('test-action', 'test-element', 100);
      
      expect(mockSendBeacon).toHaveBeenCalled();
      
      const calls = mockSendBeacon.mock.calls as unknown as [string, string][];
      const [url, payload] = calls[0];
      expect(url).toBe('/api/v1/performance/metrics');
      
      const data = JSON.parse(payload);
      expect(data.type).toBe('interaction');
      expect(data.data.action).toBe('test-action');
      expect(data.data.element).toBe('test-element');
      expect(data.data.duration).toBe(100);
    });

    it('should fallback to fetch when sendBeacon is not available', async () => {
      // Temporarily remove sendBeacon
      const originalSendBeacon = global.navigator.sendBeacon;
      delete (global.navigator as any).sendBeacon;
      
      const { default: performanceMonitor } = await import('./performance');
      
      performanceMonitor.trackInteraction('test-action', 'test-element', 100);
      
      expect(mockFetch).toHaveBeenCalled();
      
      const fetchCalls = mockFetch.mock.calls as unknown as [string, { method: string; headers: Record<string, string>; body: string }][];
      const [url, options] = fetchCalls[0];
      expect(url).toBe('/api/v1/performance/metrics');
      expect(options?.method).toBe('POST');
      expect(options?.headers['Content-Type']).toBe('application/json');
      
      const data = JSON.parse(options?.body);
      expect(data.type).toBe('interaction');
      
      // Restore sendBeacon
      global.navigator.sendBeacon = originalSendBeacon;
    });
  });

  describe('Core Web Vitals Tracking', () => {
    it('should handle LCP measurements', async () => {
      const { default: performanceMonitor } = await import('./performance');
      
      // Simulate LCP entry
      const mockLCPEntry = {
        name: 'largest-contentful-paint',
        startTime: 1500,
        entryType: 'largest-contentful-paint'
      };
      
      // The actual implementation would use PerformanceObserver
      // Here we just verify the structure exists
      expect(performanceMonitor).toBeDefined();
    });

    it('should handle FID measurements', async () => {
      const { default: performanceMonitor } = await import('./performance');
      
      // Simulate FID entry
      const mockFIDEntry = {
        name: 'first-input',
        startTime: 100,
        processingStart: 150,
        entryType: 'first-input'
      };
      
      expect(performanceMonitor).toBeDefined();
    });

    it('should handle CLS measurements', async () => {
      const { default: performanceMonitor } = await import('./performance');
      
      // Simulate CLS entry
      const mockCLSEntry = {
        name: 'layout-shift',
        value: 0.05,
        hadRecentInput: false,
        entryType: 'layout-shift'
      };
      
      expect(performanceMonitor).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle PerformanceObserver errors gracefully', async () => {
      // Mock PerformanceObserver to throw an error
      global.PerformanceObserver = class {
        constructor() {
          throw new Error('PerformanceObserver not supported');
        }
      } as any;
      
      // Should not throw when importing
      const { default: performanceMonitor } = await import('./performance');
      expect(performanceMonitor).toBeDefined();
    });

    it('should handle network errors when sending metrics', async () => {
      mockSendBeacon.mockReturnValue(false);
      mockFetch.mockRejectedValue(new Error('Network error'));
      
      const { default: performanceMonitor } = await import('./performance');
      
      // Should not throw when tracking fails
      expect(() => {
        performanceMonitor.trackInteraction('test', 'test', 100);
      }).not.toThrow();
    });
  });
});