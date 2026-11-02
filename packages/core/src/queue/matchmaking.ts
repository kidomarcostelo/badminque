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
 * Selects the top 4 eligible players respecting locked pair partnerships.
 * If a candidate has a locked partner, both must be ready and drafted together.
 */
export function selectTopQuadWithLockedPairs(
  sortedQueue: readonly QueueCandidate[]
): QueueCandidate[] | null {
  const eligible = sortedQueue.filter(
    (p) => p.status === 'QUEUED' || p.status === 'SKIPPED'
  );
  if (eligible.length < 4) {
    return null;
  }

  const selected: QueueCandidate[] = [];
  const selectedIds = new Set<string>();

  for (const candidate of eligible) {
    if (selectedIds.has(candidate.id)) {
      continue;
    }

    if (candidate.locked_partner_id) {
      const partner = eligible.find(
        (p) => p.id === candidate.locked_partner_id && !selectedIds.has(p.id)
      );
      if (!partner) {
        // Partner is not available in eligible pool, skip candidate
        continue;
      }
      if (selected.length + 2 > 4) {
        // Not enough room for both partners in this quad
        continue;
      }
      selected.push(candidate);
      selected.push(partner);
      selectedIds.add(candidate.id);
      selectedIds.add(partner.id);
    } else {
      selected.push(candidate);
      selectedIds.add(candidate.id);
    }

    if (selected.length === 4) {
      return selected;
    }
  }

  return null;
}

/**
 * Generates an optimal doubles match pairing according to the specified policy.
 */
export function generateMatchPairing(options: MatchmakingOptions): DoublesPairing | null {
  const { policy, queue, history, ladderBuffers, courtNumber } = options;
  const currentTimestampMs = options.currentTimestampMs ?? Date.now();

  const sortedQueue = sortEligibleQueue(queue, currentTimestampMs);
  const quad = selectTopQuadWithLockedPairs(sortedQueue);

  if (!quad && policy !== 'COURT_LADDER') {
    return null;
  }

  const effectiveHistory = history ?? new CoPlayHistoryTracker();

  if (policy === 'FAIR_PLAY') {
    return quad ? pairFairPlayPegboard(quad) : null;
  }

  if (policy === 'SPLIT_AND_MIX') {
    return quad ? pairSplitAndMix(quad, effectiveHistory) : null;
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

  return quad ? pairFairPlayPegboard(quad) : null;
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
