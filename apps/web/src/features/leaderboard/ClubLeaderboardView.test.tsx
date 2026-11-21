import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { RosterPlayer } from '@badminque/core';
import { ClubLeaderboardView } from './ClubLeaderboardView';

describe('ClubLeaderboardView', () => {
  const sampleRoster: RosterPlayer[] = [
    {
      id: 'p1',
      name: 'Viktor Axelsen',
      auth_user_id: 'auth-1',
      singles_rating: 1800,
      doubles_rating: 1750,
      matches_played: 15,
      status: 'RESTING',
      checked_in_at: new Date().toISOString(),
    },
    {
      id: 'p2',
      name: 'Chou Tien Chen',
      auth_user_id: null,
      singles_rating: 1620,
      doubles_rating: 1650,
      matches_played: 10,
      status: 'QUEUED',
      checked_in_at: new Date().toISOString(),
    },
    {
      id: 'p3',
      name: 'Rookie Guest',
      auth_user_id: null,
      singles_rating: 1500,
      doubles_rating: 1510,
      matches_played: 2, // Provisional (<8)
      status: 'QUEUED',
      checked_in_at: new Date().toISOString(),
    },
  ];

  it('renders leaderboard table with window rankings ordered by doubles rating descending', () => {
    render(<ClubLeaderboardView roster={sampleRoster} />);

    expect(screen.getByText(/Official Club Leaderboard/i)).toBeInTheDocument();
    expect(screen.getByText('Viktor Axelsen')).toBeInTheDocument();
    expect(screen.getByText('Chou Tien Chen')).toBeInTheDocument();

    // By default, provisional players (<8 matches) are excluded
    expect(screen.queryByText('Rookie Guest')).not.toBeInTheDocument();
  });

  it('includes provisional players when the toggle is clicked', () => {
    render(<ClubLeaderboardView roster={sampleRoster} />);

    const toggle = screen.getByRole('checkbox', { name: /Include Provisional Players/i });
    fireEvent.click(toggle);

    expect(screen.getByText('Rookie Guest')).toBeInTheDocument();
  });
});
