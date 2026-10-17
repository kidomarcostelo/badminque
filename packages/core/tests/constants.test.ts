import { describe, expect, it } from 'vitest';
import {
  CLAIM_TOKEN_EXPIRATION_HOURS,
  DEFAULT_COURT_COUNT,
  INITIAL_RATING_BASELINE,
  K_FACTOR_ESTABLISHED,
  K_FACTOR_PROVISIONAL,
  MAX_MOV_MULTIPLIER,
  MIN_MOV_MULTIPLIER,
  ON_DECK_SLOT_COUNT,
  OVERTIME_SET_CAP,
  QUICK_SCORE_TARGET,
  STANDARD_SET_WIN_SCORE,
  WEAK_LINK_GAMMA,
} from '../src/constants';

describe('Rating and Game Constants', () => {
  it('enforces score boundaries according to badminton rules', () => {
    expect(STANDARD_SET_WIN_SCORE).toBe(21);
    expect(OVERTIME_SET_CAP).toBe(30);
    expect(QUICK_SCORE_TARGET).toBe(30);
  });

  it('enforces rating mathematics parameters', () => {
    expect(INITIAL_RATING_BASELINE).toBe(1500.0);
    expect(WEAK_LINK_GAMMA).toBe(0.08);
    expect(K_FACTOR_PROVISIONAL).toBe(64.0);
    expect(K_FACTOR_ESTABLISHED).toBe(16.0);
    expect(MIN_MOV_MULTIPLIER).toBe(0.50);
    expect(MAX_MOV_MULTIPLIER).toBe(1.75);
  });

  it('enforces layout and security constants', () => {
    expect(CLAIM_TOKEN_EXPIRATION_HOURS).toBe(48);
    expect(DEFAULT_COURT_COUNT).toBe(3);
    expect(ON_DECK_SLOT_COUNT).toBe(3);
  });
});
