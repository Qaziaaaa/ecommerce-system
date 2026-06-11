import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import LoadingSpinner from './LoadingSpinner';

describe('LoadingSpinner', () => {
    it('should render with default message', () => {
        render(<LoadingSpinner />);
        expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should render with custom message', () => {
        render(<LoadingSpinner message="Fetching data..." />);
        expect(screen.getByText('Fetching data...')).toBeInTheDocument();
    });

    it('should render a spinner element', () => {
        render(<LoadingSpinner />);
        const container = screen.getByText('Loading...').parentElement;
        expect(container).toBeInTheDocument();
    });
});
