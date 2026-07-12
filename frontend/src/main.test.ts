import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('react-dom/client', () => ({
  createRoot: vi.fn(() => ({ render: vi.fn() })),
}));

vi.mock('./App', () => ({ default: () => null }));

vi.mock('@sentry/react', () => ({
  default: { init: vi.fn() },
  reactRouterV6BrowserTracingIntegration: vi.fn(() => ({})),
}));

vi.mock('./api/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
    defaults: {},
  },
}));

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
  }, 10000);
});
