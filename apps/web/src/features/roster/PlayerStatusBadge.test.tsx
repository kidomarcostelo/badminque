import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PlayerStatusBadge } from './PlayerStatusBadge';

describe('PlayerStatusBadge', () => {
  it('renders QUEUED state correctly', () => {
    render(<PlayerStatusBadge status="QUEUED" />);
    const badge = screen.getByText('QUEUED');
    expect(badge).toBeInTheDocument();
  });

  it('renders PLAYING state correctly', () => {
    render(<PlayerStatusBadge status="PLAYING" />);
    const badge = screen.getByText('PLAYING');
    expect(badge).toBeInTheDocument();
  });

  it('renders RESTING state correctly', () => {
    render(<PlayerStatusBadge status="RESTING" />);
    const badge = screen.getByText('RESTING');
    expect(badge).toBeInTheDocument();
  });

  it('renders SKIPPED and WAITING_PARTNER states correctly', () => {
    const { rerender } = render(<PlayerStatusBadge status="SKIPPED" />);
    expect(screen.getByText('SKIPPED')).toBeInTheDocument();

    rerender(<PlayerStatusBadge status="WAITING_PARTNER" />);
    expect(screen.getByText('WAITING')).toBeInTheDocument();
  });
});
