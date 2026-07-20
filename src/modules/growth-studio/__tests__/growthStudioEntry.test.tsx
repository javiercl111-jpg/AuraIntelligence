// ─────────────────────────────────────────────────────────────
// Aura Growth Studio™ — GrowthStudioEntry Component Tests
// ─────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import GrowthStudioEntry from '../components/GrowthStudioEntry';

describe('GrowthStudioEntry', () => {
  it('renders without throwing an exception', () => {
    expect(() => render(<GrowthStudioEntry />)).not.toThrow();
  });

  it('displays the product name', () => {
    render(<GrowthStudioEntry />);
    expect(screen.getByText('Aura Growth Studio™')).toBeInTheDocument();
  });

  it('displays the subtitle', () => {
    render(<GrowthStudioEntry />);
    expect(screen.getByText('AI Growth Operating System')).toBeInTheDocument();
  });

  it('displays the Launch Edition badge', () => {
    render(<GrowthStudioEntry />);
    expect(screen.getByText('Launch Edition')).toBeInTheDocument();
  });

  it('displays the foundation status', () => {
    render(<GrowthStudioEntry />);
    expect(screen.getByText('Foundation in progress')).toBeInTheDocument();
  });

  it('has the growth-studio-entry id for targeting', () => {
    const { container } = render(<GrowthStudioEntry />);
    expect(container.querySelector('#growth-studio-entry')).toBeTruthy();
  });
});
