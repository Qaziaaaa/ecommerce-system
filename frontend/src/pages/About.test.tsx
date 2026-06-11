import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import About from './About';

vi.mock('../components/SEOMeta', () => ({
  default: () => null,
}));

describe('About', () => {
  it('renders hero headings', () => {
    render(
      <MemoryRouter>
        <About />
      </MemoryRouter>
    );
    expect(screen.getByText('THE ART')).toBeInTheDocument();
    expect(screen.getByText('OF LIVING')).toBeInTheDocument();
  });

  it('renders scroll indicator', () => {
    render(
      <MemoryRouter>
        <About />
      </MemoryRouter>
    );
    expect(screen.getByText('Scroll to explore')).toBeInTheDocument();
  });

  it('renders marquee section', () => {
    render(
      <MemoryRouter>
        <About />
      </MemoryRouter>
    );
    expect(screen.getAllByText('FORM').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('FUNCTION').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('AESTHETICS').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('CRAFT').length).toBeGreaterThanOrEqual(1);
  });

  it('renders Our Philosophy section', () => {
    render(
      <MemoryRouter>
        <About />
      </MemoryRouter>
    );
    expect(screen.getByText('Our Philosophy')).toBeInTheDocument();
    expect(screen.getByText(/WE REJECT THE MUNDANE/)).toBeInTheDocument();
  });

  it('renders philosophy blocks', () => {
    render(
      <MemoryRouter>
        <About />
      </MemoryRouter>
    );
    expect(screen.getByText('UNCOMPROMISING QUALITY')).toBeInTheDocument();
    expect(screen.getByText('TIMELESS DESIGN')).toBeInTheDocument();
    expect(screen.getByText('FUNCTIONAL ART')).toBeInTheDocument();
  });

  it('renders elevation section', () => {
    render(
      <MemoryRouter>
        <About />
      </MemoryRouter>
    );
    expect(screen.getByText('ELEVATE THE EVERYDAY.')).toBeInTheDocument();
  });

  it('renders Enter The Shop link', () => {
    render(
      <MemoryRouter>
        <About />
      </MemoryRouter>
    );
    const shopLink = screen.getByText('Enter The Shop');
    expect(shopLink.closest('a')).toHaveAttribute('href', '/shop');
  });
});
