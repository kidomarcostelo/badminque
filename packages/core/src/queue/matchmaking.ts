import type { RotationPolicy } from '../types';
import { CoPlayHistoryTracker } from './coPlayHistory';
import { pairCourtLadder, type CourtLadderBufferState } from './policies/courtLadder';
import { pairFairPlayPegboard } from './policies/fairPlay';
import { pairFlightedTiers } from './policies/flightedTiers';
import { pairSplitAndMix } from './policies/splitAndMix';
import { sortEligibleQueue, type QueueCandidate } from './priority';
import type { CoPlayHistoryLookup, DoublesPairing, OnDeckMatchGroup } from './types';

export interface MatchmakingOptions {
  readonly policy: RotationPolicy;
  readonly queue: readonly QueueCandidate[];
  readonly currentTimestampMs?: number;
  readonly history?: CoPlayHistoryLookup;
  readonly ladderBuffers?: CourtLadderBufferState;
  readonly courtNumber?: 1 | 2 | 3;
}

const ON_DECK_LABELS: ReadonlyArray<'Next Up' | 'Following' | 'In the Hole'> = [
  'Next Up',
  'Following',
  'In the Hole',
];

/**
 * Generates an optimal doubles match pairing according to the specified policy.
 */
export function generateMatchPairing(options: MatchmakingOptions): DoublesPairing | null {
  const { policy, queue, history, ladderBuffers, courtNumber } = options;
  const currentTimestampMs = options.currentTimestampMs ?? Date.now();

  const sortedQueue = sortEligibleQueue(queue, currentTimestampMs);
  if (sortedQueue.length < 4 && policy !== 'COURT_LADDER') {
    return null;
  }

  const effectiveHistory = history ?? new CoPlayHistoryTracker();

  if (policy === 'FAIR_PLAY') {
    return pairFairPlayPegboard(sortedQueue.slice(0, 4));
  }

  if (policy === 'SPLIT_AND_MIX') {
    return pairSplitAndMix(sortedQueue.slice(0, 4), effectiveHistory);
  }

  if (policy === 'COURT_LADDER') {
    const cNum = courtNumber ?? 1;
    const top = ladderBuffers?.[cNum]?.top ?? [];
    const bottom = ladderBuffers?.[cNum]?.bottom ?? [];
    return pairCourtLadder({
      courtNumber: cNum,
      bufferedTop: top,
      bufferedBottom: bottom,
      queueBackfill: sortedQueue,
    });
  }

  if (policy === 'FLIGHTED_TIERS') {
    return pairFlightedTiers(sortedQueue, currentTimestampMs);
  }

  return pairFairPlayPegboard(sortedQueue.slice(0, 4));
}

/**
 * Generates the On-Deck staging pool containing up to 3 automated match cards
 * ("Next Up", "Following", "In the Hole") pre-grouped into Pair A vs Pair B.
 */
export function generateOnDeckPool(
  queue: readonly QueueCandidate[],
  policy: RotationPolicy,
  currentTimestampMs: number = Date.now(),
  history?: CoPlayHistoryLookup,
  maxSlots: number = 3
): OnDeckMatchGroup[] {
  const sortedQueue = sortEligibleQueue(queue, currentTimestampMs);
  const groups: OnDeckMatchGroup[] = [];
  const effectiveHistory = history ?? new CoPlayHistoryTracker();

  let remainingQueue: QueueCandidate[] = [...sortedQueue];

  for (let slot = 1; slot <= maxSlots; slot++) {
    if (remainingQueue.length < 4) {
      break;
    }

    const pairing = generateMatchPairing({
      policy,
      queue: remainingQueue,
      currentTimestampMs,
      history: effectiveHistory,
    });

    if (!pairing) {
      break;
    }

    const assignedIds = new Set([
      pairing.teamA[0].id,
      pairing.teamA[1].id,
      pairing.teamB[0].id,
      pairing.teamB[1].id,
    ]);

    const label = ON_DECK_LABELS[slot - 1] ?? 'In the Hole';

    groups.push({
      slotIndex: slot,
      label,
      pairA: pairing.teamA,
      pairB: pairing.teamB,
      pairARating: pairing.teamARating,
      pairBRating: pairing.teamBRating,
      spread: pairing.ratingSpread,
      policy,
    });

    // Remove selected 4 players from the remaining queue
    remainingQueue = remainingQueue.filter((p) => !assignedIds.has(p.id));
  }

  return groups;
}
