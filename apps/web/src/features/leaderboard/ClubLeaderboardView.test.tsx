import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
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

  it('presents ranked established players with position numbers and DUBR ratings', () => {
    render(<ClubLeaderboardView roster={sampleRoster} />);

    // Position numbers
    expect(screen.getByText(/#1/)).toBeInTheDocument();
    expect(screen.getByText(/#2/)).toBeInTheDocument();

    // Viktor Axelsen has doubles_rating 1750 => DUBR: 2.0 + (1750-800)/400 = 4.375
    expect(screen.getByText('4.375')).toBeInTheDocument();
    // Chou Tien Chen has doubles_rating 1650 => DUBR: 2.0 + (1650-800)/400 = 4.125
    expect(screen.getByText('4.125')).toBeInTheDocument();
  });

  it('displays a collapsible Calibrating roster section showing player progress (e.g. 2/8 matches) without ranking', () => {
    render(<ClubLeaderboardView roster={sampleRoster} />);

    // Calibrating section header should be visible
    expect(screen.getByRole('region', { name: /Calibrating Roster/i })).toBeInTheDocument();

    // Toggle open the calibrating section via expand button
    const expandButton = screen.getByRole('button', { name: /Show Calibrating/i });
    fireEvent.click(expandButton);

    // Rookie Guest should now be visible in Calibrating section with progress "2/8 matches"
    expect(screen.getByText('Rookie Guest')).toBeInTheDocument();
    expect(screen.getByText(/2\/8 matches/i)).toBeInTheDocument();

    // Calibrating player should NOT have a numeric rank like #3
    expect(screen.queryByText(/#3/)).not.toBeInTheDocument();

    // Collapse it back
    const collapseButton = screen.getByRole('button', { name: /Hide Calibrating/i });
    fireEvent.click(collapseButton);
    expect(screen.queryByText('Rookie Guest')).not.toBeInTheDocument();
  });

  it('handles tied ratings with SQL RANK() window ranking semantics (e.g. #1, #1, #3)', () => {
    const tiedRoster: RosterPlayer[] = [
      {
        id: 'p1',
        name: 'Player One',
        auth_user_id: null,
        singles_rating: 1700,
        doubles_rating: 1700,
        matches_played: 10,
        status: 'QUEUED',
        checked_in_at: new Date().toISOString(),
      },
      {
        id: 'p2',
        name: 'Player Two',
        auth_user_id: null,
        singles_rating: 1700,
        doubles_rating: 1700,
        matches_played: 12,
        status: 'QUEUED',
        checked_in_at: new Date().toISOString(),
      },
      {
        id: 'p3',
        name: 'Player Three',
        auth_user_id: null,
        singles_rating: 1600,
        doubles_rating: 1600,
        matches_played: 9,
        status: 'QUEUED',
        checked_in_at: new Date().toISOString(),
      },
    ];

    render(<ClubLeaderboardView roster={tiedRoster} />);

    // Two #1 ranks
    const rankOnes = screen.getAllByText(/#1/);
    expect(rankOnes.length).toBe(2);

    // No #2 rank due to tie
    expect(screen.queryByText(/#2/)).not.toBeInTheDocument();

    // Third player receives #3
    expect(screen.getByText(/#3/)).toBeInTheDocument();
  });

  it('graduates player directly into official club rankings on their 8th match and drops provisional badge', () => {
    // Player with 7 matches (calibrating)
    const rosterBefore: RosterPlayer[] = [
      ...sampleRoster,
      {
        id: 'p-grad',
        name: 'Graduating Candidate',
        auth_user_id: null,
        singles_rating: 1700,
        doubles_rating: 1700,
        matches_played: 7, // Provisional
        status: 'QUEUED',
        checked_in_at: new Date().toISOString(),
      },
    ];

    const { rerender } = render(<ClubLeaderboardView roster={rosterBefore} />);

    // Candidate is provisional (<8), so excluded from official table
    expect(screen.queryByText('Graduating Candidate')).not.toBeInTheDocument();

    // Player completes 8th match: matches_played becomes 8
    const rosterAfter: RosterPlayer[] = [
      ...sampleRoster,
      {
        id: 'p-grad',
        name: 'Graduating Candidate',
        auth_user_id: null,
        singles_rating: 1700,
        doubles_rating: 1720,
        matches_played: 8, // Graduated!
        status: 'RESTING',
        checked_in_at: new Date().toISOString(),
      },
    ];

    rerender(<ClubLeaderboardView roster={rosterAfter} />);

    // Now candidate graduates into official table between Viktor (1750, #1) and Chou (1650, #3) -> Rank #2!
    expect(screen.getByText('Graduating Candidate')).toBeInTheDocument();
    expect(screen.getByText(/#2/)).toBeInTheDocument();
  });

  it('triggers onSelectPlayer callback when clicking either an established or calibrating player', () => {
    const onSelect = vi.fn();
    render(<ClubLeaderboardView roster={sampleRoster} onSelectPlayer={onSelect} />);

    // Click established player
    fireEvent.click(screen.getByText('Viktor Axelsen'));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'p1' }));

    // Open calibrating section and click calibrating player
    const expandButton = screen.getByRole('button', { name: /Show Calibrating/i });
    fireEvent.click(expandButton);
    fireEvent.click(screen.getByText('Rookie Guest'));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'p3' }));
  });
});
