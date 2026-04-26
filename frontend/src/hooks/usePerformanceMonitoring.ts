import { useEffect, useRef } from 'react';
import performanceMonitor from '../utils/performance';

/**
 * React hook for performance monitoring integration
 */
export const usePerformanceMonitoring = () => {
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      // Initialize performance monitoring
      performanceMonitor.trackPageLoad(window.location.pathname);
      initialized.current = true;
    }

    // Cleanup on unmount
    return () => {
      if (initialized.current) {
        performanceMonitor.cleanup();
      }
    };
  }, []);

  return {
    /**
     * Track a custom performance mark
     */
    mark: (name: string) => {
      performanceMonitor.mark(name);
    },

    /**
     * Measure time between two marks
     */
    measure: (name: string, startMark: string, endMark?: string) => {
      return performanceMonitor.measure(name, startMark, endMark);
    },

    /**
     * Track user interaction
     */
    trackInteraction: (action: string, element: string, duration?: number) => {
      performanceMonitor.trackInteraction(action, element, duration);
    },

    /**
     * Get current performance metrics
     */
    getMetrics: () => {
      return performanceMonitor.getMetrics();
    }
  };
};

/**
 * Hook for tracking component render performance
 */
export const useRenderPerformance = (componentName: string) => {
  const renderCount = useRef(0);
  const startTime = useRef<number>(0);

  useEffect(() => {
    renderCount.current += 1;
    startTime.current = performance.now();
    
    performanceMonitor.mark(`${componentName}-render-start-${renderCount.current}`);

    return () => {
      const endTime = performance.now();
      const renderDuration = endTime - startTime.current;
      
      performanceMonitor.mark(`${componentName}-render-end-${renderCount.current}`);
      performanceMonitor.measure(
        `${componentName}-render-${renderCount.current}`,
        `${componentName}-render-start-${renderCount.current}`,
        `${componentName}-render-end-${renderCount.current}`
      );

      // Track slow renders (> 16ms for 60fps)
      if (renderDuration > 16) {
        performanceMonitor.trackInteraction(
          'slow-render',
          componentName,
          renderDuration
        );
      }
    };
  });

  return {
    renderCount: renderCount.current,
    componentName
  };
};

/**
 * Hook for tracking API call performance
 */
export const useAPIPerformance = () => {
  const trackAPICall = (
    endpoint: string,
    method: string = 'GET',
    startTime: number,
    endTime: number,
    success: boolean = true
  ) => {
    const duration = endTime - startTime;
    
    performanceMonitor.trackInteraction(
      `api-${method.toLowerCase()}`,
      endpoint,
      duration
    );

    // Track slow API calls (> 1 second)
    if (duration > 1000) {
      performanceMonitor.trackInteraction(
        'slow-api-call',
        `${method} ${endpoint}`,
        duration
      );
    }

    // Track failed API calls
    if (!success) {
      performanceMonitor.trackInteraction(
        'api-error',
        `${method} ${endpoint}`,
        duration
      );
    }
  };

  return { trackAPICall };
};

/**
 * Hook for tracking route changes and navigation performance
 */
export const useNavigationPerformance = () => {
  const navigationStart = useRef<number>(0);

  const startNavigation = (route: string) => {
    navigationStart.current = performance.now();
    performanceMonitor.mark(`navigation-start-${route}`);
  };

  const endNavigation = (route: string) => {
    const endTime = performance.now();
    const navigationDuration = endTime - navigationStart.current;
    
    performanceMonitor.mark(`navigation-end-${route}`);
    performanceMonitor.measure(
      `navigation-${route}`,
      `navigation-start-${route}`,
      `navigation-end-${route}`
    );

    performanceMonitor.trackInteraction(
      'navigation',
      route,
      navigationDuration
    );

    // Track page load for the new route
    performanceMonitor.trackPageLoad(route);
  };

  return {
    startNavigation,
    endNavigation
  };
};

export default usePerformanceMonitoring;