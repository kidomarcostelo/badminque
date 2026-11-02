import type { RosterPlayer } from '../types';

export const DEFAULT_MATCH_EQUIVALENCE_SECONDS = 1800 as const;
export const DEFAULT_SKIP_BOOST_SECONDS = 600 as const;

export interface PriorityScoreOptions {
  matchPenaltySeconds?: number;
  skipBonusSeconds?: number;
}

export interface QueueCandidate extends RosterPlayer {
  ready_at?: string | number | null;
  is_skipped?: boolean;
  check_in_sequence?: number;
  locked_partner_id?: string | null;
}

export function parseTimestampMs(value: string | number | undefined | null): number {
  if (value === undefined || value === null) {
    return 0;
  }
  if (typeof value === 'number') {
    return value;
  }
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return 0;
  }
  return parsed;
}

export function getWaitTimeSeconds(
  candidate: QueueCandidate,
  currentTimestampMs: number
): number {
  const readyMs =
    candidate.ready_at !== undefined && candidate.ready_at !== null
      ? parseTimestampMs(candidate.ready_at)
      : parseTimestampMs(candidate.checked_in_at);

  if (readyMs === 0) {
    return 0;
  }

  const waitMs = Math.max(0, currentTimestampMs - readyMs);
  return Math.floor(waitMs / 1000);
}

/**
 * Calculates dynamic priority score Q(i) for a queued candidate:
 * Q(i) = t_wait - C_match * M_i + delta_skip * S_i + epsilon_i
 *
 * Strictly adheres to CODING_STANDARDS.md (no nested ternaries, guard clauses, strict typing).
 */
export function calculatePriorityScore(
  player: QueueCandidate,
  currentTimestampMs: number,
  options?: PriorityScoreOptions
): number {
  const matchPenaltySeconds = options?.matchPenaltySeconds ?? DEFAULT_MATCH_EQUIVALENCE_SECONDS;
  const skipBonusSeconds = options?.skipBonusSeconds ?? DEFAULT_SKIP_BOOST_SECONDS;

  const waitSeconds = getWaitTimeSeconds(player, currentTimestampMs);
  const matchPenalty = player.matches_played * matchPenaltySeconds;
  const isSkipped = player.is_skipped === true || player.status === 'SKIPPED';
  const skipBonus = isSkipped ? skipBonusSeconds : 0;

  const checkInSeq = player.check_in_sequence ?? 0;
  const epsilon = 1 / (checkInSeq + 1);

  return waitSeconds - matchPenalty + skipBonus + epsilon;
}

/**
 * Deterministic queue priority comparator.
 * Sorts primarily by lowest match count (M_i), breaking ties by longest rest time (t_wait).
 * Secondary tie-breaking by check_in_sequence or id ensures strict stability.
 */
export function compareQueuePriority(
  playerA: QueueCandidate,
  playerB: QueueCandidate,
  currentTimestampMs: number,
  options?: PriorityScoreOptions
): number {
  if (playerA.matches_played !== playerB.matches_played) {
    return playerA.matches_played - playerB.matches_played;
  }

  const skipBonusSeconds = options?.skipBonusSeconds ?? DEFAULT_SKIP_BOOST_SECONDS;
  const isSkippedA = playerA.is_skipped === true || playerA.status === 'SKIPPED';
  const isSkippedB = playerB.is_skipped === true || playerB.status === 'SKIPPED';

  const effectiveWaitA =
    getWaitTimeSeconds(playerA, currentTimestampMs) + (isSkippedA ? skipBonusSeconds : 0);
  const effectiveWaitB =
    getWaitTimeSeconds(playerB, currentTimestampMs) + (isSkippedB ? skipBonusSeconds : 0);

  if (effectiveWaitA !== effectiveWaitB) {
    return effectiveWaitB - effectiveWaitA;
  }

  // Sub-second precision for rest duration tie-breaking: earlier timestamp waited longer
  const readyMsA =
    playerA.ready_at !== undefined && playerA.ready_at !== null
      ? parseTimestampMs(playerA.ready_at)
      : parseTimestampMs(playerA.checked_in_at);
  const readyMsB =
    playerB.ready_at !== undefined && playerB.ready_at !== null
      ? parseTimestampMs(playerB.ready_at)
      : parseTimestampMs(playerB.checked_in_at);

  if (readyMsA !== readyMsB && readyMsA > 0 && readyMsB > 0) {
    return readyMsA - readyMsB;
  }

  const seqA = playerA.check_in_sequence ?? 0;
  const seqB = playerB.check_in_sequence ?? 0;
  if (seqA !== seqB) {
    return seqA - seqB;
  }

  return playerA.id.localeCompare(playerB.id);
}

/**
 * Sorts eligible players deterministically by priority.
 */
export function sortEligibleQueue(
  players: readonly QueueCandidate[],
  currentTimestampMs: number,
  options?: PriorityScoreOptions
): QueueCandidate[] {
  return [...players].sort((firstPlayer, secondPlayer) =>
    compareQueuePriority(firstPlayer, secondPlayer, currentTimestampMs, options)
  );
}
