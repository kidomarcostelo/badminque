import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProvisionalBadge } from './ProvisionalBadge';

describe('ProvisionalBadge', () => {
  it('renders the provisional status label with accessibility attributes', () => {
    render(<ProvisionalBadge />);
    const badge = screen.getByText('Provisional');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute(
      'aria-label',
      'Provisional Rating Status (< 8 matches)'
    );
  });

  it('merges custom class names', () => {
    render(<ProvisionalBadge className="custom-class" />);
    const badge = screen.getByText('Provisional');
    expect(badge).toHaveClass('custom-class');
  });
});
