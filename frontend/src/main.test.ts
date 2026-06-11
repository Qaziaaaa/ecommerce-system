import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('react-dom/client', () => ({
  createRoot: vi.fn(() => ({ render: vi.fn() })),
}));

vi.mock('./App', () => ({ default: () => null }));

describe('main entry point', () => {
  beforeEach(() => {
    while (document.body.firstChild) document.body.removeChild(document.body.firstChild);
  });

  it('renders App into root element', async () => {
    const rootEl = document.createElement('div');
    rootEl.id = 'root';
    document.body.appendChild(rootEl);
    const { createRoot } = await import('react-dom/client');
    await import('./main');
    expect(createRoot).toHaveBeenCalledWith(rootEl);
  });
});
