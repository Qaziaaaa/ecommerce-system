/**
 * Core Web Vitals and performance monitoring utilities for the frontend
 */

export interface WebVitalsMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  navigationType: string;
}

export interface PerformanceMetrics {
  LCP?: number; // Largest Contentful Paint
  FID?: number; // First Input Delay
  CLS?: number; // Cumulative Layout Shift
  TTFB?: number; // Time to First Byte
  FCP?: number; // First Contentful Paint
  INP?: number; // Interaction to Next Paint
}

export interface NavigationTiming {
  navigationStart: number;
  domContentLoaded: number;
  loadComplete: number;
  firstPaint: number;
  firstContentfulPaint: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {};
  private observers: PerformanceObserver[] = [];
  private apiEndpoint: string;
  private sessionId: string;

  constructor(apiEndpoint = '/api/v1/performance/metrics') {
    this.apiEndpoint = apiEndpoint;
    this.sessionId = this.generateSessionId();
    this.initializeWebVitals();
    this.initializeNavigationTiming();
    this.initializeResourceTiming();
  }

  /**
   * Generate a unique session ID for tracking
   */
  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Initialize Core Web Vitals monitoring
   */
  private initializeWebVitals(): void {
    // Largest Contentful Paint (LCP)
    this.observeMetric('largest-contentful-paint', (entry) => {
      const lcp = entry.startTime;
      this.metrics.LCP = lcp;
      this.reportMetric('LCP', lcp, this.getLCPRating(lcp));
    });

    // First Input Delay (FID)
    this.observeMetric('first-input', (entry) => {
      const fid = entry.processingStart - entry.startTime;
      this.metrics.FID = fid;
      this.reportMetric('FID', fid, this.getFIDRating(fid));
    });

    // Cumulative Layout Shift (CLS)
    let clsValue = 0;
    this.observeMetric('layout-shift', (entry) => {
      if (!entry.hadRecentInput) {
        clsValue += entry.value;
        this.metrics.CLS = clsValue;
        this.reportMetric('CLS', clsValue, this.getCLSRating(clsValue));
      }
    });

    // Interaction to Next Paint (INP) - newer metric
    this.observeMetric('event', (entry) => {
      if (entry.name === 'keydown' || entry.name === 'pointerdown' || entry.name === 'click') {
        const inp = entry.processingEnd - entry.startTime;
        this.metrics.INP = inp;
        this.reportMetric('INP', inp, this.getINPRating(inp));
      }
    });
  }

  /**
   * Initialize navigation timing monitoring
   */
  private initializeNavigationTiming(): void {
    if ('performance' in window && 'getEntriesByType' in performance) {
      window.addEventListener('load', () => {
        setTimeout(() => {
          const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
          
          if (navigation) {
            const ttfb = navigation.responseStart - navigation.requestStart;
            const fcp = this.getFirstContentfulPaint();
            
            this.metrics.TTFB = ttfb;
            this.metrics.FCP = fcp;
            
            this.reportMetric('TTFB', ttfb, this.getTTFBRating(ttfb));
            if (fcp) {
              this.reportMetric('FCP', fcp, this.getFCPRating(fcp));
            }

            // Report navigation timing
            this.reportNavigationTiming({
              navigationStart: 0,
              domContentLoaded: navigation.domContentLoadedEventEnd,
              loadComplete: navigation.loadEventEnd,
              firstPaint: this.getFirstPaint(),
              firstContentfulPaint: fcp || 0
            });
          }
        }, 0);
      });
    }
  }

  /**
   * Initialize resource timing monitoring
   */
  private initializeResourceTiming(): void {
    this.observeMetric('resource', (entry) => {
      const resource = entry as PerformanceResourceTiming;
      
      // Track slow resources
      const loadTime = resource.responseEnd - resource.startTime;
      if (loadTime > 1000) { // Resources taking more than 1 second
        this.reportSlowResource({
          name: resource.name,
          type: this.getResourceType(resource.name),
          loadTime,
          size: resource.transferSize || 0,
          cached: resource.transferSize === 0 && resource.decodedBodySize > 0
        });
      }
    });
  }

  /**
   * Observe a specific performance metric type
   */
  private observeMetric(type: string, callback: (entry: any) => void): void {
    try {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach(callback);
      });
      
      observer.observe({ type, buffered: true });
      this.observers.push(observer);
    } catch (error) {
      console.warn(`Failed to observe ${type} metrics:`, error);
    }
  }

  /**
   * Get First Paint timing
   */
  private getFirstPaint(): number {
    const paintEntries = performance.getEntriesByType('paint');
    const firstPaint = paintEntries.find(entry => entry.name === 'first-paint');
    return firstPaint ? firstPaint.startTime : 0;
  }

  /**
   * Get First Contentful Paint timing
   */
  private getFirstContentfulPaint(): number {
    const paintEntries = performance.getEntriesByType('paint');
    const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint');
    return fcp ? fcp.startTime : 0;
  }

  /**
   * Get resource type from URL
   */
  private getResourceType(url: string): string {
    if (url.match(/\.(js|mjs)$/)) return 'script';
    if (url.match(/\.css$/)) return 'stylesheet';
    if (url.match(/\.(png|jpg|jpeg|gif|svg|webp)$/)) return 'image';
    if (url.match(/\.(woff|woff2|ttf|otf)$/)) return 'font';
    if (url.includes('/api/')) return 'api';
    return 'other';
  }

  /**
   * Rating functions for Core Web Vitals
   */
  private getLCPRating(value: number): 'good' | 'needs-improvement' | 'poor' {
    if (value <= 2500) return 'good';
    if (value <= 4000) return 'needs-improvement';
    return 'poor';
  }

  private getFIDRating(value: number): 'good' | 'needs-improvement' | 'poor' {
    if (value <= 100) return 'good';
    if (value <= 300) return 'needs-improvement';
    return 'poor';
  }

  private getCLSRating(value: number): 'good' | 'needs-improvement' | 'poor' {
    if (value <= 0.1) return 'good';
    if (value <= 0.25) return 'needs-improvement';
    return 'poor';
  }

  private getINPRating(value: number): 'good' | 'needs-improvement' | 'poor' {
    if (value <= 200) return 'good';
    if (value <= 500) return 'needs-improvement';
    return 'poor';
  }

  private getTTFBRating(value: number): 'good' | 'needs-improvement' | 'poor' {
    if (value <= 800) return 'good';
    if (value <= 1800) return 'needs-improvement';
    return 'poor';
  }

  private getFCPRating(value: number): 'good' | 'needs-improvement' | 'poor' {
    if (value <= 1800) return 'good';
    if (value <= 3000) return 'needs-improvement';
    return 'poor';
  }

  /**
   * Report a performance metric to the backend
   */
  private reportMetric(name: string, value: number, rating: 'good' | 'needs-improvement' | 'poor'): void {
    const metric: WebVitalsMetric = {
      name,
      value,
      rating,
      delta: value, // For simplicity, using value as delta
      id: this.generateMetricId(),
      navigationType: this.getNavigationType()
    };

    this.sendToBackend('metric', {
      ...metric,
      sessionId: this.sessionId,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent
    });
  }

  /**
   * Report navigation timing to the backend
   */
  private reportNavigationTiming(timing: NavigationTiming): void {
    this.sendToBackend('navigation', {
      ...timing,
      sessionId: this.sessionId,
      timestamp: Date.now(),
      url: window.location.href
    });
  }

  /**
   * Report slow resource loading
   */
  private reportSlowResource(resource: any): void {
    this.sendToBackend('slow-resource', {
      ...resource,
      sessionId: this.sessionId,
      timestamp: Date.now(),
      url: window.location.href
    });
  }

  /**
   * Generate a unique metric ID
   */
  private generateMetricId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get navigation type
   */
  private getNavigationType(): string {
    if ('performance' in window && 'getEntriesByType' in performance) {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return navigation?.type || 'unknown';
    }
    return 'unknown';
  }

  /**
   * Send data to backend
   */
  private sendToBackend(type: string, data: any): void {
    // Use sendBeacon for reliability, fallback to fetch
    const payload = JSON.stringify({ type, data });
    
    if ('sendBeacon' in navigator) {
      navigator.sendBeacon(this.apiEndpoint, payload);
    } else {
      fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: payload,
        keepalive: true
      }).catch(error => {
        console.warn('Failed to send performance metric:', error);
      });
    }
  }

  /**
   * Track custom performance marks
   */
  public mark(name: string): void {
    if ('performance' in window && 'mark' in performance) {
      performance.mark(name);
    }
  }

  /**
   * Measure time between two marks
   */
  public measure(name: string, startMark: string, endMark?: string): number {
    if ('performance' in window && 'measure' in performance) {
      try {
        performance.measure(name, startMark, endMark);
        const measure = performance.getEntriesByName(name, 'measure')[0];
        return measure ? measure.duration : 0;
      } catch (error) {
        console.warn('Failed to measure performance:', error);
        return 0;
      }
    }
    return 0;
  }

  /**
   * Track page load performance
   */
  public trackPageLoad(pageName: string): void {
    window.addEventListener('load', () => {
      setTimeout(() => {
        const loadTime = performance.now();
        this.sendToBackend('page-load', {
          pageName,
          loadTime,
          sessionId: this.sessionId,
          timestamp: Date.now(),
          url: window.location.href
        });
      }, 0);
    });
  }

  /**
   * Track user interactions
   */
  public trackInteraction(action: string, element: string, duration?: number): void {
    this.sendToBackend('interaction', {
      action,
      element,
      duration: duration || 0,
      sessionId: this.sessionId,
      timestamp: Date.now(),
      url: window.location.href
    });
  }

  /**
   * Get current performance metrics
   */
  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Cleanup observers
   */
  public cleanup(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor();

export default performanceMonitor;