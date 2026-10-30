import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { RosterPlayer } from '@badminque/core';
import { CourtStationCard } from './CourtStationCard';
import type { CourtStationData } from './types';

const mockPlayerOne: RosterPlayer = {
  id: 'player-1',
  name: 'Marcus Lim',
  auth_user_id: null,
  singles_rating: 1600,
  doubles_rating: 1612,
  matches_played: 4,
  status: 'PLAYING',
  checked_in_at: '2026-10-30T10:00:00Z',
};

const mockPlayerTwo: RosterPlayer = {
  id: 'player-2',
  name: 'Sarah Jenkins',
  auth_user_id: null,
  singles_rating: 1550,
  doubles_rating: 1548,
  matches_played: 3,
  status: 'PLAYING',
  checked_in_at: '2026-10-30T10:00:00Z',
};

const mockPlayerThree: RosterPlayer = {
  id: 'player-3',
  name: 'Kelvin Teo',
  auth_user_id: null,
  singles_rating: 1580,
  doubles_rating: 1590,
  matches_played: 4,
  status: 'PLAYING',
  checked_in_at: '2026-10-30T10:00:00Z',
};

const mockPlayerFour: RosterPlayer = {
  id: 'player-4',
  name: 'Priya Nair',
  auth_user_id: null,
  singles_rating: 1560,
  doubles_rating: 1562,
  matches_played: 3,
  status: 'PLAYING',
  checked_in_at: '2026-10-30T10:00:00Z',
};

describe('CourtStationCard', () => {
  it('renders IDLE court with placeholder and action buttons', () => {
    const idleCourt: CourtStationData = {
      courtId: 1,
      name: 'Court 1 • Show Court',
      state: 'IDLE',
      elapsedSeconds: 0,
      teamA: null,
      teamB: null,
    };

    const handleDispatch = vi.fn();
    const handleCustomMatch = vi.fn();

    render(
      <CourtStationCard
        court={idleCourt}
        onDispatch={handleDispatch}
        onCustomMatch={handleCustomMatch}
      />
    );

    expect(screen.getByText('Court 1 • Show Court')).toBeInTheDocument();
    expect(screen.getByText('IDLE')).toBeInTheDocument();
    expect(screen.getByText(/Court Open for Next Match/i)).toBeInTheDocument();

    const dispatchBtn = screen.getByRole('button', { name: /Dispatch/i });
    const customMatchBtn = screen.getByRole('button', { name: /Custom Match/i });

    expect(dispatchBtn).toBeInTheDocument();
    expect(customMatchBtn).toBeInTheDocument();

    fireEvent.click(dispatchBtn);
    expect(handleDispatch).toHaveBeenCalledWith(1);

    fireEvent.click(customMatchBtn);
    expect(handleCustomMatch).toHaveBeenCalledWith(1);
  });

  it('renders PROPOSED court with doubles pairings, ratings, spread, and dispatch button', () => {
    const proposedCourt: CourtStationData = {
      courtId: 2,
      name: 'Court 2 • Center',
      state: 'PROPOSED',
      elapsedSeconds: 0,
      teamA: [mockPlayerOne, mockPlayerTwo],
      teamB: [mockPlayerThree, mockPlayerFour],
    };

    const handleDispatch = vi.fn();

    render(
      <CourtStationCard
        court={proposedCourt}
        onDispatch={handleDispatch}
      />
    );

    expect(screen.getByText('Court 2 • Center')).toBeInTheDocument();
    expect(screen.getByText('PROPOSED')).toBeInTheDocument();
    expect(screen.getByText('Marcus Lim')).toBeInTheDocument();
    expect(screen.getByText('Sarah Jenkins')).toBeInTheDocument();
    expect(screen.getByText('Kelvin Teo')).toBeInTheDocument();
    expect(screen.getByText('Priya Nair')).toBeInTheDocument();

    // Spread: |1580 - 1576| = 4 RS
    expect(screen.getByText(/Spread:/i)).toBeInTheDocument();
    expect(screen.getByText(/98% Balanced Match/i)).toBeInTheDocument();

    const dispatchBtn = screen.getByRole('button', { name: /Dispatch/i });
    fireEvent.click(dispatchBtn);
    expect(handleDispatch).toHaveBeenCalledWith(2);
  });

  it('renders IN_MATCH court with live elapsed timer and enter score button', () => {
    const inMatchCourt: CourtStationData = {
      courtId: 3,
      name: 'Court 3 • Far Side',
      state: 'IN_MATCH',
      elapsedSeconds: 862, // 14:22
      teamA: [mockPlayerOne, mockPlayerTwo],
      teamB: [mockPlayerThree, mockPlayerFour],
    };

    const handleEnterScore = vi.fn();

    render(
      <CourtStationCard
        court={inMatchCourt}
        onEnterScore={handleEnterScore}
      />
    );

    expect(screen.getByText('Court 3 • Far Side')).toBeInTheDocument();
    expect(screen.getByText('IN_MATCH')).toBeInTheDocument();
    expect(screen.getByText('14:22')).toBeInTheDocument();

    const enterScoreBtn = screen.getByRole('button', { name: /Enter Score \(30 pts\)/i });
    expect(enterScoreBtn).toBeInTheDocument();

    fireEvent.click(enterScoreBtn);
    expect(handleEnterScore).toHaveBeenCalledWith(3);
  });

  it('renders SCORE_ENTRY court with score entry badge and elapsed timer', () => {
    const scoreEntryCourt: CourtStationData = {
      courtId: 1,
      name: 'Court 1',
      state: 'SCORE_ENTRY',
      elapsedSeconds: 900, // 15:00
      teamA: [mockPlayerOne, mockPlayerTwo],
      teamB: [mockPlayerThree, mockPlayerFour],
    };

    render(<CourtStationCard court={scoreEntryCourt} />);

    expect(screen.getByText('SCORE_ENTRY')).toBeInTheDocument();
    expect(screen.getByText('15:00')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Enter Score \(30 pts\)/i })).toBeInTheDocument();
  });
});
