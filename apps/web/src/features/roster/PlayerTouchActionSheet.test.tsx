import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { RosterPlayer } from '@badminque/core';
import type { CourtStationData } from '../courts/types';
import { PlayerTouchActionSheet } from './PlayerTouchActionSheet';

function createMockPlayer(
  id: string,
  name: string,
  options?: Partial<RosterPlayer>
): RosterPlayer {
  return {
    id,
    name,
    auth_user_id: null,
    singles_rating: 1500,
    doubles_rating: 1500,
    doubles_dubr: 3.5,
    matches_played: 0,
    status: 'QUEUED',
    checked_in_at: '2026-10-30T10:00:00.000Z',
    ...options,
  };
}

const mockCourts: CourtStationData[] = [
  {
    courtId: 1,
    name: 'Court 1 • Show Court',
    state: 'IDLE',
    elapsedSeconds: 0,
    teamA: null,
    teamB: null,
  },
  {
    courtId: 2,
    name: 'Court 2 • Center',
    state: 'IN_MATCH',
    elapsedSeconds: 120,
    teamA: null,
    teamB: null,
  },
  {
    courtId: 3,
    name: 'Court 3 • Far Side',
    state: 'PROPOSED',
    elapsedSeconds: 0,
    teamA: null,
    teamB: null,
  },
];

describe('PlayerTouchActionSheet', () => {
  const player1 = createMockPlayer('p1', 'Marcus Gideon');
  const player2 = createMockPlayer('p2', 'Kevin Sukamuljo');
  const roster = [player1, player2];

  it('renders player details and touch action controls when open', () => {
    render(
      <PlayerTouchActionSheet
        isOpen={true}
        player={player1}
        roster={roster}
        courts={mockCourts}
        onClose={vi.fn()}
        onAssignToCourt={vi.fn()}
        onToggleSkip={vi.fn()}
        onToggleRest={vi.fn()}
        onPinPair={vi.fn()}
        onUnpinPair={vi.fn()}
      />
    );

    expect(screen.getByText('Marcus Gideon')).toBeInTheDocument();
    expect(screen.getByText(/Player Quick Actions/i)).toBeInTheDocument();

    // Direct assignment buttons: Court 1 and Court 3 should be available
    expect(screen.getByRole('button', { name: /Send to Court 1/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Send to Court 2/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Send to Court 3/i })).toBeEnabled();

    // Breather & Rest toggles
    expect(screen.getByRole('button', { name: /1-Match Skip/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Take Rest/i })).toBeInTheDocument();
  });

  it('triggers onAssignToCourt when court button is tapped', () => {
    const handleAssign = vi.fn();
    render(
      <PlayerTouchActionSheet
        isOpen={true}
        player={player1}
        roster={roster}
        courts={mockCourts}
        onClose={vi.fn()}
        onAssignToCourt={handleAssign}
        onToggleSkip={vi.fn()}
        onToggleRest={vi.fn()}
        onPinPair={vi.fn()}
        onUnpinPair={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Send to Court 1/i }));
    expect(handleAssign).toHaveBeenCalledWith('p1', 1);
  });

  it('triggers onToggleSkip and onToggleRest', () => {
    const handleSkip = vi.fn();
    const handleRest = vi.fn();

    render(
      <PlayerTouchActionSheet
        isOpen={true}
        player={player1}
        roster={roster}
        courts={mockCourts}
        onClose={vi.fn()}
        onAssignToCourt={vi.fn()}
        onToggleSkip={handleSkip}
        onToggleRest={handleRest}
        onPinPair={vi.fn()}
        onUnpinPair={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /1-Match Skip/i }));
    expect(handleSkip).toHaveBeenCalledWith('p1');

    fireEvent.click(screen.getByRole('button', { name: /Take Rest/i }));
    expect(handleRest).toHaveBeenCalledWith('p1');
  });

  it('pins pair with selected partner', () => {
    const handlePin = vi.fn();

    render(
      <PlayerTouchActionSheet
        isOpen={true}
        player={player1}
        roster={roster}
        courts={mockCourts}
        onClose={vi.fn()}
        onAssignToCourt={vi.fn()}
        onToggleSkip={vi.fn()}
        onToggleRest={vi.fn()}
        onPinPair={handlePin}
        onUnpinPair={vi.fn()}
      />
    );

    const partnerSelect = screen.getByLabelText(/Select partner to pin/i);
    fireEvent.change(partnerSelect, { target: { value: 'p2' } });

    fireEvent.click(screen.getByRole('button', { name: /Pin Locked Pair/i }));
    expect(handlePin).toHaveBeenCalledWith('p1', 'p2');
  });

  it('displays pinned status and unpins pair with 1-tap button', () => {
    const handleUnpin = vi.fn();
    const pinnedPlayer = createMockPlayer('p1', 'Marcus Gideon', {
      locked_partner_id: 'p2',
      locked_partner_name: 'Kevin Sukamuljo',
    });

    render(
      <PlayerTouchActionSheet
        isOpen={true}
        player={pinnedPlayer}
        roster={roster}
        courts={mockCourts}
        onClose={vi.fn()}
        onAssignToCourt={vi.fn()}
        onToggleSkip={vi.fn()}
        onToggleRest={vi.fn()}
        onPinPair={vi.fn()}
        onUnpinPair={handleUnpin}
      />
    );

    expect(screen.getByText(/Pinned with Kevin Sukamuljo/i)).toBeInTheDocument();
    const unpinButton = screen.getByRole('button', { name: /Unpin Pair/i });
    fireEvent.click(unpinButton);
    expect(handleUnpin).toHaveBeenCalledWith('p1');
  });
});
