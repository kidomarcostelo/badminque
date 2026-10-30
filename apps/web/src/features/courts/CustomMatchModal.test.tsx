import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { RosterPlayer } from '@badminque/core';
import { CustomMatchModal } from './CustomMatchModal';

const mockRoster: RosterPlayer[] = [
  {
    id: 'p1',
    name: 'Viktor Axelsen',
    auth_user_id: null,
    singles_rating: 1740,
    doubles_rating: 1740,
    matches_played: 10,
    status: 'QUEUED',
    checked_in_at: '2026-10-30T10:00:00Z',
  },
  {
    id: 'p2',
    name: 'Nadia Kusuma',
    auth_user_id: null,
    singles_rating: 1585,
    doubles_rating: 1585,
    matches_played: 8,
    status: 'QUEUED',
    checked_in_at: '2026-10-30T10:00:00Z',
  },
  {
    id: 'p3',
    name: 'Rohan Deshmukh',
    auth_user_id: null,
    singles_rating: 1515,
    doubles_rating: 1515,
    matches_played: 5,
    status: 'QUEUED',
    checked_in_at: '2026-10-30T10:00:00Z',
  },
  {
    id: 'p4',
    name: 'Chloe Tan',
    auth_user_id: null,
    singles_rating: 1620,
    doubles_rating: 1620,
    matches_played: 6,
    status: 'QUEUED',
    checked_in_at: '2026-10-30T10:00:00Z',
  },
];

describe('CustomMatchModal', () => {
  it('does not render when isOpen is false', () => {
    render(
      <CustomMatchModal
        isOpen={false}
        courtId={1}
        availablePlayers={mockRoster}
        onClose={vi.fn()}
        onConfirmMatch={vi.fn()}
      />
    );

    expect(screen.queryByText(/Assemble Custom Match/i)).not.toBeInTheDocument();
  });

  it('renders modal with player grid and allows selecting 4 players', () => {
    const handleConfirm = vi.fn();

    render(
      <CustomMatchModal
        isOpen={true}
        courtId={2}
        availablePlayers={mockRoster}
        onClose={vi.fn()}
        onConfirmMatch={handleConfirm}
      />
    );

    expect(screen.getByText(/Assemble Custom Match/i)).toBeInTheDocument();
    expect(screen.getByText('Court 2')).toBeInTheDocument();

    const submitBtn = screen.getByRole('button', { name: /Stage Custom Match on Court 2/i });
    expect(submitBtn).toBeDisabled();

    // Select 4 players
    fireEvent.click(screen.getByText('Viktor Axelsen'));
    fireEvent.click(screen.getByText('Nadia Kusuma'));
    fireEvent.click(screen.getByText('Rohan Deshmukh'));
    fireEvent.click(screen.getByText('Chloe Tan'));

    expect(submitBtn).not.toBeDisabled();

    fireEvent.click(submitBtn);
    expect(handleConfirm).toHaveBeenCalledWith(
      2,
      [mockRoster[0], mockRoster[1]],
      [mockRoster[2], mockRoster[3]]
    );
  });

  it('auto-picks top 4 queued players and supports partner balancing', () => {
    const handleConfirm = vi.fn();

    render(
      <CustomMatchModal
        isOpen={true}
        courtId={1}
        availablePlayers={mockRoster}
        onClose={vi.fn()}
        onConfirmMatch={handleConfirm}
      />
    );

    const autoPickBtn = screen.getByRole('button', { name: /Auto-Pick Top 4/i });
    fireEvent.click(autoPickBtn);

    const submitBtn = screen.getByRole('button', { name: /Stage Custom Match on Court 1/i });
    expect(submitBtn).not.toBeDisabled();

    // Auto-balance
    const balanceBtn = screen.getByRole('button', { name: /Auto-Balance/i });
    fireEvent.click(balanceBtn);

    fireEvent.click(submitBtn);
    // In balanced mode: [p1(1740), p3(1515)] vs [p4(1620), p2(1585)]
    expect(handleConfirm).toHaveBeenCalledWith(
      1,
      [mockRoster[0], mockRoster[2]],
      [mockRoster[3], mockRoster[1]]
    );
  });
});
