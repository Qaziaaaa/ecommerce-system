import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import usePerformanceMonitoring, { useRenderPerformance, useAPIPerformance, useNavigationPerformance } from '../hooks/usePerformanceMonitoring';
import performanceMonitor from '../utils/performance';

const mock = vi.mocked(performanceMonitor);

vi.mock('../utils/performance', () => {
  const m = { trackPageLoad: vi.fn(), cleanup: vi.fn(), mark: vi.fn(), measure: vi.fn(() => 42), trackInteraction: vi.fn(), getMetrics: vi.fn(() => ({ LCP: 1500, FID: 50 })) };
  return { default: m };
});

describe('usePerformanceMonitoring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns mark, measure, trackInteraction, getMetrics', () => {
    const { result } = renderHook(() => usePerformanceMonitoring());
    expect(result.current).toHaveProperty('mark');
    expect(result.current).toHaveProperty('measure');
    expect(result.current).toHaveProperty('trackInteraction');
    expect(result.current).toHaveProperty('getMetrics');
  });

  it('tracks page load on mount', () => {
    renderHook(() => usePerformanceMonitoring());
    expect(mock.trackPageLoad).toHaveBeenCalledWith(window.location.pathname);
  });

  it('cleans up on unmount', () => {
    const { unmount } = renderHook(() => usePerformanceMonitoring());
    unmount();
    expect(mock.cleanup).toHaveBeenCalled();
  });

  it('mark calls performanceMonitor.mark', () => {
    const { result } = renderHook(() => usePerformanceMonitoring());
    act(() => result.current.mark('test-mark'));
    expect(mock.mark).toHaveBeenCalledWith('test-mark');
  });

  it('measure calls performanceMonitor.measure and returns duration', () => {
    const { result } = renderHook(() => usePerformanceMonitoring());
    let duration: number;
    act(() => { duration = result.current.measure('test-measure', 'start', 'end'); });
    expect(mock.measure).toHaveBeenCalledWith('test-measure', 'start', 'end');
    expect(duration!).toBe(42);
  });

  it('trackInteraction calls performanceMonitor.trackInteraction', () => {
    const { result } = renderHook(() => usePerformanceMonitoring());
    act(() => result.current.trackInteraction('click', 'button-save', 100));
    expect(mock.trackInteraction).toHaveBeenCalledWith('click', 'button-save', 100);
  });

  it('getMetrics returns metrics from performanceMonitor', () => {
    const { result } = renderHook(() => usePerformanceMonitoring());
    const metrics = result.current.getMetrics();
    expect(metrics).toEqual({ LCP: 1500, FID: 50 });
  });
});

describe('useRenderPerformance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns component name', () => {
    const { result } = renderHook(() => useRenderPerformance('TestComponent'));
    expect(result.current.componentName).toBe('TestComponent');
  });

  it('increments render count on each render', () => {
    const { result, rerender } = renderHook(() => useRenderPerformance('TestComponent'));
    const count1 = result.current.renderCount;
    rerender();
    const count2 = result.current.renderCount;
    expect(count2).toBeGreaterThan(count1);
  });
});

describe('useAPIPerformance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('tracks successful API call', () => {
    const { result } = renderHook(() => useAPIPerformance());
    act(() => result.current.trackAPICall('/api/products', 'GET', 100, 500, true));
    expect(mock.trackInteraction).toHaveBeenCalledWith('api-get', '/api/products', 400);
  });

  it('tracks failed API call', () => {
    const { result } = renderHook(() => useAPIPerformance());
    act(() => result.current.trackAPICall('/api/products', 'POST', 200, 300, false));
    expect(mock.trackInteraction).toHaveBeenCalledWith('api-post', '/api/products', 100);
    expect(mock.trackInteraction).toHaveBeenCalledWith('api-error', 'POST /api/products', 100);
  });

  it('tracks slow API calls', () => {
    const { result } = renderHook(() => useAPIPerformance());
    act(() => result.current.trackAPICall('/api/slow', 'GET', 0, 2000, true));
    expect(mock.trackInteraction).toHaveBeenCalledWith('slow-api-call', 'GET /api/slow', 2000);
  });
});

describe('useNavigationPerformance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns startNavigation and endNavigation', () => {
    const { result } = renderHook(() => useNavigationPerformance());
    expect(result.current).toHaveProperty('startNavigation');
    expect(result.current).toHaveProperty('endNavigation');
  });

  it('marks navigation start and end', () => {
    const { result } = renderHook(() => useNavigationPerformance());
    act(() => result.current.startNavigation('/shop'));
    act(() => result.current.endNavigation('/shop'));
    expect(mock.mark).toHaveBeenCalledWith('navigation-start-/shop');
    expect(mock.mark).toHaveBeenCalledWith('navigation-end-/shop');
    expect(mock.measure).toHaveBeenCalledWith('navigation-/shop', 'navigation-start-/shop', 'navigation-end-/shop');
    expect(mock.trackPageLoad).toHaveBeenCalledWith('/shop');
  });
});
