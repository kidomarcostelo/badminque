import { describe, expect, it } from 'vitest';
import type { RosterPlayer } from '../../types';
import { pairFlightedTiers } from './flightedTiers';

function createPlayer(
  id: string,
  name: string,
  rating: number,
  readyAt: string = '2026-10-30T10:00:00.000Z'
): RosterPlayer {
  return {
    id,
    name,
    auth_user_id: null,
    singles_rating: rating,
    doubles_rating: rating,
    matches_played: 0,
    status: 'QUEUED',
    checked_in_at: readyAt,
  };
}

describe('pairFlightedTiers (Flighted Tiers with Dynamic Band Expansion)', () => {
  const baseTimestampMs = Date.parse('2026-10-30T10:05:00.000Z'); // Waited 5m (300s)

  it('returns null if queue has fewer than 4 players', () => {
    const p1 = createPlayer('p1', 'Player 1', 1600);
    const p2 = createPlayer('p2', 'Player 2', 1600);
    expect(pairFlightedTiers([p1, p2], baseTimestampMs)).toBeNull();
  });

  it('pairs candidates within initial 150 RS rating band of the top priority player', () => {
    // Top player p1 has rating 1700
    // Queue has:
    // p2: 1720 (diff 20 <= 150) -> in band
    // p3: 1680 (diff 20 <= 150) -> in band
    // p4: 1650 (diff 50 <= 150) -> in band
    // p5: 1400 (diff 300 > 150) -> OUT of band
    // p6: 1350 (diff 350 > 150) -> OUT of band
    const p1 = createPlayer('p1', 'Player 1', 1700);
    const p2 = createPlayer('p2', 'Player 2', 1720);
    const p3 = createPlayer('p3', 'Player 3', 1680);
    const p4 = createPlayer('p4', 'Player 4', 1650);
    const p5 = createPlayer('p5', 'Player 5', 1400);
    const p6 = createPlayer('p6', 'Player 6', 1350);

    const pairing = pairFlightedTiers([p1, p2, p3, p4, p5, p6], baseTimestampMs);

    expect(pairing).not.toBeNull();
    if (!pairing) return;

    expect(pairing.policy).toBe('FLIGHTED_TIERS');
    const selectedIds = [...pairing.teamA, ...pairing.teamB].map((p) => p.id);

    expect(selectedIds).toContain('p1');
    expect(selectedIds).toContain('p2');
    expect(selectedIds).toContain('p3');
    expect(selectedIds).toContain('p4');
    expect(selectedIds).not.toContain('p5');
    expect(selectedIds).not.toContain('p6');
  });

  it('dynamically expands band when player wait time exceeds target threshold (600s)', () => {
    // Top player p1 waited 16 minutes (960s)
    // Excess wait = 960 - 600 = 360s
    // Band expansion = 150 + 0.5 * 360 = 150 + 180 = 330 RS
    const waitedTimeMs = Date.parse('2026-10-30T10:16:00.000Z');
    const p1 = createPlayer('p1', 'Player 1', 1700, '2026-10-30T10:00:00.000Z');

    // p2 is 1450 (diff = 250). At 5m it would be excluded (250 > 150),
    // but at 16m band is 330, so 250 <= 330 is included!
    const p2 = createPlayer('p2', 'Player 2', 1450);
    const p3 = createPlayer('p3', 'Player 3', 1480);
    const p4 = createPlayer('p4', 'Player 4', 1520);

    const pairing = pairFlightedTiers([p1, p2, p3, p4], waitedTimeMs);

    expect(pairing).not.toBeNull();
    if (!pairing) return;

    const selectedIds = [...pairing.teamA, ...pairing.teamB].map((p) => p.id);
    expect(selectedIds).toContain('p1');
    expect(selectedIds).toContain('p2');
  });

  it('relaxes band to closest available players if fewer than 3 players are within the expanded band', () => {
    const p1 = createPlayer('p1', 'Player 1', 2000);
    // Everyone else is far away (e.g. 1400)
    const p2 = createPlayer('p2', 'Player 2', 1400);
    const p3 = createPlayer('p3', 'Player 3', 1410);
    const p4 = createPlayer('p4', 'Player 4', 1420);
    const p5 = createPlayer('p5', 'Player 5', 1200);

    const pairing = pairFlightedTiers([p1, p2, p3, p4, p5], baseTimestampMs);

    expect(pairing).not.toBeNull();
    if (!pairing) return;

    const selectedIds = [...pairing.teamA, ...pairing.teamB].map((p) => p.id);
    expect(selectedIds).toContain('p1');
    // Must select closest 3: p2, p3, p4
    expect(selectedIds).toContain('p2');
    expect(selectedIds).toContain('p3');
    expect(selectedIds).toContain('p4');
    expect(selectedIds).not.toContain('p5');
  });
});
