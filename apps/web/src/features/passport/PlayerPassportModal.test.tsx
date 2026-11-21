import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { RosterPlayer } from '@badminque/core';
import { PlayerPassportModal } from './PlayerPassportModal';

describe('PlayerPassportModal', () => {
  const samplePlayer: RosterPlayer = {
    id: 'player-passport-1',
    name: 'Lee Zii Jia',
    auth_user_id: 'auth-user-123',
    singles_rating: 1680,
    doubles_rating: 1590,
    singles_dubr: 4.25,
    doubles_dubr: 3.82,
    matches_played: 12,
    status: 'QUEUED',
    checked_in_at: new Date().toISOString(),
  };

  it('renders nothing when closed', () => {
    const { container } = render(
      <PlayerPassportModal
        isOpen={false}
        player={samplePlayer}
        onClose={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('displays separate Singles and Doubles ratings, DUBR badges, and passport identity when open', () => {
    const handleClose = vi.fn();
    render(
      <PlayerPassportModal
        isOpen={true}
        player={samplePlayer}
        onClose={handleClose}
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Player Passport')).toBeInTheDocument();
    expect(screen.getByText('Lee Zii Jia')).toBeInTheDocument();
    expect(screen.getByText(/Claimed Player/i)).toBeInTheDocument();

    // Separate Singles ($R_S$) and Doubles ($R_D$) ratings
    expect(screen.getByText('1680')).toBeInTheDocument();
    expect(screen.getByText('1590')).toBeInTheDocument();

    // Established milestone status (matches >= 8)
    expect(screen.getByText(/Established Player/i)).toBeInTheDocument();

    const closeBtn = screen.getByRole('button', { name: /Close passport modal/i });
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('renders separate provisional badges and match counts for Singles and Doubles cards', () => {
    const seededPlayer: RosterPlayer = {
      id: 'player-passport-2',
      name: 'Viktor Axelsen',
      auth_user_id: null,
      singles_rating: 1800,
      doubles_rating: 1800,
      singles_matches_played: 0,
      doubles_matches_played: 12,
      matches_played: 12,
      singles_is_seeded: true,
      singles_is_provisional: true,
      doubles_is_provisional: false,
      status: 'QUEUED',
      checked_in_at: new Date().toISOString(),
    };

    render(
      <PlayerPassportModal
        isOpen={true}
        player={seededPlayer}
        onClose={vi.fn()}
      />
    );

    // Doubles card: 12 matches, Established badge
    expect(screen.getByText('12 matches')).toBeInTheDocument();

    // Singles card: 0 matches, Provisional (0/8) badge, and Seeded from Doubles indicator
    expect(screen.getByText('0 matches')).toBeInTheDocument();
    expect(screen.getByText(/Provisional \(0\/8\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Seeded from Doubles/i)).toBeInTheDocument();
  });
});
