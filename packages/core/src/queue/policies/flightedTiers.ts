import { calculateWeakLinkSoftMean } from '../../dubr';
import type { RosterPlayer } from '../../types';
import { getWaitTimeSeconds, type QueueCandidate } from '../priority';
import type { DoublesPairing } from '../types';

export const DEFAULT_BASE_RATING_BAND = 150.0 as const;
export const DEFAULT_BAND_EXPANSION_RATE = 0.5 as const;
export const DEFAULT_TARGET_WAIT_SECONDS = 600 as const;

export interface FlightedTiersOptions {
  baseBand?: number;
  expansionRate?: number;
  targetWaitSeconds?: number;
}

/**
 * Flighted Tiers rotation policy:
 * Selects highest priority player p1, filters candidates within dynamic rating band:
 * Delta R_band = Delta R_base + gamma * max(0, t_wait - tau_target)
 * Gracefully relaxes band if insufficient candidates exist, then balances the 4 players.
 */
export function pairFlightedTiers(
  queue: readonly QueueCandidate[],
  currentTimestampMs: number,
  options?: FlightedTiersOptions
): DoublesPairing | null {
  if (queue.length < 4) {
    return null;
  }

  const p1 = queue[0];
  if (!p1) {
    return null;
  }

  const baseBand = options?.baseBand ?? DEFAULT_BASE_RATING_BAND;
  const expansionRate = options?.expansionRate ?? DEFAULT_BAND_EXPANSION_RATE;
  const targetWaitSeconds = options?.targetWaitSeconds ?? DEFAULT_TARGET_WAIT_SECONDS;

  const waitSeconds = getWaitTimeSeconds(p1, currentTimestampMs);
  const excessWait = Math.max(0, waitSeconds - targetWaitSeconds);
  const dynamicBand = baseBand + expansionRate * excessWait;

  const remaining = queue.slice(1);

  // Candidates within the rating band
  const matchingCandidates = remaining.filter((player) => {
    return Math.abs(player.doubles_rating - p1.doubles_rating) <= dynamicBand;
  });

  let selectedQuad: [RosterPlayer, RosterPlayer, RosterPlayer, RosterPlayer];

  if (matchingCandidates.length >= 3) {
    selectedQuad = [p1, matchingCandidates[0] as RosterPlayer, matchingCandidates[1] as RosterPlayer, matchingCandidates[2] as RosterPlayer];
  } else {
    // Relax band: take the 3 players with ratings closest to p1
    const sortedByDistance = [...remaining].sort((a, b) => {
      const distA = Math.abs(a.doubles_rating - p1.doubles_rating);
      const distB = Math.abs(b.doubles_rating - p1.doubles_rating);
      return distA - distB;
    });

    selectedQuad = [
      p1,
      sortedByDistance[0] as RosterPlayer,
      sortedByDistance[1] as RosterPlayer,
      sortedByDistance[2] as RosterPlayer,
    ];
  }

  // Find the optimal weak-link soft mean balance among the 4 chosen players
  const [q0, q1, q2, q3] = selectedQuad;
  const configurations: Array<{
    teamA: [RosterPlayer, RosterPlayer];
    teamB: [RosterPlayer, RosterPlayer];
  }> = [
    { teamA: [q0, q1], teamB: [q2, q3] },
    { teamA: [q0, q2], teamB: [q1, q3] },
    { teamA: [q0, q3], teamB: [q1, q2] },
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
        policy: 'FLIGHTED_TIERS',
        cost: spread,
      };
    }
  }

  return bestPairing;
}
