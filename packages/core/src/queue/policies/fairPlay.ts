import { calculateWeakLinkSoftMean } from '../../dubr';
import type { RosterPlayer } from '../../types';
import type { DoublesPairing } from '../types';

/**
 * Fair Play Pegboard rotation policy:
 * Draws top 4 prioritized candidates and partitions them into two competing doubles teams
 * by evaluating all 3 configurations and selecting the one that minimizes weak-link soft mean rating spread.
 */
export function pairFairPlayPegboard(
  candidates: readonly RosterPlayer[]
): DoublesPairing | null {
  if (candidates.length < 4) {
    return null;
  }

  const [p0, p1, p2, p3] = candidates;
  if (!p0 || !p1 || !p2 || !p3) {
    return null;
  }

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
        policy: 'FAIR_PLAY',
        cost: spread,
      };
    }
  }

  return bestPairing;
}
