import { describe, expect, it } from 'vitest';
import type { RosterPlayer } from '../../types';
import {
  handleLadderMatchCompletion,
  pairCourtLadder,
  type CourtLadderBufferState,
} from './courtLadder';

function createPlayer(id: string, name: string, rating: number): RosterPlayer {
  return {
    id,
    name,
    auth_user_id: null,
    singles_rating: rating,
    doubles_rating: rating,
    matches_played: 1,
    status: 'QUEUED',
    checked_in_at: '2026-10-30T10:00:00.000Z',
  };
}

describe('Court Ladder Policy', () => {
  it('routes winners up toward Court 1 (Apex) and losers down toward Court 3 (Base)', () => {
    const initialBuffers: CourtLadderBufferState = {
      1: { top: [], bottom: [] },
      2: { top: [], bottom: [] },
      3: { top: [], bottom: [] },
    };

    const w1 = createPlayer('w1', 'Winner 1', 1600);
    const w2 = createPlayer('w2', 'Winner 2', 1580);
    const l1 = createPlayer('l1', 'Loser 1', 1540);
    const l2 = createPlayer('l2', 'Loser 2', 1520);

    // 1. Court 2 finishes: winners promote to Court 1, losers demote to Court 3
    const resultC2 = handleLadderMatchCompletion(
      { courtNumber: 2, winnerPair: [w1, w2], loserPair: [l1, l2] },
      initialBuffers
    );

    expect(resultC2[1].bottom.map((p) => p.id)).toEqual(['w1', 'w2']);
    expect(resultC2[3].top.map((p) => p.id)).toEqual(['l1', 'l2']);

    // 2. Court 1 finishes: winners retain Court 1 (top buffer), losers demote to Court 2 (top buffer)
    const resultC1 = handleLadderMatchCompletion(
      { courtNumber: 1, winnerPair: [w1, w2], loserPair: [l1, l2] },
      initialBuffers
    );
    expect(resultC1[1].top.map((p) => p.id)).toEqual(['w1', 'w2']);
    expect(resultC1[2].top.map((p) => p.id)).toEqual(['l1', 'l2']);

    // 3. Court 3 finishes: winners promote to Court 2 (bottom buffer), losers retain Court 3 (bottom buffer)
    const resultC3 = handleLadderMatchCompletion(
      { courtNumber: 3, winnerPair: [w1, w2], loserPair: [l1, l2] },
      initialBuffers
    );
    expect(resultC3[2].bottom.map((p) => p.id)).toEqual(['w1', 'w2']);
    expect(resultC3[3].bottom.map((p) => p.id)).toEqual(['l1', 'l2']);
  });

  it('mandates partner splitting when 4 buffered players are paired', () => {
    // Top buffer has pair [p1, p2]; Bottom buffer has pair [p3, p4]
    const p1 = createPlayer('p1', 'Player 1', 1700);
    const p2 = createPlayer('p2', 'Player 2', 1650);
    const p3 = createPlayer('p3', 'Player 3', 1680);
    const p4 = createPlayer('p4', 'Player 4', 1620);

    const pairing = pairCourtLadder({
      courtNumber: 1,
      bufferedTop: [p1, p2],
      bufferedBottom: [p3, p4],
      queueBackfill: [],
    });

    expect(pairing).not.toBeNull();
    if (!pairing) return;

    expect(pairing.policy).toBe('COURT_LADDER');

    const teamAIds = pairing.teamA.map((p) => p.id);
    const teamBIds = pairing.teamB.map((p) => p.id);

    // p1 and p2 must NOT remain partners!
    const p1p2Together =
      (teamAIds.includes('p1') && teamAIds.includes('p2')) ||
      (teamBIds.includes('p1') && teamBIds.includes('p2'));
    expect(p1p2Together).toBe(false);

    // p3 and p4 must NOT remain partners!
    const p3p4Together =
      (teamAIds.includes('p3') && teamAIds.includes('p4')) ||
      (teamBIds.includes('p3') && teamBIds.includes('p4'));
    expect(p3p4Together).toBe(false);
  });

  it('dynamically backfills from priority queue when buffer has fewer than 4 players', () => {
    // Only 2 buffered players: [p1, p2]
    const p1 = createPlayer('p1', 'Player 1', 1700);
    const p2 = createPlayer('p2', 'Player 2', 1650);

    // Priority queue provides 2 backfill candidates: [q1, q2]
    const q1 = createPlayer('q1', 'Queue 1', 1600);
    const q2 = createPlayer('q2', 'Queue 2', 1580);

    const pairing = pairCourtLadder({
      courtNumber: 2,
      bufferedTop: [p1, p2],
      bufferedBottom: [],
      queueBackfill: [q1, q2],
    });

    expect(pairing).not.toBeNull();
    if (!pairing) return;

    // Both p1 & p2 are split across the net with q1 & q2
    const teamAIds = pairing.teamA.map((p) => p.id);
    const teamBIds = pairing.teamB.map((p) => p.id);

    const p1p2Together =
      (teamAIds.includes('p1') && teamAIds.includes('p2')) ||
      (teamBIds.includes('p1') && teamBIds.includes('p2'));
    expect(p1p2Together).toBe(false);

    const q1q2Together =
      (teamAIds.includes('q1') && teamAIds.includes('q2')) ||
      (teamBIds.includes('q1') && teamBIds.includes('q2'));
    expect(q1q2Together).toBe(false);
  });

  it('backfills all 4 players from priority queue if ladder buffer is completely empty', () => {
    const q1 = createPlayer('q1', 'Queue 1', 1600);
    const q2 = createPlayer('q2', 'Queue 2', 1580);
    const q3 = createPlayer('q3', 'Queue 3', 1540);
    const q4 = createPlayer('q4', 'Queue 4', 1500);

    const pairing = pairCourtLadder({
      courtNumber: 3,
      bufferedTop: [],
      bufferedBottom: [],
      queueBackfill: [q1, q2, q3, q4],
    });

    expect(pairing).not.toBeNull();
    expect(pairing?.teamA).toHaveLength(2);
    expect(pairing?.teamB).toHaveLength(2);
  });
});
