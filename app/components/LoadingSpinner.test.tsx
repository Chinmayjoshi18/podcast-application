import React from 'react';
import { render, screen } from '@testing-library/react';
import LoadingSpinner from './LoadingSpinner';

describe('LoadingSpinner', () => {
  it('renders a spinner with default props', () => {
    render(<LoadingSpinner />);
    const spinner = document.querySelector('div[class*="animate-spin"]');
    expect(spinner).toBeInTheDocument();
  });

  it('renders a spinner with custom text', () => {
    const testText = 'Loading data...';
    render(<LoadingSpinner text={testText} />);
    expect(screen.getByText(testText)).toBeInTheDocument();
  });

  it('renders a small spinner when size is set to small', () => {
    render(<LoadingSpinner size="small" />);
    const spinner = document.querySelector('div[class*="w-5 h-5"]');
    expect(spinner).toBeInTheDocument();
  });

  it('renders a large spinner when size is set to large', () => {
    render(<LoadingSpinner size="large" />);
    const spinner = document.querySelector('div[class*="w-12 h-12"]');
    expect(spinner).toBeInTheDocument();
  });

  it('renders a full page overlay when fullPage is true', () => {
    render(<LoadingSpinner fullPage />);
    const overlay = document.querySelector('div[class*="fixed inset-0"]');
    expect(overlay).toBeInTheDocument();
  });
}); 