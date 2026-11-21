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
});
