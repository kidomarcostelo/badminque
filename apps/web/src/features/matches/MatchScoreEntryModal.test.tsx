import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { RosterPlayer } from '@badminque/core';
import { MatchScoreEntryModal } from './MatchScoreEntryModal';

describe('MatchScoreEntryModal', () => {
  const samplePlayers: RosterPlayer[] = [
    {
      id: 'p1',
      name: 'Alice',
      auth_user_id: null,
      singles_rating: 1500,
      doubles_rating: 1500,
      matches_played: 0,
      status: 'QUEUED',
      checked_in_at: '2026-10-30T10:00:00Z',
    },
    {
      id: 'p2',
      name: 'Bob',
      auth_user_id: null,
      singles_rating: 1500,
      doubles_rating: 1500,
      matches_played: 0,
      status: 'QUEUED',
      checked_in_at: '2026-10-30T10:00:00Z',
    },
    {
      id: 'p3',
      name: 'Charlie',
      auth_user_id: null,
      singles_rating: 1500,
      doubles_rating: 1500,
      matches_played: 0,
      status: 'QUEUED',
      checked_in_at: '2026-10-30T10:00:00Z',
    },
    {
      id: 'p4',
      name: 'Dave',
      auth_user_id: null,
      singles_rating: 1500,
      doubles_rating: 1500,
      matches_played: 0,
      status: 'QUEUED',
      checked_in_at: '2026-10-30T10:00:00Z',
    },
  ];

  it('renders court number and score options', () => {
    render(
      <MatchScoreEntryModal
        isOpen={true}
        courtId={2}
        availablePlayers={samplePlayers}
        onClose={vi.fn()}
        onSubmitScore={vi.fn()}
      />
    );

    expect(screen.getByText(/Record Match Score — Court 2/i)).toBeInTheDocument();
    expect(screen.getByText(/21 - 19/i)).toBeInTheDocument();
    expect(screen.getByText(/21 - 5/i)).toBeInTheDocument();
  });

  it('selects preset and submits score with selected players', async () => {
    const handleSubmit = vi.fn().mockResolvedValue(undefined);
    const handleClose = vi.fn();

    render(
      <MatchScoreEntryModal
        isOpen={true}
        courtId={1}
        availablePlayers={samplePlayers}
        onClose={handleClose}
        onSubmitScore={handleSubmit}
      />
    );

    // Preset button 21-5 (blowout)
    const presetBlowout = screen.getByRole('button', { name: /21 - 5/i });
    fireEvent.click(presetBlowout);

    // Submit
    const submitBtn = screen.getByRole('button', { name: /Submit Score/i });
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    expect(handleSubmit).toHaveBeenCalledTimes(1);
    expect(handleSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        courtId: 1,
        teamAScores: [21],
        teamBScores: [5],
      })
    );
  });

  it('calls onClose when Cancel is clicked', () => {
    const handleClose = vi.fn();
    render(
      <MatchScoreEntryModal
        isOpen={true}
        courtId={1}
        availablePlayers={samplePlayers}
        onClose={handleClose}
        onSubmitScore={vi.fn()}
      />
    );

    const cancelBtn = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
