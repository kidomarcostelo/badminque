import { calculateWeakLinkSoftMean } from '../../dubr';
import type { RosterPlayer } from '../../types';
import type { CoPlayHistoryLookup, DoublesPairing } from '../types';
import { respectsLockedPartners } from './fairPlay';

export const SPLIT_AND_MIX_WEIGHT_PARTNER = 100.0 as const;
export const SPLIT_AND_MIX_WEIGHT_OPPONENT = 25.0 as const;
export const SPLIT_AND_MIX_WEIGHT_RATING = 1.0 as const;

export interface SplitAndMixOptions {
  weightPartner?: number;
  weightOpponent?: number;
  weightRating?: number;
}

function calculatePartnerPenalty(
  playerAId: string,
  playerBId: string,
  history: CoPlayHistoryLookup,
  currentMatchIndex: number
): number {
  const partnerCount = history.getPartnerCount(playerAId, playerBId);
  const lastMatch = history.getLastPartnerMatchIndex(playerAId, playerBId);

  let recency = 0;
  if (lastMatch >= 0) {
    const matchDiff = Math.max(0, currentMatchIndex - lastMatch);
    recency = Math.exp(-matchDiff / 2.0);
  }

  return partnerCount * 10 + recency * 50;
}

function calculateOpponentPenalty(
  playerAId: string,
  playerBId: string,
  history: CoPlayHistoryLookup,
  currentMatchIndex: number
): number {
  const opponentCount = history.getOpponentCount(playerAId, playerBId);
  const lastMatch = history.getLastOpponentMatchIndex(playerAId, playerBId);

  let recency = 0;
  if (lastMatch >= 0) {
    const matchDiff = Math.max(0, currentMatchIndex - lastMatch);
    recency = Math.exp(-matchDiff / 2.0);
  }

  return opponentCount * 2 + recency * 10;
}

export function evaluateConfigurationCost(
  teamA: [RosterPlayer, RosterPlayer],
  teamB: [RosterPlayer, RosterPlayer],
  history: CoPlayHistoryLookup,
  currentMatchIndex: number,
  options?: SplitAndMixOptions
): number {
  const weightPartner = options?.weightPartner ?? SPLIT_AND_MIX_WEIGHT_PARTNER;
  const weightOpponent = options?.weightOpponent ?? SPLIT_AND_MIX_WEIGHT_OPPONENT;
  const weightRating = options?.weightRating ?? SPLIT_AND_MIX_WEIGHT_RATING;

  // 1. Partner penalty
  const partnerPenaltyA = calculatePartnerPenalty(
    teamA[0].id,
    teamA[1].id,
    history,
    currentMatchIndex
  );
  const partnerPenaltyB = calculatePartnerPenalty(
    teamB[0].id,
    teamB[1].id,
    history,
    currentMatchIndex
  );
  const totalPartnerPenalty = partnerPenaltyA + partnerPenaltyB;

  // 2. Opponent penalty
  let totalOpponentPenalty = 0;
  for (const playerA of teamA) {
    for (const playerB of teamB) {
      totalOpponentPenalty += calculateOpponentPenalty(
        playerA.id,
        playerB.id,
        history,
        currentMatchIndex
      );
    }
  }

  // 3. Rating disparity using weak-link soft mean
  const ratingA = calculateWeakLinkSoftMean(
    teamA[0].doubles_rating,
    teamA[1].doubles_rating
  );
  const ratingB = calculateWeakLinkSoftMean(
    teamB[0].doubles_rating,
    teamB[1].doubles_rating
  );
  const ratingDisparity = Math.abs(ratingA - ratingB);

  return (
    weightPartner * totalPartnerPenalty +
    weightOpponent * totalOpponentPenalty +
    weightRating * ratingDisparity
  );
}

/**
 * Split & Mix rotation policy:
 * Evaluates the 3 possible configurations using combinatorial co-play cost function:
 * J(C) = 100 * C_partner + 25 * C_opp + 1 * C_rating
 */
export function pairSplitAndMix(
  candidates: readonly RosterPlayer[],
  history: CoPlayHistoryLookup,
  currentMatchIndex?: number,
  options?: SplitAndMixOptions
): DoublesPairing | null {
  if (candidates.length < 4) {
    return null;
  }

  const [p0, p1, p2, p3] = candidates;
  if (!p0 || !p1 || !p2 || !p3) {
    return null;
  }

  const effectiveMatchIndex = currentMatchIndex ?? history.getTotalMatches() + 1;

  const allConfigurations: Array<{
    teamA: [RosterPlayer, RosterPlayer];
    teamB: [RosterPlayer, RosterPlayer];
  }> = [
    { teamA: [p0, p1], teamB: [p2, p3] },
    { teamA: [p0, p2], teamB: [p1, p3] },
    { teamA: [p0, p3], teamB: [p1, p2] },
  ];

  const validConfigurations = allConfigurations.filter((config) =>
    respectsLockedPartners(config.teamA, config.teamB)
  );

  const configurations =
    validConfigurations.length > 0 ? validConfigurations : allConfigurations;

  let bestPairing: DoublesPairing | null = null;
  let lowestCost = Number.POSITIVE_INFINITY;

  for (const config of configurations) {
    const cost = evaluateConfigurationCost(
      config.teamA,
      config.teamB,
      history,
      effectiveMatchIndex,
      options
    );

    if (cost < lowestCost) {
      lowestCost = cost;
      const ratingA = calculateWeakLinkSoftMean(
        config.teamA[0].doubles_rating,
        config.teamA[1].doubles_rating
      );
      const ratingB = calculateWeakLinkSoftMean(
        config.teamB[0].doubles_rating,
        config.teamB[1].doubles_rating
      );
      bestPairing = {
        teamA: config.teamA,
        teamB: config.teamB,
        teamARating: Math.round(ratingA),
        teamBRating: Math.round(ratingB),
        ratingSpread: Math.round(Math.abs(ratingA - ratingB) * 10) / 10,
        policy: 'SPLIT_AND_MIX',
        cost: Math.round(cost * 100) / 100,
      };
    }
  }

  return bestPairing;
}
