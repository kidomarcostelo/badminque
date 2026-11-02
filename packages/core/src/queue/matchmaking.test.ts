import { describe, expect, it } from 'vitest';
import type { RosterPlayer, RotationPolicy } from '../types';
import { CoPlayHistoryTracker } from './coPlayHistory';
import {
  generateMatchPairing,
  generateOnDeckPool,
} from './matchmaking';

function createPlayer(
  id: string,
  name: string,
  rating: number,
  matchesPlayed: number = 0,
  readyAt: string = '2026-10-30T10:00:00.000Z'
): RosterPlayer {
  return {
    id,
    name,
    auth_user_id: null,
    singles_rating: rating,
    doubles_rating: rating,
    matches_played: matchesPlayed,
    status: 'QUEUED',
    checked_in_at: readyAt,
  };
}

describe('Matchmaking & On-Deck Staging Engine', () => {
  const currentTimestampMs = Date.parse('2026-10-30T10:15:00.000Z');

  it('generates On-Deck staging pool with 3 slots (Next Up, Following, In the Hole) pre-grouped into Pair A vs Pair B', () => {
    // 12 queued players
    const players: RosterPlayer[] = [];
    for (let i = 1; i <= 12; i++) {
      players.push(createPlayer(`p${i}`, `Player ${i}`, 1500 + i * 10, 0));
    }

    const onDeck = generateOnDeckPool(players, 'FAIR_PLAY', currentTimestampMs);

    expect(onDeck).toHaveLength(3);

    expect(onDeck[0]?.slotIndex).toBe(1);
    expect(onDeck[0]?.label).toBe('Next Up');
    expect(onDeck[0]?.pairA).toHaveLength(2);
    expect(onDeck[0]?.pairB).toHaveLength(2);

    expect(onDeck[1]?.slotIndex).toBe(2);
    expect(onDeck[1]?.label).toBe('Following');
    expect(onDeck[1]?.pairA).toHaveLength(2);
    expect(onDeck[1]?.pairB).toHaveLength(2);

    expect(onDeck[2]?.slotIndex).toBe(3);
    expect(onDeck[2]?.label).toBe('In the Hole');
    expect(onDeck[2]?.pairA).toHaveLength(2);
    expect(onDeck[2]?.pairB).toHaveLength(2);
  });

  it('permanently displays two automated match groups pre-grouped into Pair A vs Pair B when at least 8 players queued', () => {
    const players: RosterPlayer[] = [];
    for (let i = 1; i <= 8; i++) {
      players.push(createPlayer(`p${i}`, `Player ${i}`, 1500 + i * 10, 0));
    }

    const onDeck = generateOnDeckPool(players, 'FAIR_PLAY', currentTimestampMs);

    expect(onDeck).toHaveLength(2);
    expect(onDeck[0]?.label).toBe('Next Up');
    expect(onDeck[1]?.label).toBe('Following');
    expect(onDeck[0]?.pairA).toHaveLength(2);
    expect(onDeck[0]?.pairB).toHaveLength(2);
    expect(onDeck[1]?.pairA).toHaveLength(2);
    expect(onDeck[1]?.pairB).toHaveLength(2);
  });

  it('switches between all 4 rotation policies and preserves player wait times and match counts', () => {
    const players: RosterPlayer[] = [
      createPlayer('p1', 'Player 1', 1700, 1, '2026-10-30T10:00:00.000Z'),
      createPlayer('p2', 'Player 2', 1650, 0, '2026-10-30T10:05:00.000Z'),
      createPlayer('p3', 'Player 3', 1600, 1, '2026-10-30T10:02:00.000Z'),
      createPlayer('p4', 'Player 4', 1550, 0, '2026-10-30T10:08:00.000Z'),
    ];

    const policies: RotationPolicy[] = [
      'FAIR_PLAY',
      'SPLIT_AND_MIX',
      'COURT_LADDER',
      'FLIGHTED_TIERS',
    ];

    const history = new CoPlayHistoryTracker();

    for (const policy of policies) {
      const pairing = generateMatchPairing({
        policy,
        queue: players,
        currentTimestampMs,
        history,
      });

      expect(pairing).not.toBeNull();
      expect(pairing?.policy).toBe(policy);

      // Verify that players list was not mutated
      expect(players[0]?.matches_played).toBe(1);
      expect(players[1]?.matches_played).toBe(0);
      expect(players[0]?.checked_in_at).toBe('2026-10-30T10:00:00.000Z');
      expect(players[1]?.checked_in_at).toBe('2026-10-30T10:05:00.000Z');
    }
  });
});
