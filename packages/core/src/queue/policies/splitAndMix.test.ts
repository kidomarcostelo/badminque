import { describe, expect, it } from 'vitest';
import type { RosterPlayer } from '../../types';
import { CoPlayHistoryTracker } from '../coPlayHistory';
import { pairSplitAndMix } from './splitAndMix';

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

describe('pairSplitAndMix (Split & Mix Combinatorial Co-Play Minimization)', () => {
  it('returns null if fewer than 4 candidates are provided', () => {
    const p1 = createPlayer('p1', 'Player 1', 1600);
    const p2 = createPlayer('p2', 'Player 2', 1550);
    const history = new CoPlayHistoryTracker();

    expect(pairSplitAndMix([p1, p2], history)).toBeNull();
  });

  it('selects pairing minimizing cost function J(C) = 100*C_partner + 25*C_opp + 1*C_rating', () => {
    // 4 players: A, B, C, D
    // Suppose A & B have played as partners 3 times recently!
    // And C & D have also played as partners 2 times recently!
    // Meanwhile, A & C, A & D have never partnered.
    const pA = createPlayer('pA', 'Alice', 1600);
    const pB = createPlayer('pB', 'Bob', 1600);
    const pC = createPlayer('pC', 'Charlie', 1600);
    const pD = createPlayer('pD', 'David', 1600);

    const history = new CoPlayHistoryTracker();
    // Simulate past matches
    history.recordMatch(['pA', 'pB'], ['pE', 'pF'], 1);
    history.recordMatch(['pA', 'pB'], ['pG', 'pH'], 2);
    history.recordMatch(['pC', 'pD'], ['pI', 'pJ'], 3);

    const pairing = pairSplitAndMix([pA, pB, pC, pD], history, 4);

    expect(pairing).not.toBeNull();
    if (!pairing) return;

    expect(pairing.policy).toBe('SPLIT_AND_MIX');
    // A and B must NOT be partnered together!
    const teamAIds = pairing.teamA.map((p) => p.id);
    const teamBIds = pairing.teamB.map((p) => p.id);

    const isTogether =
      (teamAIds.includes('pA') && teamAIds.includes('pB')) ||
      (teamBIds.includes('pA') && teamBIds.includes('pB'));
    expect(isTogether).toBe(false);
  });

  it('partitions finished winners and losers so winners and losers are split', () => {
    const w1 = createPlayer('w1', 'Winner 1', 1650);
    const w2 = createPlayer('w2', 'Winner 2', 1600);
    const l1 = createPlayer('l1', 'Loser 1', 1550);
    const l2 = createPlayer('l2', 'Loser 2', 1500);

    const history = new CoPlayHistoryTracker();
    // They just finished playing together on court!
    history.recordMatch(['w1', 'w2'], ['l1', 'l2'], 1);

    const pairing = pairSplitAndMix([w1, w2, l1, l2], history, 2);

    expect(pairing).not.toBeNull();
    if (!pairing) return;

    const teamAIds = pairing.teamA.map((p) => p.id);
    const teamBIds = pairing.teamB.map((p) => p.id);

    // w1 & w2 must not be partners, and l1 & l2 must not be partners
    const winnersTogether =
      (teamAIds.includes('w1') && teamAIds.includes('w2')) ||
      (teamBIds.includes('w1') && teamBIds.includes('w2'));
    const losersTogether =
      (teamAIds.includes('l1') && teamAIds.includes('l2')) ||
      (teamBIds.includes('l1') && teamBIds.includes('l2'));

    expect(winnersTogether).toBe(false);
    expect(losersTogether).toBe(false);
  });
});
