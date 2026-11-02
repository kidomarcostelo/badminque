import { describe, expect, it } from 'vitest';
import type { RosterPlayer } from '../../types';
import { pairFairPlayPegboard } from './fairPlay';

function createPlayer(id: string, name: string, rating: number): RosterPlayer {
  return {
    id,
    name,
    auth_user_id: null,
    singles_rating: rating,
    doubles_rating: rating,
    matches_played: 0,
    status: 'QUEUED',
    checked_in_at: '2026-10-30T10:00:00.000Z',
  };
}

describe('pairFairPlayPegboard (Fair Play Pegboard Policy)', () => {
  it('returns null if fewer than 4 candidates are provided', () => {
    const p1 = createPlayer('p1', 'Player 1', 1600);
    const p2 = createPlayer('p2', 'Player 2', 1550);
    const p3 = createPlayer('p3', 'Player 3', 1500);

    expect(pairFairPlayPegboard([p1, p2, p3])).toBeNull();
  });

  it('evaluates all 3 configurations and selects the pairing minimizing weak-link soft mean rating spread', () => {
    // 4 players with ratings: 1800, 1600, 1500, 1400
    // C1: (1800 + 1600) vs (1500 + 1400)
    // Team A: avg 1700 - 0.08*200 = 1684; Team B: avg 1450 - 0.08*100 = 1442; Spread = 242
    // C2: (1800 + 1500) vs (1600 + 1400)
    // Team A: avg 1650 - 0.08*300 = 1626; Team B: avg 1500 - 0.08*200 = 1484; Spread = 142
    // C3: (1800 + 1400) vs (1600 + 1500)
    // Team A: avg 1600 - 0.08*400 = 1568; Team B: avg 1550 - 0.08*100 = 1542; Spread = 26
    // C3 has the smallest spread (26 RS), so it should be chosen!
    const p0 = createPlayer('p0', 'Player 0', 1800);
    const p1 = createPlayer('p1', 'Player 1', 1600);
    const p2 = createPlayer('p2', 'Player 2', 1500);
    const p3 = createPlayer('p3', 'Player 3', 1400);

    const result = pairFairPlayPegboard([p0, p1, p2, p3]);

    expect(result).not.toBeNull();
    if (!result) return;

    expect(result.policy).toBe('FAIR_PLAY');
    // Team A should have p0 and p3, Team B should have p1 and p2
    const teamAIds = result.teamA.map((p) => p.id);
    const teamBIds = result.teamB.map((p) => p.id);
    const hasExpectedA = teamAIds.includes('p0') && teamAIds.includes('p3');
    const hasExpectedB = teamBIds.includes('p1') && teamBIds.includes('p2');
    expect((hasExpectedA && hasExpectedB) || (teamBIds.includes('p0') && teamBIds.includes('p3'))).toBe(true);
    expect(result.ratingSpread).toBeCloseTo(26, 1);
  });
});
