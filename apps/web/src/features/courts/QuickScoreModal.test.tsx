import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { RosterPlayer } from '@badminque/core';
import { QuickScoreModal } from './QuickScoreModal';
import type { CourtStationData } from './types';

const mockPlayerOne: RosterPlayer = {
  id: 'player-1',
  name: 'Marcus Lim',
  auth_user_id: null,
  singles_rating: 1612,
  doubles_rating: 1612,
  matches_played: 4,
  status: 'PLAYING',
  checked_in_at: '2026-10-30T10:00:00Z',
};

const mockPlayerTwo: RosterPlayer = {
  id: 'player-2',
  name: 'Sarah Jenkins',
  auth_user_id: null,
  singles_rating: 1548,
  doubles_rating: 1548,
  matches_played: 3,
  status: 'PLAYING',
  checked_in_at: '2026-10-30T10:00:00Z',
};

const mockPlayerThree: RosterPlayer = {
  id: 'player-3',
  name: 'Kelvin Teo',
  auth_user_id: null,
  singles_rating: 1590,
  doubles_rating: 1590,
  matches_played: 4,
  status: 'PLAYING',
  checked_in_at: '2026-10-30T10:00:00Z',
};

const mockPlayerFour: RosterPlayer = {
  id: 'player-4',
  name: 'Priya Nair',
  auth_user_id: null,
  singles_rating: 1562,
  doubles_rating: 1562,
  matches_played: 3,
  status: 'PLAYING',
  checked_in_at: '2026-10-30T10:00:00Z',
};

const activeCourt: CourtStationData = {
  courtId: 1,
  name: 'Court 1 • Show Court',
  state: 'SCORE_ENTRY',
  elapsedSeconds: 750,
  teamA: [mockPlayerOne, mockPlayerTwo],
  teamB: [mockPlayerThree, mockPlayerFour],
};

describe('QuickScoreModal', () => {
  it('does not render when isOpen is false', () => {
    render(
      <QuickScoreModal
        isOpen={false}
        court={activeCourt}
        onClose={vi.fn()}
        onSubmitScore={vi.fn()}
      />
    );

    expect(screen.queryByText(/30-Point Match Score Entry/i)).not.toBeInTheDocument();
  });

  it('renders court badge, pair names, rating delta preview, and presets', () => {
    render(
      <QuickScoreModal
        isOpen={true}
        court={activeCourt}
        onClose={vi.fn()}
        onSubmitScore={vi.fn()}
      />
    );

    expect(screen.getByText('COURT 1')).toBeInTheDocument();
    expect(screen.getByText(/30-Point Match Score Entry/i)).toBeInTheDocument();
    expect(screen.getByText(/Marcus Lim & Sarah Jenkins/i)).toBeInTheDocument();
    expect(screen.getByText(/Kelvin Teo & Priya Nair/i)).toBeInTheDocument();
    expect(screen.getByText(/Projected Rating Impact:/i)).toBeInTheDocument();

    // 30-point presets
    expect(screen.getByRole('button', { name: /30-28/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /30-25/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /30-20/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /30-15/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /30-8/i })).toBeInTheDocument();
  });

  it('allows 1-tap switching of winning pair between Pair A and Pair B', () => {
    render(
      <QuickScoreModal
        isOpen={true}
        court={activeCourt}
        onClose={vi.fn()}
        onSubmitScore={vi.fn()}
      />
    );

    expect(screen.getByText('★ WINNER • PAIR A')).toBeInTheDocument();

    const winnerBtnB = screen.getByRole('button', { name: /PAIR B/i });
    fireEvent.click(winnerBtnB);

    expect(screen.getByText('★ WINNER • PAIR B')).toBeInTheDocument();
  });

  it('applies 1-tap 30-point presets to update match score', () => {
    render(
      <QuickScoreModal
        isOpen={true}
        court={activeCourt}
        onClose={vi.fn()}
        onSubmitScore={vi.fn()}
      />
    );

    const preset30_15 = screen.getByRole('button', { name: /30-15/i });
    fireEvent.click(preset30_15);

    expect(screen.getByTestId('stepper-loser-val')).toHaveTextContent('15');
    expect(screen.getByTestId('stepper-winner-val')).toHaveTextContent('30');
  });

  it('supports overtime deuce presets and score steppers', () => {
    render(
      <QuickScoreModal
        isOpen={true}
        court={activeCourt}
        onClose={vi.fn()}
        onSubmitScore={vi.fn()}
      />
    );

    const deuceBtn = screen.getByRole('button', { name: '32-30' });
    fireEvent.click(deuceBtn);

    expect(screen.getByTestId('stepper-winner-val')).toHaveTextContent('32');
    expect(screen.getByTestId('stepper-loser-val')).toHaveTextContent('30');

    // Winner stepper +
    const winnerStepPlus = screen.getByRole('button', { name: /Increment Winner Score/i });
    fireEvent.click(winnerStepPlus);
    expect(screen.getByTestId('stepper-winner-val')).toHaveTextContent('33');

    // Loser stepper -
    const loserStepMinus = screen.getByRole('button', { name: /Decrement Runner-Up Score/i });
    fireEvent.click(loserStepMinus);
    expect(screen.getByTestId('stepper-loser-val')).toHaveTextContent('29');
  });

  it('allows direct runner-up digit keypad entry and reset', () => {
    render(
      <QuickScoreModal
        isOpen={true}
        court={activeCourt}
        onClose={vi.fn()}
        onSubmitScore={vi.fn()}
      />
    );

    // Tap digit 1 then digit 8
    const digit1 = screen.getByRole('button', { name: 'digit-1' });
    const digit8 = screen.getByRole('button', { name: 'digit-8' });

    fireEvent.click(digit1);
    expect(screen.getByTestId('stepper-loser-val')).toHaveTextContent('1');

    fireEvent.click(digit8);
    expect(screen.getByTestId('stepper-loser-val')).toHaveTextContent('18');

    // Tap reset
    const resetBtn = screen.getByRole('button', { name: /Reset \(25\)/i });
    fireEvent.click(resetBtn);
    expect(screen.getByTestId('stepper-loser-val')).toHaveTextContent('25');
  });

  it('submits recorded match score with <5 second interaction flow', async () => {
    const handleSubmitScore = vi.fn().mockResolvedValue(undefined);
    const handleClose = vi.fn();

    render(
      <QuickScoreModal
        isOpen={true}
        court={activeCourt}
        onClose={handleClose}
        onSubmitScore={handleSubmitScore}
      />
    );

    // Organizer selects preset 30-20
    const presetBtn = screen.getByRole('button', { name: /30-20/i });
    fireEvent.click(presetBtn);

    // Tap Record Match Score
    const submitBtn = screen.getByRole('button', {
      name: /Record Match Score & Rotate Court/i,
    });
    await React.act(async () => {
      fireEvent.click(submitBtn);
    });

    expect(handleSubmitScore).toHaveBeenCalledWith(1, 'A', 30, 20);
  });
});
