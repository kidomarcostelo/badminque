import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { MatchRecord, PlayerRatingDelta } from '@badminque/core';
import { PostMatchOutcomeView } from './PostMatchOutcomeView';

describe('PostMatchOutcomeView', () => {
  const sampleMatch: MatchRecord = {
    id: 'match-1234',
    club_night_id: 'club-night-1',
    court_id: 1,
    discipline: 'DOUBLES',
    format: 'SINGLE_21',
    team_a_player_ids: ['p1', 'p2'],
    team_b_player_ids: ['p3', 'p4'],
    team_a_scores: [21],
    team_b_scores: [19],
    sequence_num: 1,
    recorded_at: '2026-10-30T10:00:00Z',
    status: 'PENDING',
  };

  const sampleDeltas: PlayerRatingDelta[] = [
    {
      player_id: 'p1',
      player_name: 'Alice',
      pre_rating: 1500.0,
      post_rating: 1534.0,
      rating_delta: 34.0,
      pre_dubr: 3.750,
      post_dubr: 3.835,
      dubr_delta: 0.085,
      k_factor: 64.0,
      is_provisional: true,
      matches_played_after: 1,
    },
    {
      player_id: 'p2',
      player_name: 'Bob',
      pre_rating: 1500.0,
      post_rating: 1534.0,
      rating_delta: 34.0,
      pre_dubr: 3.750,
      post_dubr: 3.835,
      dubr_delta: 0.085,
      k_factor: 64.0,
      is_provisional: true,
      matches_played_after: 1,
    },
    {
      player_id: 'p3',
      player_name: 'Charlie',
      pre_rating: 1500.0,
      post_rating: 1476.0,
      rating_delta: -24.0,
      pre_dubr: 3.750,
      post_dubr: 3.690,
      dubr_delta: -0.060,
      k_factor: 64.0,
      is_provisional: false,
      matches_played_after: 9,
    },
    {
      player_id: 'p4',
      player_name: 'Dave',
      pre_rating: 1500.0,
      post_rating: 1476.0,
      rating_delta: -24.0,
      pre_dubr: 3.750,
      post_dubr: 3.690,
      dubr_delta: -0.060,
      k_factor: 64.0,
      is_provisional: false,
      matches_played_after: 12,
    },
  ];

  it('renders match outcome header and set score correctly', () => {
    const handleDismiss = vi.fn();
    render(
      <PostMatchOutcomeView
        match={sampleMatch}
        deltas={sampleDeltas}
        onDismiss={handleDismiss}
      />
    );

    expect(screen.getByText(/Match Complete/i)).toBeInTheDocument();
    expect(screen.getByText('21 - 19')).toBeInTheDocument();
    expect(screen.getByText(/Court 1/i)).toBeInTheDocument();
  });

  it('displays calculated Delta DUBR adjustments and 3-decimal ratings', () => {
    const handleDismiss = vi.fn();
    render(
      <PostMatchOutcomeView
        match={sampleMatch}
        deltas={sampleDeltas}
        onDismiss={handleDismiss}
      />
    );

    // Winner adjustments
    expect(screen.getAllByText('+0.085').length).toBe(2);
    expect(screen.getAllByText('3.835').length).toBe(2);

    // Loser adjustments
    expect(screen.getAllByText('-0.060').length).toBe(2);
    expect(screen.getAllByText('3.690').length).toBe(2);

    // Player names
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();
    expect(screen.getByText('Dave')).toBeInTheDocument();
  });

  it('displays Provisional badge for provisional players (<8 matches)', () => {
    const handleDismiss = vi.fn();
    render(
      <PostMatchOutcomeView
        match={sampleMatch}
        deltas={sampleDeltas}
        onDismiss={handleDismiss}
      />
    );

    const badges = screen.getAllByText(/Provisional/i);
    expect(badges.length).toBe(2); // Alice and Bob are provisional
  });

  it('triggers onDismiss when the done button is clicked', () => {
    const handleDismiss = vi.fn();
    render(
      <PostMatchOutcomeView
        match={sampleMatch}
        deltas={sampleDeltas}
        onDismiss={handleDismiss}
      />
    );

    const doneButton = screen.getByRole('button', {
      name: /Return to Courtside/i,
    });
    fireEvent.click(doneButton);
    expect(handleDismiss).toHaveBeenCalledTimes(1);
  });

  it('accurately designates winner and score in multi-set comeback match', () => {
    // Team A loses set 1 (19-21), but wins sets 2 (21-15) and 3 (21-18)
    const multiSetMatch: MatchRecord = {
      ...sampleMatch,
      team_a_scores: [19, 21, 21],
      team_b_scores: [21, 15, 18],
      format: 'BEST_OF_3',
    };

    render(
      <PostMatchOutcomeView
        match={multiSetMatch}
        deltas={sampleDeltas}
        onDismiss={vi.fn()}
      />
    );

    // Final score summary should display all sets
    expect(screen.getByText('19 - 21, 21 - 15, 21 - 18')).toBeInTheDocument();

    // Sets won display
    expect(screen.getByText('2 sets')).toBeInTheDocument();
    expect(screen.getByText('1 sets')).toBeInTheDocument();

    // Team A should be designated the Winner
    const winnerBadges = screen.getAllByText('Winner');
    expect(winnerBadges.length).toBe(1);
  });
});
