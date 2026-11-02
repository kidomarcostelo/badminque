import { describe, expect, it } from 'vitest';
import type { RosterPlayer } from '../types';
import {
  DEFAULT_MATCH_EQUIVALENCE_SECONDS,
  DEFAULT_SKIP_BOOST_SECONDS,
  calculatePriorityScore,
  compareQueuePriority,
  sortEligibleQueue,
  type QueueCandidate,
} from './priority';

function createPlayer(overrides: Partial<RosterPlayer> = {}): RosterPlayer {
  return {
    id: overrides.id ?? 'player-1',
    name: overrides.name ?? 'Player 1',
    auth_user_id: null,
    singles_rating: overrides.singles_rating ?? 1500,
    doubles_rating: overrides.doubles_rating ?? 1500,
    matches_played: overrides.matches_played ?? 0,
    status: overrides.status ?? 'QUEUED',
    checked_in_at: overrides.checked_in_at ?? '2026-10-30T10:00:00.000Z',
    ...overrides,
  };
}

describe('Priority Score Formula & Queue Sorting', () => {
  const baseTimeMs = Date.parse('2026-10-30T10:30:00.000Z'); // 30 minutes after 10:00:00

  it('calculates priority score Q(i) = t_wait - C_match * M_i + delta_skip * S_i + epsilon_i', () => {
    // Waited 1800s (30m), 0 matches, not skipped, sequence 0
    const candidate: QueueCandidate = {
      ...createPlayer({ id: 'p1', matches_played: 0 }),
      ready_at: '2026-10-30T10:00:00.000Z',
      check_in_sequence: 0,
    };

    const score = calculatePriorityScore(candidate, baseTimeMs);
    // t_wait = 1800s, C_match * 0 = 0, delta_skip * 0 = 0, epsilon = 1 / (0 + 1) = 1.0
    expect(score).toBeCloseTo(1800 + 1.0, 3);
  });

  it('penalizes match count by C_match (1800 seconds per match completed)', () => {
    const candidateWithMatches: QueueCandidate = {
      ...createPlayer({ id: 'p2', matches_played: 2 }),
      ready_at: '2026-10-30T10:00:00.000Z',
      check_in_sequence: 0,
    };

    const score = calculatePriorityScore(candidateWithMatches, baseTimeMs);
    // 1800 - (1800 * 2) + 0 + 1.0 = -1800 + 1.0 = -1799
    expect(score).toBeCloseTo(1800 - 2 * DEFAULT_MATCH_EQUIVALENCE_SECONDS + 1.0, 3);
  });

  it('applies delta_skip bonus when player is marked skipped (S_i = 1)', () => {
    const skippedCandidate: QueueCandidate = {
      ...createPlayer({ id: 'p3', matches_played: 1, status: 'SKIPPED' }),
      ready_at: '2026-10-30T10:20:00.000Z', // waited 10m = 600s
      is_skipped: true,
      check_in_sequence: 0,
    };

    const score = calculatePriorityScore(skippedCandidate, baseTimeMs);
    // 600 - 1800 + 600 + 1.0 = -599
    expect(score).toBeCloseTo(600 - DEFAULT_MATCH_EQUIVALENCE_SECONDS + DEFAULT_SKIP_BOOST_SECONDS + 1.0, 3);
  });

  it('uses check_in_sequence as deterministic infinitesimal tie-breaker epsilon_i', () => {
    const candidateA: QueueCandidate = {
      ...createPlayer({ id: 'pA', matches_played: 0 }),
      ready_at: '2026-10-30T10:10:00.000Z',
      check_in_sequence: 0,
    };

    const candidateB: QueueCandidate = {
      ...createPlayer({ id: 'pB', matches_played: 0 }),
      ready_at: '2026-10-30T10:10:00.000Z',
      check_in_sequence: 1,
    };

    const scoreA = calculatePriorityScore(candidateA, baseTimeMs);
    const scoreB = calculatePriorityScore(candidateB, baseTimeMs);

    // epsilonA = 1/(0+1) = 1.0; epsilonB = 1/(1+1) = 0.5
    expect(scoreA).toBeGreaterThan(scoreB);
    expect(scoreA - scoreB).toBeCloseTo(0.5, 3);
  });

  it('sorts eligible queue deterministically by lowest match count (M_i), breaking ties by longest rest time (t_wait)', () => {
    const players: QueueCandidate[] = [
      // Waited 20m, 1 match
      {
        ...createPlayer({ id: 'p1', name: 'One Match 20m', matches_played: 1 }),
        ready_at: '2026-10-30T10:10:00.000Z',
        check_in_sequence: 0,
      },
      // Waited 5m, 0 matches (must be ahead of p1 because M_i is lower)
      {
        ...createPlayer({ id: 'p2', name: 'Zero Matches 5m', matches_played: 0 }),
        ready_at: '2026-10-30T10:25:00.000Z',
        check_in_sequence: 1,
      },
      // Waited 15m, 0 matches (must be ahead of p2 because t_wait is longer)
      {
        ...createPlayer({ id: 'p3', name: 'Zero Matches 15m', matches_played: 0 }),
        ready_at: '2026-10-30T10:15:00.000Z',
        check_in_sequence: 2,
      },
      // Waited 25m, 2 matches
      {
        ...createPlayer({ id: 'p4', name: 'Two Matches 25m', matches_played: 2 }),
        ready_at: '2026-10-30T10:05:00.000Z',
        check_in_sequence: 3,
      },
    ];

    const sorted = sortEligibleQueue(players, baseTimeMs);

    expect(sorted.map((p) => p.id)).toEqual(['p3', 'p2', 'p1', 'p4']);
  });

  it('breaks ties between equal M_i and equal t_wait using check_in_sequence or id', () => {
    const candidateA: QueueCandidate = {
      ...createPlayer({ id: 'player-a', matches_played: 1 }),
      ready_at: '2026-10-30T10:15:00.000Z',
      check_in_sequence: 5,
    };
    const candidateB: QueueCandidate = {
      ...createPlayer({ id: 'player-b', matches_played: 1 }),
      ready_at: '2026-10-30T10:15:00.000Z',
      check_in_sequence: 2,
    };

    const comparison = compareQueuePriority(candidateA, candidateB, baseTimeMs);
    // candidateB has earlier check_in_sequence (2 < 5), so B should come before A (comparison > 0)
    expect(comparison).toBeGreaterThan(0);

    const sorted = sortEligibleQueue([candidateA, candidateB], baseTimeMs);
    expect(sorted[0]?.id).toBe('player-b');
  });

  it('handles negative or zero wait times gracefully without NaN or runtime errors', () => {
    const futureCandidate: QueueCandidate = {
      ...createPlayer({ id: 'future' }),
      ready_at: '2026-10-30T11:00:00.000Z', // in future relative to baseTimeMs
    };

    const score = calculatePriorityScore(futureCandidate, baseTimeMs);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(score)).toBe(true);
  });
});
