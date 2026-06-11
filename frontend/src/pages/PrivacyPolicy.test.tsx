import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import PrivacyPolicy from './PrivacyPolicy';

vi.mock('../components/SEOMeta', () => ({
  default: () => null,
}));

describe('PrivacyPolicy', () => {
  it('renders the heading', () => {
    render(<PrivacyPolicy />);
    expect(screen.getByText('PRIVACY POLICY')).toBeInTheDocument();
  });

  it('renders section headings', () => {
    render(<PrivacyPolicy />);
    expect(screen.getByText('1. Information We Collect')).toBeInTheDocument();
    expect(screen.getByText('2. How We Use Your Information')).toBeInTheDocument();
    expect(screen.getByText('3. Information Sharing')).toBeInTheDocument();
    expect(screen.getByText('4. Data Security')).toBeInTheDocument();
    expect(screen.getByText('5. Your Rights')).toBeInTheDocument();
  });

  it('renders intro text', () => {
    render(<PrivacyPolicy />);
    expect(screen.getByText(/we take your privacy seriously/)).toBeInTheDocument();
  });
});
