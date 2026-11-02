import { calculateWeakLinkSoftMean } from '../../dubr';
import type { RosterPlayer } from '../../types';
import type { DoublesPairing } from '../types';

export interface CourtLadderBufferState {
  1: { top: RosterPlayer[]; bottom: RosterPlayer[] };
  2: { top: RosterPlayer[]; bottom: RosterPlayer[] };
  3: { top: RosterPlayer[]; bottom: RosterPlayer[] };
}

export interface LadderMatchCompletionInput {
  courtNumber: 1 | 2 | 3;
  winnerPair: [RosterPlayer, RosterPlayer];
  loserPair: [RosterPlayer, RosterPlayer];
}

export interface PairCourtLadderOptions {
  courtNumber: 1 | 2 | 3;
  bufferedTop?: readonly RosterPlayer[];
  bufferedBottom?: readonly RosterPlayer[];
  queueBackfill: readonly RosterPlayer[];
}

/**
 * Routes completed match winners and losers through the 3-Court Hierarchical Ladder.
 * Court 1 (Apex): Winners stay in top buffer; losers demote to Court 2 top buffer.
 * Court 2 (Challenger): Winners promote to Court 1 bottom buffer; losers demote to Court 3 top buffer.
 * Court 3 (Base): Winners promote to Court 2 bottom buffer; losers stay in Court 3 bottom buffer.
 */
export function handleLadderMatchCompletion(
  input: LadderMatchCompletionInput,
  currentBuffers: CourtLadderBufferState
): CourtLadderBufferState {
  const { courtNumber, winnerPair, loserPair } = input;

  const nextBuffers: CourtLadderBufferState = {
    1: { top: [...currentBuffers[1].top], bottom: [...currentBuffers[1].bottom] },
    2: { top: [...currentBuffers[2].top], bottom: [...currentBuffers[2].bottom] },
    3: { top: [...currentBuffers[3].top], bottom: [...currentBuffers[3].bottom] },
  };

  if (courtNumber === 1) {
    nextBuffers[1].top.push(...winnerPair);
    nextBuffers[2].top.push(...loserPair);
  } else if (courtNumber === 2) {
    nextBuffers[1].bottom.push(...winnerPair);
    nextBuffers[3].top.push(...loserPair);
  } else {
    nextBuffers[2].bottom.push(...winnerPair);
    nextBuffers[3].bottom.push(...loserPair);
  }

  return nextBuffers;
}

/**
 * Given two pairs of players [pA1, pA2] and [pB1, pB2], evaluates the two partner-split
 * configurations and returns the one minimizing weak-link soft mean rating spread.
 */
function splitAndBalanceTwoPairs(
  pairA: [RosterPlayer, RosterPlayer],
  pairB: [RosterPlayer, RosterPlayer]
): DoublesPairing {
  const [a1, a2] = pairA;
  const [b1, b2] = pairB;

  // Configuration 1: [a1, b1] vs [a2, b2]
  const ratingA1 = calculateWeakLinkSoftMean(a1.doubles_rating, b1.doubles_rating);
  const ratingB1 = calculateWeakLinkSoftMean(a2.doubles_rating, b2.doubles_rating);
  const spread1 = Math.abs(ratingA1 - ratingB1);

  // Configuration 2: [a1, b2] vs [a2, b1]
  const ratingA2 = calculateWeakLinkSoftMean(a1.doubles_rating, b2.doubles_rating);
  const ratingB2 = calculateWeakLinkSoftMean(a2.doubles_rating, b1.doubles_rating);
  const spread2 = Math.abs(ratingA2 - ratingB2);

  if (spread1 <= spread2) {
    return {
      teamA: [a1, b1],
      teamB: [a2, b2],
      teamARating: Math.round(ratingA1),
      teamBRating: Math.round(ratingB1),
      ratingSpread: Math.round(spread1 * 10) / 10,
      policy: 'COURT_LADDER',
      cost: spread1,
    };
  }

  return {
    teamA: [a1, b2],
    teamB: [a2, b1],
    teamARating: Math.round(ratingA2),
    teamBRating: Math.round(ratingB2),
    ratingSpread: Math.round(spread2 * 10) / 10,
    policy: 'COURT_LADDER',
    cost: spread2,
  };
}

/**
 * Pairs players for a Court Ladder match with mandatory partner splitting
 * and dynamic priority queue backfilling.
 */
export function pairCourtLadder(options: PairCourtLadderOptions): DoublesPairing | null {
  const top = [...(options.bufferedTop ?? [])];
  const bottom = [...(options.bufferedBottom ?? [])];
  const backfill = [...options.queueBackfill];

  // Case 1: Both top and bottom buffers have a full pair (2 and 2)
  if (top.length >= 2 && bottom.length >= 2) {
    const pairA: [RosterPlayer, RosterPlayer] = [top[0] as RosterPlayer, top[1] as RosterPlayer];
    const pairB: [RosterPlayer, RosterPlayer] = [bottom[0] as RosterPlayer, bottom[1] as RosterPlayer];
    return splitAndBalanceTwoPairs(pairA, pairB);
  }

  // Combine whatever buffered players exist
  const totalBuffered = [...top, ...bottom];

  // Case 2: We have 2 buffered players and at least 2 backfill players
  if (totalBuffered.length >= 2 && backfill.length >= 2) {
    const pairA: [RosterPlayer, RosterPlayer] = [
      totalBuffered[0] as RosterPlayer,
      totalBuffered[1] as RosterPlayer,
    ];
    const pairB: [RosterPlayer, RosterPlayer] = [
      backfill[0] as RosterPlayer,
      backfill[1] as RosterPlayer,
    ];
    return splitAndBalanceTwoPairs(pairA, pairB);
  }

  // Case 3: Completely empty or fewer than 2 buffered players, need full backfill
  if (backfill.length >= 4) {
    const p0 = backfill[0] as RosterPlayer;
    const p1 = backfill[1] as RosterPlayer;
    const p2 = backfill[2] as RosterPlayer;
    const p3 = backfill[3] as RosterPlayer;

    const configurations: Array<{
      teamA: [RosterPlayer, RosterPlayer];
      teamB: [RosterPlayer, RosterPlayer];
    }> = [
      { teamA: [p0, p1], teamB: [p2, p3] },
      { teamA: [p0, p2], teamB: [p1, p3] },
      { teamA: [p0, p3], teamB: [p1, p2] },
    ];

    let bestPairing: DoublesPairing | null = null;
    let lowestSpread = Number.POSITIVE_INFINITY;

    for (const config of configurations) {
      const ratingA = calculateWeakLinkSoftMean(
        config.teamA[0].doubles_rating,
        config.teamA[1].doubles_rating
      );
      const ratingB = calculateWeakLinkSoftMean(
        config.teamB[0].doubles_rating,
        config.teamB[1].doubles_rating
      );
      const spread = Math.abs(ratingA - ratingB);
      if (spread < lowestSpread) {
        lowestSpread = spread;
        bestPairing = {
          teamA: config.teamA,
          teamB: config.teamB,
          teamARating: Math.round(ratingA),
          teamBRating: Math.round(ratingB),
          ratingSpread: Math.round(spread * 10) / 10,
          policy: 'COURT_LADDER',
          cost: spread,
        };
      }
    }

    return bestPairing;
  }

  return null;
}
