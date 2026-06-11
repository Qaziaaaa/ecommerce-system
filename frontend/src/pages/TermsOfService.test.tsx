import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import TermsOfService from './TermsOfService';

vi.mock('../components/SEOMeta', () => ({
  default: () => null,
}));

describe('TermsOfService', () => {
  it('renders the heading', () => {
    render(<TermsOfService />);
    expect(screen.getByText('TERMS OF SERVICE')).toBeInTheDocument();
  });

  it('renders section headings', () => {
    render(<TermsOfService />);
    expect(screen.getByText('1. Acceptance of Terms')).toBeInTheDocument();
    expect(screen.getByText('2. Use of the Site')).toBeInTheDocument();
    expect(screen.getByText('3. Intellectual Property')).toBeInTheDocument();
    expect(screen.getByText('4. Product Information')).toBeInTheDocument();
    expect(screen.getByText('5. Limitation of Liability')).toBeInTheDocument();
  });

  it('renders welcome message', () => {
    render(<TermsOfService />);
    expect(screen.getByText(/Welcome to NOVA/)).toBeInTheDocument();
  });
});
