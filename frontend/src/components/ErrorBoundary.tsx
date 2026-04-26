import React from 'react';
import { RefreshCw, AlertTriangle, Home } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  enableRetry?: boolean;
  maxRetries?: number;
  scope?: string;
}

export interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
  retry: () => void;
  retryCount: number;
  maxRetries: number;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
}

type EB = React.Component<ErrorBoundaryProps, ErrorBoundaryState>;

/**
 * React Error Boundary — catches JS errors in the component tree and
 * displays a fallback UI instead of crashing the whole page.
 * Requirements: 5.1 — Property 16: Error Boundary Exception Handling
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class ErrorBoundary extends (React.Component as any) {
  static defaultProps: Partial<ErrorBoundaryProps> = {
    enableRetry: true,
    maxRetries: 3,
    scope: 'App',
  };

  constructor(props: ErrorBoundaryProps) {
    super(props);
    (this as unknown as EB).state = { hasError: false, error: null, retryCount: 0 };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    const self = this as unknown as EB;
    const { onError, scope } = self.props;

    if (import.meta.env.DEV) {
      console.error(`[ErrorBoundary:${scope}]`, error, errorInfo);
    }

    try {
      import('../utils/performance').then(({ default: performanceMonitor }) => {
        performanceMonitor.trackInteraction('error-boundary-catch', scope || 'unknown', 0);
      });
    } catch {
      // Non-fatal
    }

    onError?.(error, errorInfo);
  }

  resetError(): void {
    (this as unknown as EB).setState({ hasError: false, error: null });
  }

  retry(): void {
    const self = this as unknown as EB;
    const maxRetries = self.props.maxRetries ?? 3;
    const { retryCount } = self.state;
    if (retryCount < maxRetries) {
      self.setState({ hasError: false, error: null, retryCount: retryCount + 1 });
    }
  }

  render(): React.ReactNode {
    const self = this as unknown as EB;
    const { hasError, error, retryCount } = self.state;
    const { children, fallback: FallbackComponent, enableRetry, maxRetries = 3 } = self.props;

    if (!hasError || !error) return children as React.ReactNode;

    const fallbackProps: ErrorFallbackProps = {
      error,
      resetError: () => this.resetError(),
      retry: () => this.retry(),
      retryCount,
      maxRetries,
    };

    if (FallbackComponent) {
      return <FallbackComponent {...fallbackProps} />;
    }

    return <DefaultErrorFallback {...fallbackProps} enableRetry={enableRetry} />;
  }
}

const DefaultErrorFallback: React.FC<ErrorFallbackProps & { enableRetry?: boolean }> = ({
  error,
  resetError,
  retry,
  retryCount,
  maxRetries,
  enableRetry = true,
}) => {
  const canRetry = enableRetry && retryCount < maxRetries;

  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center min-h-[300px] p-8 bg-[#EBE7E0] border border-[#2D2926]/20"
    >
      <AlertTriangle className="text-[#2D2926] mb-4" size={32} strokeWidth={1.5} />
      <h2 className="font-display text-2xl tracking-wide mb-2">Something went wrong</h2>
      <p className="text-sm opacity-60 mb-6 text-center max-w-sm">
        {import.meta.env.DEV ? error.message : 'An unexpected error occurred. Please try again.'}
      </p>
      <div className="flex gap-3">
        {canRetry && (
          <button
            onClick={retry}
            className="flex items-center gap-2 bg-[#2D2926] text-[#EBE7E0] px-6 py-3 text-[10px] font-bold tracking-[0.2em] uppercase hover:bg-[#2D2926]/90 transition-colors"
          >
            <RefreshCw size={12} />
            Retry {retryCount > 0 ? `(${retryCount}/${maxRetries})` : ''}
          </button>
        )}
        <button
          onClick={() => { resetError(); window.location.href = '/'; }}
          className="flex items-center gap-2 border border-[#2D2926] px-6 py-3 text-[10px] font-bold tracking-[0.2em] uppercase hover:bg-[#2D2926] hover:text-[#EBE7E0] transition-colors"
        >
          <Home size={12} />
          Go Home
        </button>
      </div>
    </div>
  );
};

export const withErrorBoundary = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options: Omit<ErrorBoundaryProps, 'children'> = {}
): React.FC<P> => {
  const displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component';
  const WithErrorBoundary: React.FC<P> = (props) => (
    <ErrorBoundary scope={displayName} {...options}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );
  WithErrorBoundary.displayName = `withErrorBoundary(${displayName})`;
  return WithErrorBoundary;
};

export default ErrorBoundary;
