/**
 * Core mathematical constants, game rule boundaries, and rating parameters.
 * Strictly adheres to CODING_STANDARDS.md and GLOSSARY.md.
 */

// Scoring & Game Thresholds
export const STANDARD_SET_WIN_SCORE = 21 as const;
export const OVERTIME_SET_CAP = 30 as const;
export const QUICK_SCORE_TARGET = 30 as const;

// Rating Algorithm Constants (docs/research/rating-algorithm-spec.md)
export const INITIAL_RATING_BASELINE = 1500.0 as const;
export const WEAK_LINK_GAMMA = 0.08 as const;
export const K_FACTOR_PROVISIONAL = 64.0 as const;
export const K_FACTOR_ESTABLISHED = 16.0 as const;
export const ESTABLISHED_MATCH_THRESHOLD = 8 as const;
export const MIN_MOV_MULTIPLIER = 0.50 as const;
export const MAX_MOV_MULTIPLIER = 1.75 as const;

// Token & Security Lifecycle
export const CLAIM_TOKEN_EXPIRATION_HOURS = 48 as const;

// Courtside Layout Constants
export const DEFAULT_COURT_COUNT = 3 as const;
export const ON_DECK_SLOT_COUNT = 3 as const;
