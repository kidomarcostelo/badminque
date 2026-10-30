import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { MatchRecord, RosterPlayer } from '@badminque/core';
import { MatchHistoryView } from './MatchHistoryView';

const mockRoster: RosterPlayer[] = [
  {
    id: 'p1',
    name: 'Marcus Lim',
    auth_user_id: null,
    singles_rating: 1612,
    doubles_rating: 1612,
    matches_played: 4,
    status: 'RESTING',
    checked_in_at: '2026-10-30T10:00:00Z',
  },
  {
    id: 'p2',
    name: 'Sarah Jenkins',
    auth_user_id: null,
    singles_rating: 1548,
    doubles_rating: 1548,
    matches_played: 3,
    status: 'RESTING',
    checked_in_at: '2026-10-30T10:00:00Z',
  },
  {
    id: 'p3',
    name: 'Kelvin Teo',
    auth_user_id: null,
    singles_rating: 1590,
    doubles_rating: 1590,
    matches_played: 4,
    status: 'RESTING',
    checked_in_at: '2026-10-30T10:00:00Z',
  },
  {
    id: 'p4',
    name: 'Priya Nair',
    auth_user_id: null,
    singles_rating: 1562,
    doubles_rating: 1562,
    matches_played: 3,
    status: 'RESTING',
    checked_in_at: '2026-10-30T10:00:00Z',
  },
];

const mockMatches: MatchRecord[] = [
  {
    id: 'm1',
    club_night_id: 'default-club-night',
    recorded_at: '2026-10-30T10:30:00Z',
    sequence_num: 1,
    court_id: 1,
    discipline: 'DOUBLES',
    format: 'SINGLE_30',
    team_a_player_ids: ['p1', 'p2'],
    team_b_player_ids: ['p3', 'p4'],
    team_a_scores: [30],
    team_b_scores: [25],
    status: 'PENDING',
  },
];

describe('MatchHistoryView', () => {
  it('renders empty state when no matches have completed', () => {
    const handleReturn = vi.fn();

    render(
      <MatchHistoryView
        matches={[]}
        roster={mockRoster}
        onReturnToBoard={handleReturn}
      />
    );

    expect(screen.getByText(/No Match Results Recorded Yet/i)).toBeInTheDocument();
    const returnBtn = screen.getByRole('button', { name: /Return to Courtside Board/i });
    fireEvent.click(returnBtn);
    expect(handleReturn).toHaveBeenCalledTimes(1);
  });

  it('renders summary statistics and completed match feed', () => {
    render(
      <MatchHistoryView
        matches={mockMatches}
        roster={mockRoster}
        onReturnToBoard={vi.fn()}
      />
    );

    expect(screen.getByText('Club Night Official Match Log')).toBeInTheDocument();

    // Summary statistics
    expect(screen.getByTestId('stat-total-matches')).toHaveTextContent('1');
    expect(screen.getByTestId('stat-total-points')).toHaveTextContent('55');
    expect(screen.getByTestId('stat-avg-score')).toHaveTextContent('30 - 25');
    expect(screen.getByTestId('stat-avg-delta')).toHaveTextContent(/±\d+ RS/);

    // Match card
    expect(screen.getByText('Marcus Lim & Sarah Jenkins')).toBeInTheDocument();
    expect(screen.getByText('Kelvin Teo & Priya Nair')).toBeInTheDocument();
    expect(screen.getAllByText('30 - 25')).toHaveLength(2);
    expect(screen.getByText('Team A Won')).toBeInTheDocument();
    expect(screen.getByText(/Rating Shift: ±\d+ RS/)).toBeInTheDocument();
  });
});
