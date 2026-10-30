/**
 * Dynamic Universal Badminton Rating (DUBR) domain mathematics and scale conversions.
 * Conforms strictly to ADR 0002, AGENTS.md, and docs/research/rating-algorithm-spec.md.
 */

import {
  ESTABLISHED_MATCH_THRESHOLD,
  K_FACTOR_ESTABLISHED,
  K_FACTOR_PROVISIONAL,
  MAX_MOV_MULTIPLIER,
  MIN_MOV_MULTIPLIER,
  MIN_POINTS_FOR_RATING,
  WEAK_LINK_GAMMA,
} from './constants';
import type { MatchFormat, PlayerRatingDelta } from './types';

// DUBR Scale Constants per ADR 0002 Section 6
export const DUBR_BASE_RATING = 800.0 as const;
export const DUBR_DIVISOR = 400.0 as const;
export const DUBR_SCALE_MIN = 2.0 as const;
export const DUBR_SCALE_MAX = 7.0 as const;
export const RATING_FLOOR = 800.0 as const;
export const FAVORITE_DAMPING = 0.50 as const;
export const K_HALF_LIFE = 6.0 as const;
export const MOV_DENOMINATOR_BASE = 8.0 as const;

export interface MatchParticipant {
  id: string;
  name?: string;
  rating: number;
  matches_played: number;
}

/**
 * Maps high-precision internal logistic rating to user-facing 2.000–7.000 decimal DUBR.
 * Formula: DUBR = 2.000 + (R - 800) / 400
 */
export function ratingToDubr(rating: number): number {
  return 2.0 + (rating - DUBR_BASE_RATING) / DUBR_DIVISOR;
}

/**
 * Inverts user-facing decimal DUBR back to high-precision logistic rating scale.
 * Formula: R = 800 + (DUBR - 2.0) * 400
 */
export function dubrToRating(dubr: number): number {
  return DUBR_BASE_RATING + (dubr - 2.0) * DUBR_DIVISOR;
}

/**
 * Converts internal rating delta into Delta DUBR.
 * Formula: Delta DUBR = Delta R / 400
 */
export function ratingDeltaToDubrDelta(ratingDelta: number): number {
  return ratingDelta / DUBR_DIVISOR;
}

/**
 * Formats a DUBR value to 3 decimal places (e.g. "3.500").
 */
export function formatDubr(dubr: number): string {
  return dubr.toFixed(3);
}

/**
 * Formats a Delta DUBR adjustment with explicit sign (e.g. "+0.085", "-0.060").
 */
export function formatDubrDelta(delta: number): string {
  if (Math.abs(delta) < 0.0005) {
    return '+0.000';
  }
  const sign = delta > 0 ? '+' : '';
  return `${sign}${delta.toFixed(3)}`;
}

/**
 * Weak-link soft mean giving 58% weight to the weaker partner and 42% to the stronger partner.
 * Formula: R_team = (R_1 + R_2)/2 - gamma * |R_1 - R_2|
 */
export function calculateWeakLinkSoftMean(
  rating1: number,
  rating2: number,
  gamma: number = WEAK_LINK_GAMMA
): number {
  const higherRating = Math.max(rating1, rating2);
  const lowerRating = Math.min(rating1, rating2);
  return 0.5 * (rating1 + rating2) - gamma * (higherRating - lowerRating);
}

/**
 * Expected win probability under standard logistic model.
 * Formula: E = 1 / (1 + 10^((R_opp - R_p) / 400))
 */
export function calculateExpectedWinProbability(
  playerRating: number,
  opponentRating: number
): number {
  const exponent = (opponentRating - playerRating) / DUBR_DIVISOR;
  return 1.0 / (1.0 + Math.pow(10.0, exponent));
}

/**
 * Continuous K-factor decay scaling dynamically from K=64 down to K=16.
 * Formula: K(N) = K_min + (K_max - K_min) * exp(-lambda * N)
 */
export function calculateKFactor(
  matchesPlayed: number,
  kMax: number = K_FACTOR_PROVISIONAL,
  kMin: number = K_FACTOR_ESTABLISHED,
  halfLife: number = K_HALF_LIFE
): number {
  const decayConstant = Math.log(2.0) / halfLife;
  return kMin + (kMax - kMin) * Math.exp(-decayConstant * matchesPlayed);
}

/**
 * Logarithmic Margin of Victory (MOV) multiplier bounded between 0.50 and 1.75.
 * Formula: M = clamp((ln(MOV_eff + 1) / ln(8)) * damping, M_min, M_max)
 */
export function calculateMarginOfVictoryMultiplier(
  pointsWinner: number,
  pointsLoser: number,
  gamesPlayed: number,
  ratingDiffWinnerMinusLoser: number,
  favoriteDamping: number = FAVORITE_DAMPING,
  minMultiplier: number = MIN_MOV_MULTIPLIER,
  maxMultiplier: number = MAX_MOV_MULTIPLIER
): number {
  const pointsDifferential = pointsWinner - pointsLoser;
  const effectiveMov = Math.max(1.0, pointsDifferential / Math.max(1, gamesPlayed));
  const logFactor = Math.log(effectiveMov + 1.0) / Math.log(MOV_DENOMINATOR_BASE);
  const ratingExponent = ratingDiffWinnerMinusLoser / DUBR_DIVISOR;
  const dampingFactor =
    (1.0 + favoriteDamping) /
    (1.0 + favoriteDamping * Math.pow(10.0, ratingExponent));

  const rawMultiplier = logFactor * dampingFactor;
  return Math.max(minMultiplier, Math.min(maxMultiplier, rawMultiplier));
}

/**
 * Format weight for match format.
 */
export function getFormatWeight(format: MatchFormat): number {
  if (format === 'BEST_OF_3') {
    return 1.25;
  }
  return 1.0;
}

/**
 * Computes individual DUBR rating adjustments for a doubles match adhering to all 5 invariants in ADR 0002.
 */
export function calculateDoublesMatchDeltas(
  teamA: MatchParticipant[],
  teamB: MatchParticipant[],
  setsScores: [number, number][],
  format: MatchFormat = 'SINGLE_21'
): PlayerRatingDelta[] {
  if (teamA.length !== 2 || teamB.length !== 2) {
    throw new Error('Doubles match requires exactly 2 players per team');
  }
  const [a1, a2] = teamA;
  const [b1, b2] = teamB;
  if (!a1 || !a2 || !b1 || !b2) {
    throw new Error('Missing player in team');
  }
  const allIds = [a1.id, a2.id, b1.id, b2.id];
  if (new Set(allIds).size !== 4) {
    throw new Error('All 4 players in doubles match must be distinct');
  }
  if (setsScores.length === 0) {
    throw new Error('Match must have at least one set score');
  }

  for (const [sa, sb] of setsScores) {
    if (sa < 0 || sb < 0) {
      throw new Error(`Set scores must be non-negative, got (${sa}, ${sb})`);
    }
  }

  // Anti-gaming / voided match rule: fewer than 11 points voided from rating
  const totalMatchPoints = setsScores.reduce((sum, [sa, sb]) => sum + sa + sb, 0);
  if (totalMatchPoints < MIN_POINTS_FOR_RATING) {
    return [...teamA, ...teamB].map((player) => ({
      player_id: player.id,
      player_name: player.name ?? '',
      pre_rating: Number(player.rating.toFixed(2)),
      post_rating: Number(player.rating.toFixed(2)),
      rating_delta: 0.0,
      pre_dubr: Number(ratingToDubr(player.rating).toFixed(3)),
      post_dubr: Number(ratingToDubr(player.rating).toFixed(3)),
      dubr_delta: 0.0,
      k_factor: Number(calculateKFactor(player.matches_played).toFixed(1)),
      is_provisional: player.matches_played < ESTABLISHED_MATCH_THRESHOLD,
      matches_played_after: player.matches_played,
    }));
  }

  for (const [sa, sb] of setsScores) {
    if (sa === sb) {
      throw new Error(`Individual set score cannot be tied: got (${sa}, ${sb})`);
    }
  }

  const teamAWonSets = setsScores.filter(([sa, sb]) => sa > sb).length;
  const teamBWonSets = setsScores.filter(([sa, sb]) => sb > sa).length;

  if (teamAWonSets === teamBWonSets) {
    throw new Error('Match cannot end in a tie');
  }

  const teamAWon = teamAWonSets > teamBWonSets;
  const effectiveTeamA = calculateWeakLinkSoftMean(a1.rating, a2.rating);
  const effectiveTeamB = calculateWeakLinkSoftMean(b1.rating, b2.rating);

  const totalPtsA = setsScores.reduce((sum, [sa]) => sum + sa, 0);
  const totalPtsB = setsScores.reduce((sum, [, sb]) => sum + sb, 0);
  const gamesPlayed = setsScores.length;

  const ptsWinner = teamAWon ? totalPtsA : totalPtsB;
  const ptsLoser = teamAWon ? totalPtsB : totalPtsA;
  const ratingDiffWinLose = teamAWon
    ? effectiveTeamA - effectiveTeamB
    : effectiveTeamB - effectiveTeamA;

  const movMultiplier = calculateMarginOfVictoryMultiplier(
    ptsWinner,
    ptsLoser,
    gamesPlayed,
    ratingDiffWinLose
  );
  const formatMultiplier = getFormatWeight(format);

  const scoreA = teamAWon ? 1.0 : 0.0;
  const scoreB = teamAWon ? 0.0 : 1.0;

  const deltas: PlayerRatingDelta[] = [];

  // Team A updates
  for (const player of [a1, a2]) {
    const expectedWin = calculateExpectedWinProbability(player.rating, effectiveTeamB);
    const kFactor = calculateKFactor(player.matches_played);
    const rawDelta = kFactor * formatMultiplier * movMultiplier * (scoreA - expectedWin);

    // Non-inversion invariant enforcement
    let postRating = player.rating + rawDelta;
    if (teamAWon) {
      postRating = Math.max(player.rating, postRating);
    } else {
      postRating = Math.max(RATING_FLOOR, Math.min(player.rating, postRating));
    }
    const effectiveDelta = postRating - player.rating;

    deltas.push({
      player_id: player.id,
      player_name: player.name ?? '',
      pre_rating: Number(player.rating.toFixed(2)),
      post_rating: Number(postRating.toFixed(2)),
      rating_delta: Number(effectiveDelta.toFixed(2)),
      pre_dubr: Number(ratingToDubr(player.rating).toFixed(3)),
      post_dubr: Number(ratingToDubr(postRating).toFixed(3)),
      dubr_delta: Number(ratingDeltaToDubrDelta(effectiveDelta).toFixed(3)),
      k_factor: Number(kFactor.toFixed(1)),
      is_provisional: player.matches_played + 1 < ESTABLISHED_MATCH_THRESHOLD,
      matches_played_after: player.matches_played + 1,
    });
  }

  // Team B updates
  for (const player of [b1, b2]) {
    const expectedWin = calculateExpectedWinProbability(player.rating, effectiveTeamA);
    const kFactor = calculateKFactor(player.matches_played);
    const rawDelta = kFactor * formatMultiplier * movMultiplier * (scoreB - expectedWin);

    // Non-inversion invariant enforcement
    let postRating = player.rating + rawDelta;
    if (!teamAWon) {
      postRating = Math.max(player.rating, postRating);
    } else {
      postRating = Math.max(RATING_FLOOR, Math.min(player.rating, postRating));
    }
    const effectiveDelta = postRating - player.rating;

    deltas.push({
      player_id: player.id,
      player_name: player.name ?? '',
      pre_rating: Number(player.rating.toFixed(2)),
      post_rating: Number(postRating.toFixed(2)),
      rating_delta: Number(effectiveDelta.toFixed(2)),
      pre_dubr: Number(ratingToDubr(player.rating).toFixed(3)),
      post_dubr: Number(ratingToDubr(postRating).toFixed(3)),
      dubr_delta: Number(ratingDeltaToDubrDelta(effectiveDelta).toFixed(3)),
      k_factor: Number(kFactor.toFixed(1)),
      is_provisional: player.matches_played + 1 < ESTABLISHED_MATCH_THRESHOLD,
      matches_played_after: player.matches_played + 1,
    });
  }

  return deltas;
}

/**
 * Computes individual DUBR rating adjustments for a singles match adhering to all invariants in ADR 0002.
 */
export function calculateSinglesMatchDeltas(
  playerA: MatchParticipant,
  playerB: MatchParticipant,
  setsScores: [number, number][],
  format: MatchFormat = 'SINGLE_21'
): [PlayerRatingDelta, PlayerRatingDelta] {
  if (playerA.id === playerB.id) {
    throw new Error('Singles match requires 2 distinct players');
  }
  if (setsScores.length === 0) {
    throw new Error('Match must have at least one set score');
  }

  for (const [sa, sb] of setsScores) {
    if (sa < 0 || sb < 0) {
      throw new Error(`Set scores must be non-negative, got (${sa}, ${sb})`);
    }
  }

  const totalMatchPoints = setsScores.reduce((sum, [sa, sb]) => sum + sa + sb, 0);
  if (totalMatchPoints < MIN_POINTS_FOR_RATING) {
    const voidDeltaA: PlayerRatingDelta = {
      player_id: playerA.id,
      player_name: playerA.name ?? '',
      pre_rating: Number(playerA.rating.toFixed(2)),
      post_rating: Number(playerA.rating.toFixed(2)),
      rating_delta: 0.0,
      pre_dubr: Number(ratingToDubr(playerA.rating).toFixed(3)),
      post_dubr: Number(ratingToDubr(playerA.rating).toFixed(3)),
      dubr_delta: 0.0,
      k_factor: Number(calculateKFactor(playerA.matches_played).toFixed(1)),
      is_provisional: playerA.matches_played < ESTABLISHED_MATCH_THRESHOLD,
      matches_played_after: playerA.matches_played,
    };
    const voidDeltaB: PlayerRatingDelta = {
      player_id: playerB.id,
      player_name: playerB.name ?? '',
      pre_rating: Number(playerB.rating.toFixed(2)),
      post_rating: Number(playerB.rating.toFixed(2)),
      rating_delta: 0.0,
      pre_dubr: Number(ratingToDubr(playerB.rating).toFixed(3)),
      post_dubr: Number(ratingToDubr(playerB.rating).toFixed(3)),
      dubr_delta: 0.0,
      k_factor: Number(calculateKFactor(playerB.matches_played).toFixed(1)),
      is_provisional: playerB.matches_played < ESTABLISHED_MATCH_THRESHOLD,
      matches_played_after: playerB.matches_played,
    };
    return [voidDeltaA, voidDeltaB];
  }

  for (const [sa, sb] of setsScores) {
    if (sa === sb) {
      throw new Error(`Individual set score cannot be tied: got (${sa}, ${sb})`);
    }
  }

  const playerAWonSets = setsScores.filter(([sa, sb]) => sa > sb).length;
  const playerBWonSets = setsScores.filter(([sa, sb]) => sb > sa).length;

  if (playerAWonSets === playerBWonSets) {
    throw new Error('Match cannot end in a tie');
  }

  const playerAWon = playerAWonSets > playerBWonSets;
  const totalPtsA = setsScores.reduce((sum, [sa]) => sum + sa, 0);
  const totalPtsB = setsScores.reduce((sum, [, sb]) => sum + sb, 0);
  const gamesPlayed = setsScores.length;

  const ptsWinner = playerAWon ? totalPtsA : totalPtsB;
  const ptsLoser = playerAWon ? totalPtsB : totalPtsA;
  const ratingDiffWinLose = playerAWon
    ? playerA.rating - playerB.rating
    : playerB.rating - playerA.rating;

  const movMultiplier = calculateMarginOfVictoryMultiplier(
    ptsWinner,
    ptsLoser,
    gamesPlayed,
    ratingDiffWinLose
  );
  const formatMultiplier = getFormatWeight(format);

  const scoreA = playerAWon ? 1.0 : 0.0;
  const scoreB = playerAWon ? 0.0 : 1.0;

  const expWinA = calculateExpectedWinProbability(playerA.rating, playerB.rating);
  const expWinB = 1.0 - expWinA;

  const kA = calculateKFactor(playerA.matches_played);
  const kB = calculateKFactor(playerB.matches_played);

  const rawDeltaA = kA * formatMultiplier * movMultiplier * (scoreA - expWinA);
  const rawDeltaB = kB * formatMultiplier * movMultiplier * (scoreB - expWinB);

  let postRatingA = playerA.rating + rawDeltaA;
  if (playerAWon) {
    postRatingA = Math.max(playerA.rating, postRatingA);
  } else {
    postRatingA = Math.max(RATING_FLOOR, Math.min(playerA.rating, postRatingA));
  }
  const effectiveDeltaA = postRatingA - playerA.rating;

  let postRatingB = playerB.rating + rawDeltaB;
  if (!playerAWon) {
    postRatingB = Math.max(playerB.rating, postRatingB);
  } else {
    postRatingB = Math.max(RATING_FLOOR, Math.min(playerB.rating, postRatingB));
  }
  const effectiveDeltaB = postRatingB - playerB.rating;

  const deltaA: PlayerRatingDelta = {
    player_id: playerA.id,
    player_name: playerA.name ?? '',
    pre_rating: Number(playerA.rating.toFixed(2)),
    post_rating: Number(postRatingA.toFixed(2)),
    rating_delta: Number(effectiveDeltaA.toFixed(2)),
    pre_dubr: Number(ratingToDubr(playerA.rating).toFixed(3)),
    post_dubr: Number(ratingToDubr(postRatingA).toFixed(3)),
    dubr_delta: Number(ratingDeltaToDubrDelta(effectiveDeltaA).toFixed(3)),
    k_factor: Number(kA.toFixed(1)),
    is_provisional: playerA.matches_played + 1 < ESTABLISHED_MATCH_THRESHOLD,
    matches_played_after: playerA.matches_played + 1,
  };

  const deltaB: PlayerRatingDelta = {
    player_id: playerB.id,
    player_name: playerB.name ?? '',
    pre_rating: Number(playerB.rating.toFixed(2)),
    post_rating: Number(postRatingB.toFixed(2)),
    rating_delta: Number(effectiveDeltaB.toFixed(2)),
    pre_dubr: Number(ratingToDubr(playerB.rating).toFixed(3)),
    post_dubr: Number(ratingToDubr(postRatingB).toFixed(3)),
    dubr_delta: Number(ratingDeltaToDubrDelta(effectiveDeltaB).toFixed(3)),
    k_factor: Number(kB.toFixed(1)),
    is_provisional: playerB.matches_played + 1 < ESTABLISHED_MATCH_THRESHOLD,
    matches_played_after: playerB.matches_played + 1,
  };

  return [deltaA, deltaB];
}

