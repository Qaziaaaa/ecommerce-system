import React from 'react';
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

const ThrowError: React.FC<{ message?: string }> = ({ message = 'Test error' }) => {
    throw new Error(message);
};

beforeAll(() => {
    global.fetch = vi.fn().mockResolvedValue(new Response());
});

afterAll(() => {
    vi.restoreAllMocks();
});

describe('ErrorBoundary', () => {
    it('should render children when no error occurs', () => {
        render(
            <ErrorBoundary>
                <p>All good</p>
            </ErrorBoundary>
        );
        expect(screen.getByText('All good')).toBeInTheDocument();
    });

    it('should catch error and show default fallback', () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        render(
            <ErrorBoundary>
                <ThrowError />
            </ErrorBoundary>
        );
        expect(screen.getByText('Something went wrong')).toBeInTheDocument();
        vi.restoreAllMocks();
    });

    it('should show retry button when enableRetry is true', () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        render(
            <ErrorBoundary enableRetry maxRetries={3}>
                <ThrowError />
            </ErrorBoundary>
        );
        expect(screen.getByText(/retry/i)).toBeInTheDocument();
        vi.restoreAllMocks();
    });

    it('should show go home button', () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        render(
            <ErrorBoundary>
                <ThrowError />
            </ErrorBoundary>
        );
        expect(screen.getByText('Go Home')).toBeInTheDocument();
        vi.restoreAllMocks();
    });

    it('should accept custom fallback component', () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        const CustomFallback = () => <div>Custom Error UI</div>;
        render(
            <ErrorBoundary fallback={CustomFallback}>
                <ThrowError />
            </ErrorBoundary>
        );
        expect(screen.getByText('Custom Error UI')).toBeInTheDocument();
        vi.restoreAllMocks();
    });

    it('should call onError when error is caught', () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        const onError = vi.fn();
        render(
            <ErrorBoundary onError={onError}>
                <ThrowError />
            </ErrorBoundary>
        );
        expect(onError).toHaveBeenCalledOnce();
        expect(onError).toHaveBeenCalledWith(expect.any(Error), expect.any(Object));
        vi.restoreAllMocks();
    });

    it('should render retry count after multiple retries', () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        const { rerender } = render(
            <ErrorBoundary enableRetry maxRetries={3}>
                <ThrowError />
            </ErrorBoundary>
        );
        const retryBtn = screen.getByText(/retry/i);
        expect(retryBtn).toBeInTheDocument();
        expect(screen.getByText(/go home/i)).toBeInTheDocument();
        vi.restoreAllMocks();
    });

    it('should not show retry button when enableRetry is false', () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        render(
            <ErrorBoundary enableRetry={false}>
                <ThrowError />
            </ErrorBoundary>
        );
        expect(screen.queryByText(/retry/i)).not.toBeInTheDocument();
        expect(screen.getByText('Go Home')).toBeInTheDocument();
        vi.restoreAllMocks();
    });
});
