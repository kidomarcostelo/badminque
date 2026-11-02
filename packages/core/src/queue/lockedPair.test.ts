import { describe, expect, it } from 'vitest';
import type { RosterPlayer } from '../types';
import {
  pinPlayerPair,
  reconcileLockedPairStatus,
  togglePlayerSkip,
  unpinPlayerPair,
} from './lockedPair';

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
    matches_played: 0,
    status: 'QUEUED',
    checked_in_at: '2026-10-30T10:00:00.000Z',
    ...options,
  };
}

describe('lockedPair & override helpers', () => {
  it('pins a pair and anchors to later readiness and higher match count', () => {
    const playerA = createMockPlayer('p1', 'Player 1', {
      checked_in_at: '2026-10-30T10:00:00.000Z',
      matches_played: 1,
    });
    const playerB = createMockPlayer('p2', 'Player 2', {
      checked_in_at: '2026-10-30T10:15:00.000Z',
      matches_played: 2,
    });

    const [pinnedA, pinnedB] = pinPlayerPair(playerA, playerB);

    expect(pinnedA.locked_partner_id).toBe('p2');
    expect(pinnedA.locked_partner_name).toBe('Player 2');
    expect(pinnedB.locked_partner_id).toBe('p1');
    expect(pinnedB.locked_partner_name).toBe('Player 1');

    // Locked Pair Invariant: Anchored to later arrival (10:15)
    expect(pinnedA.checked_in_at).toBe('2026-10-30T10:15:00.000Z');
    expect(pinnedB.checked_in_at).toBe('2026-10-30T10:15:00.000Z');

    // Both get the max match count so neither can use partner to bypass rotation
    expect(pinnedA.matches_played).toBe(2);
    expect(pinnedB.matches_played).toBe(2);
  });

  it('puts waiting partner into WAITING_PARTNER state if partner is on court', () => {
    const playerA = createMockPlayer('p1', 'Player 1', { status: 'PLAYING' });
    const playerB = createMockPlayer('p2', 'Player 2', { status: 'QUEUED' });

    const [pinnedA, pinnedB] = pinPlayerPair(playerA, playerB);

    expect(pinnedA.status).toBe('PLAYING');
    // Partner waiting off-court enters WAITING_PARTNER to prevent line-cutting
    expect(pinnedB.status).toBe('WAITING_PARTNER');
  });

  it('unpins a pair and restores WAITING_PARTNER to QUEUED', () => {
    const playerA = createMockPlayer('p1', 'Player 1', {
      locked_partner_id: 'p2',
      locked_partner_name: 'Player 2',
      status: 'PLAYING',
    });
    const playerB = createMockPlayer('p2', 'Player 2', {
      locked_partner_id: 'p1',
      locked_partner_name: 'Player 1',
      status: 'WAITING_PARTNER',
    });

    const [unpinnedA, unpinnedB] = unpinPlayerPair(playerA, playerB);

    expect(unpinnedA.locked_partner_id).toBeNull();
    expect(unpinnedA.locked_partner_name).toBeNull();
    expect(unpinnedA.status).toBe('PLAYING');

    expect(unpinnedB?.locked_partner_id).toBeNull();
    expect(unpinnedB?.locked_partner_name).toBeNull();
    expect(unpinnedB?.status).toBe('QUEUED');
  });

  it('reconciles locked partner status when partner finishes match', () => {
    const playerA = createMockPlayer('p1', 'Player 1', {
      locked_partner_id: 'p2',
      status: 'RESTING',
    });
    const playerB = createMockPlayer('p2', 'Player 2', {
      locked_partner_id: 'p1',
      status: 'QUEUED',
    });

    // Partner A is RESTING, so Partner B should wait
    const reconciledB = reconcileLockedPairStatus(playerB, [playerA, playerB]);
    expect(reconciledB.status).toBe('WAITING_PARTNER');

    // Partner A toggles to QUEUED, now both are QUEUED
    const activeA = { ...playerA, status: 'QUEUED' as const };
    const nowReadyB = reconcileLockedPairStatus(playerB, [activeA, playerB]);
    expect(nowReadyB.status).toBe('QUEUED');
  });

  it('toggles 1-match skip breather with elevated priority boost flag', () => {
    const player = createMockPlayer('p1', 'Player 1', {
      status: 'QUEUED',
      is_skipped: false,
    });

    const skipped = togglePlayerSkip(player);
    expect(skipped.is_skipped).toBe(true);
    expect(skipped.status).toBe('SKIPPED');

    const unskipped = togglePlayerSkip(skipped);
    expect(unskipped.is_skipped).toBe(false);
    expect(unskipped.status).toBe('QUEUED');
  });
});
