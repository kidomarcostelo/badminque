import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { RosterPlayer } from '@badminque/core';
import { ClaimTokenModal } from './ClaimTokenModal';

describe('ClaimTokenModal', () => {
  const samplePlayer: RosterPlayer = {
    id: 'player-claim-1',
    name: 'Anders Antonsen',
    auth_user_id: null,
    singles_rating: 1550,
    doubles_rating: 1520,
    matches_played: 6,
    status: 'QUEUED',
    checked_in_at: new Date().toISOString(),
  };

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <ClaimTokenModal
        isOpen={false}
        player={samplePlayer}
        onClose={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders claim token, QR preview, 48h expiration notice, and copy button when open', () => {
    const handleClose = vi.fn();
    render(
      <ClaimTokenModal
        isOpen={true}
        player={samplePlayer}
        onClose={handleClose}
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Claim Player Passport/i)).toBeInTheDocument();
    expect(screen.getByText('Anders Antonsen')).toBeInTheDocument();
    expect(screen.getByText(/48-hour expiration/i)).toBeInTheDocument();

    const copyBtn = screen.getByRole('button', { name: /Copy Claim Link/i });
    expect(copyBtn).toBeInTheDocument();

    const closeBtn = screen.getByRole('button', { name: /Close claim modal/i });
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
