import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Contact from './Contact';

vi.mock('../components/SEOMeta', () => ({
  default: () => null,
}));

describe('Contact', () => {
  it('renders header title', () => {
    render(<Contact />);
    expect(screen.getByText('GET IN TOUCH')).toBeInTheDocument();
  });

  it('renders contact form heading', () => {
    render(<Contact />);
    expect(screen.getByText('SEND A MESSAGE')).toBeInTheDocument();
  });

  it('renders form fields', () => {
    render(<Contact />);
    expect(screen.getByLabelText('First Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Last Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
    expect(screen.getByLabelText('Subject')).toBeInTheDocument();
    expect(screen.getByLabelText('Message')).toBeInTheDocument();
  });

  it('renders submit button', () => {
    render(<Contact />);
    expect(screen.getByText('Send Message')).toBeInTheDocument();
  });

  it('renders contact info heading', () => {
    render(<Contact />);
    expect(screen.getByText('CONTACT INFO')).toBeInTheDocument();
  });

  it('renders email contact', () => {
    render(<Contact />);
    expect(screen.getByText('Email Us')).toBeInTheDocument();
    expect(screen.getByText('hello@nova.com')).toBeInTheDocument();
  });

  it('renders phone contact', () => {
    render(<Contact />);
    expect(screen.getByText('Call Us')).toBeInTheDocument();
    expect(screen.getByText('+1 (234) 567-890')).toBeInTheDocument();
  });

  it('renders address contact', () => {
    render(<Contact />);
    expect(screen.getByText('Visit Us')).toBeInTheDocument();
    expect(screen.getByText(/123 Minimalist Ave/)).toBeInTheDocument();
  });

  it('renders FAQ teaser section', () => {
    render(<Contact />);
    expect(screen.getByText('HAVE A QUICK QUESTION?')).toBeInTheDocument();
    expect(screen.getByText('View FAQs')).toBeInTheDocument();
  });

  it('prevents default form submission', () => {
    render(<Contact />);
    const form = document.querySelector('form')!;
    const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
    const prevented = !form.dispatchEvent(submitEvent);
    expect(prevented).toBe(true);
  });
});
