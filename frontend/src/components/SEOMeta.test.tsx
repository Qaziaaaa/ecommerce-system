import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import SEOMeta from './SEOMeta';

function renderWithHelmet(ui: React.ReactElement) {
  return render(<HelmetProvider>{ui}</HelmetProvider>);
}

describe('SEOMeta', () => {
  it('sets the document title', () => {
    renderWithHelmet(<SEOMeta title="Shop" />);
    expect(document.title).toBe('Shop | NOVA');
  });

  it('sets default description when not provided', () => {
    renderWithHelmet(<SEOMeta title="Home" />);
    const meta = document.querySelector('meta[name="description"]');
    expect(meta).toBeTruthy();
    expect(meta?.getAttribute('content')).toContain('premium products');
  });

  it('sets custom description', () => {
    renderWithHelmet(<SEOMeta title="About" description="Learn about our story" />);
    const meta = document.querySelector('meta[name="description"]');
    expect(meta?.getAttribute('content')).toBe('Learn about our story');
  });

  it('sets og:title and og:description', () => {
    renderWithHelmet(<SEOMeta title="Contact" description="Get in touch" />);
    expect(document.querySelector('meta[property="og:title"]')?.getAttribute('content')).toBe('Contact | NOVA');
    expect(document.querySelector('meta[property="og:description"]')?.getAttribute('content')).toBe('Get in touch');
  });

  it('sets og:type default to website', () => {
    renderWithHelmet(<SEOMeta title="Home" />);
    expect(document.querySelector('meta[property="og:type"]')?.getAttribute('content')).toBe('website');
  });

  it('sets og:image when provided', () => {
    renderWithHelmet(<SEOMeta title="Home" ogImage="https://example.com/image.jpg" />);
    expect(document.querySelector('meta[property="og:image"]')?.getAttribute('content')).toBe('https://example.com/image.jpg');
  });

  it('sets canonical link when provided', () => {
    renderWithHelmet(<SEOMeta title="Home" canonical="https://example.com" />);
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe('https://example.com');
  });

  it('sets twitter card meta', () => {
    renderWithHelmet(<SEOMeta title="Home" />);
    expect(document.querySelector('meta[name="twitter:card"]')?.getAttribute('content')).toBe('summary_large_image');
    expect(document.querySelector('meta[name="twitter:title"]')?.getAttribute('content')).toBe('Home | NOVA');
  });

  it('sets twitter image when ogImage provided', () => {
    renderWithHelmet(<SEOMeta title="Home" ogImage="https://example.com/img.jpg" />);
    expect(document.querySelector('meta[name="twitter:image"]')?.getAttribute('content')).toBe('https://example.com/img.jpg');
  });

  it('injects jsonLd script when provided', () => {
    const jsonLd = { '@context': 'https://schema.org', '@type': 'Organization', name: 'NOVA' };
    renderWithHelmet(<SEOMeta title="Home" jsonLd={jsonLd} />);
    const script = document.querySelector('script[type="application/ld+json"]');
    expect(script).toBeTruthy();
    expect(script?.innerHTML).toContain('"@type":"Organization"');
  });

  it('does not inject jsonLd when not provided', () => {
    renderWithHelmet(<SEOMeta title="Home" />);
    expect(document.querySelector('script[type="application/ld+json"]')).toBeNull();
  });
});
