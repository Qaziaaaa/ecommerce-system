import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import LazyImage from './LazyImage';

beforeEach(() => {
    let callback: IntersectionObserverCallback;
    class MockObserver {
        constructor(cb: IntersectionObserverCallback) {
            callback = cb;
        }
        observe() {
            setTimeout(() => callback([{ isIntersecting: true } as IntersectionObserverEntry], this as unknown as IntersectionObserver), 0);
        }
        unobserve() {}
        disconnect() {}
        takeRecords() { return []; }
    }
    window.IntersectionObserver = MockObserver as unknown as typeof IntersectionObserver;
});

describe('LazyImage', () => {
    it('should render placeholder and img element when in view', async () => {
        render(<LazyImage src="/test.jpg" alt="Test image" />);
        expect(await screen.findByAltText('Test image')).toBeInTheDocument();
    });

    it('should show error fallback on bad src', async () => {
        render(<LazyImage src="bad-url" alt="Broken" />);
        const img = await screen.findByAltText('Broken');
        img.dispatchEvent(new Event('error'));
        expect(await screen.findByText('Image unavailable')).toBeInTheDocument();
    });
});
