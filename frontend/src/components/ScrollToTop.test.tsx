import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import ScrollToTop from './ScrollToTop';

function NavButton() {
  const navigate = useNavigate();
  return <button onClick={() => navigate('/about')}>Go</button>;
}

describe('ScrollToTop', () => {
  beforeEach(() => {
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  });

  it('renders nothing', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/']}>
        <ScrollToTop />
      </MemoryRouter>
    );
    expect(container.innerHTML).toBe('');
  });

  it('calls window.scrollTo on mount', async () => {
    render(
      <MemoryRouter initialEntries={['/shop']}>
        <ScrollToTop />
      </MemoryRouter>
    );
    await vi.waitFor(() => {
      expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'instant' });
    });
  });

  it('calls window.scrollTo again after pathname change', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <ScrollToTop />
        <NavButton />
      </MemoryRouter>
    );
    await vi.waitFor(() => {
      expect(window.scrollTo).toHaveBeenCalled();
    });
    (window.scrollTo as any).mockClear();
    fireEvent.click(screen.getByText('Go'));
    await vi.waitFor(() => {
      expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'instant' });
    });
  });
});
