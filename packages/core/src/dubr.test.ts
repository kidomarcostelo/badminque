import { describe, expect, it } from 'vitest';
import {
  calculateDoublesMatchDeltas,
  calculateExpectedWinProbability,
  calculateKFactor,
  calculateMarginOfVictoryMultiplier,
  calculateSinglesMatchDeltas,
  calculateWeakLinkSoftMean,
  dubrToRating,
  formatDubr,
  formatDubrDelta,
  ratingDeltaToDubrDelta,
  ratingToDubr,
  DEFAULT_SKILL_TIER,
  DUBR_BASE_RATING,
  DUBR_DIVISOR,
  DUBR_SCALE_MAX,
  DUBR_SCALE_MIN,
  TIER_ANCHORS,
  getTierDubr,
  getTierRating,
  isProvisional,
} from './dubr';

describe('DUBR Mathematical Scale and Formatting', () => {
  it('maps rating to 2.000–7.000 decimal DUBR per ADR 0002 formula', () => {
    expect(DUBR_BASE_RATING).toBe(800.0);
    expect(DUBR_DIVISOR).toBe(400.0);
    expect(DUBR_SCALE_MIN).toBe(2.0);
    expect(DUBR_SCALE_MAX).toBe(7.0);

    // DUBR = 2.000 + (R - 800) / 400
    expect(ratingToDubr(800.0)).toBe(2.0);
    expect(ratingToDubr(1000.0)).toBe(2.5);
    expect(ratingToDubr(1500.0)).toBe(3.75);
    expect(ratingToDubr(2800.0)).toBe(7.0);
  });

  it('inverts DUBR back to logistic rating scale', () => {
    expect(dubrToRating(2.0)).toBe(800.0);
    expect(dubrToRating(2.5)).toBe(1000.0);
    expect(dubrToRating(3.75)).toBe(1500.0);
    expect(dubrToRating(7.0)).toBe(2800.0);
  });

  it('scales rating deltas to Delta DUBR correctly', () => {
    // Delta DUBR = Delta R / 400
    expect(ratingDeltaToDubrDelta(34.0)).toBeCloseTo(0.085, 3);
    expect(ratingDeltaToDubrDelta(-24.0)).toBeCloseTo(-0.060, 3);
    expect(ratingDeltaToDubrDelta(0.0)).toBe(0.0);
  });

  it('formats DUBR to 3 decimal places', () => {
    expect(formatDubr(3.5)).toBe('3.500');
    expect(formatDubr(3.75)).toBe('3.750');
    expect(formatDubr(2.0)).toBe('2.000');
    expect(formatDubr(7.0)).toBe('7.000');
  });

  it('formats Delta DUBR with explicit sign and 3 decimal places', () => {
    expect(formatDubrDelta(0.085)).toBe('+0.085');
    expect(formatDubrDelta(-0.060)).toBe('-0.060');
    expect(formatDubrDelta(0.0)).toBe('+0.000');
  });
});

describe('DUBR Doubles Rating Invariants & Match Calculation', () => {
  it('calculates weak-link soft mean giving 58% weight to weaker partner', () => {
    const higher = 1800.0;
    const lower = 1400.0;
    // R_team = (1800 + 1400)/2 - 0.08 * (1800 - 1400) = 1600 - 32 = 1568
    // 0.42 * 1800 + 0.58 * 1400 = 756 + 812 = 1568
    const teamRating = calculateWeakLinkSoftMean(higher, lower);
    expect(teamRating).toBe(1568.0);
  });

  it('calculates expected win probability under standard logistic model', () => {
    // Equal ratings -> 50%
    expect(calculateExpectedWinProbability(1500.0, 1500.0)).toBe(0.5);
    // Higher rating -> > 50%
    expect(calculateExpectedWinProbability(1600.0, 1500.0)).toBeGreaterThan(0.5);
    // Lower rating -> < 50%
    expect(calculateExpectedWinProbability(1400.0, 1500.0)).toBeLessThan(0.5);
  });

  it('calculates continuous K-factor decay from 64 down to 16', () => {
    const kProvisional = calculateKFactor(0);
    const kEstablished = calculateKFactor(15);
    expect(kProvisional).toBe(64.0);
    expect(kEstablished).toBeLessThan(25.0);
    expect(kEstablished).toBeGreaterThanOrEqual(16.0);
  });

  it('calculates logarithmic MOV multiplier bounded between 0.50 and 1.75', () => {
    // Tight 21-19
    const movClose = calculateMarginOfVictoryMultiplier(21, 19, 1, 0.0);
    expect(movClose).toBeGreaterThanOrEqual(0.50);
    expect(movClose).toBeLessThan(1.0);

    // Blowout 21-5
    const movBlowout = calculateMarginOfVictoryMultiplier(21, 5, 1, 0.0);
    expect(movBlowout).toBeGreaterThan(1.3);
    expect(movBlowout).toBeLessThanOrEqual(1.75);
  });

  it('calculates doubles match deltas upholding non-inversion invariant', () => {
    const teamA = [
      { id: 'a1', name: 'Player A1', rating: 1500.0, matches_played: 15 },
      { id: 'a2', name: 'Player A2', rating: 1500.0, matches_played: 15 },
    ];
    const teamB = [
      { id: 'b1', name: 'Player B1', rating: 1500.0, matches_played: 15 },
      { id: 'b2', name: 'Player B2', rating: 1500.0, matches_played: 15 },
    ];

    const deltas = calculateDoublesMatchDeltas(
      teamA,
      teamB,
      [[21, 19]],
      'SINGLE_21'
    );

    expect(deltas).toHaveLength(4);

    // Winners (Team A) must have Delta >= 0
    const deltaA1 = deltas.find((d) => d.player_id === 'a1');
    const deltaA2 = deltas.find((d) => d.player_id === 'a2');
    expect(deltaA1?.rating_delta).toBeGreaterThan(0);
    expect(deltaA1?.dubr_delta).toBeGreaterThan(0);
    expect(deltaA2?.rating_delta).toBeGreaterThan(0);
    expect(deltaA2?.dubr_delta).toBeGreaterThan(0);

    // Losers (Team B) must have Delta <= 0
    const deltaB1 = deltas.find((d) => d.player_id === 'b1');
    const deltaB2 = deltas.find((d) => d.player_id === 'b2');
    expect(deltaB1?.rating_delta).toBeLessThan(0);
    expect(deltaB1?.dubr_delta).toBeLessThan(0);
    expect(deltaB2?.rating_delta).toBeLessThan(0);
    expect(deltaB2?.dubr_delta).toBeLessThan(0);
  });

  it('calibrates provisional players (K=64) with larger deltas than established players', () => {
    const provisionalTeamA = [
      { id: 'p1', name: 'Prov 1', rating: 1500.0, matches_played: 0 },
      { id: 'p2', name: 'Prov 2', rating: 1500.0, matches_played: 0 },
    ];
    const establishedTeamB = [
      { id: 'e1', name: 'Est 1', rating: 1500.0, matches_played: 20 },
      { id: 'e2', name: 'Est 2', rating: 1500.0, matches_played: 20 },
    ];

    const deltas = calculateDoublesMatchDeltas(
      provisionalTeamA,
      establishedTeamB,
      [[21, 15]],
      'SINGLE_21'
    );

    const deltaProv = deltas.find((d) => d.player_id === 'p1');
    const deltaEst = deltas.find((d) => d.player_id === 'e1');

    expect(deltaProv?.is_provisional).toBe(true);
    expect(deltaEst?.is_provisional).toBe(false);
    expect(Math.abs(deltaProv?.dubr_delta ?? 0)).toBeGreaterThan(
      Math.abs(deltaEst?.dubr_delta ?? 0)
    );
  });

  it('voids doubles matches with fewer than 11 points (delta=0, no match increment)', () => {
    const teamA = [
      { id: 'a1', name: 'Player A1', rating: 1500.0, matches_played: 2 },
      { id: 'a2', name: 'Player A2', rating: 1500.0, matches_played: 2 },
    ];
    const teamB = [
      { id: 'b1', name: 'Player B1', rating: 1500.0, matches_played: 2 },
      { id: 'b2', name: 'Player B2', rating: 1500.0, matches_played: 2 },
    ];

    // Total points 5 + 0 = 5 < 11
    const deltas = calculateDoublesMatchDeltas(teamA, teamB, [[5, 0]], 'SINGLE_21');
    expect(deltas).toHaveLength(4);
    for (const d of deltas) {
      expect(d.rating_delta).toBe(0);
      expect(d.dubr_delta).toBe(0);
      expect(d.post_rating).toBe(d.pre_rating);
      expect(d.matches_played_after).toBe(2); // not incremented
    }
  });

  it('rejects invalid doubles match inputs', () => {
    const teamA = [
      { id: 'p1', rating: 1500.0, matches_played: 0 },
      { id: 'p2', rating: 1500.0, matches_played: 0 },
    ];
    const teamB = [
      { id: 'p3', rating: 1500.0, matches_played: 0 },
      { id: 'p4', rating: 1500.0, matches_played: 0 },
    ];

    // Non-distinct players
    expect(() =>
      calculateDoublesMatchDeltas(
        [{ id: 'p1', rating: 1500, matches_played: 0 }, { id: 'p1', rating: 1500, matches_played: 0 }],
        teamB,
        [[21, 19]]
      )
    ).toThrow(/distinct/i);

    // Negative scores
    expect(() =>
      calculateDoublesMatchDeltas(teamA, teamB, [[-1, 21]])
    ).toThrow(/non-negative/i);

    // Tied set score
    expect(() =>
      calculateDoublesMatchDeltas(teamA, teamB, [[21, 21]])
    ).toThrow(/tied/i);
  });
});

describe('DUBR Singles Rating Match Calculation', () => {
  it('calculates singles match deltas upholding non-inversion invariant', () => {
    const playerA = { id: 's1', name: 'Singles A', rating: 1500.0, matches_played: 10 };
    const playerB = { id: 's2', name: 'Singles B', rating: 1500.0, matches_played: 10 };

    const [deltaA, deltaB] = calculateSinglesMatchDeltas(
      playerA,
      playerB,
      [[21, 15]],
      'SINGLE_21'
    );

    expect(deltaA.player_id).toBe('s1');
    expect(deltaA.rating_delta).toBeGreaterThan(0);
    expect(deltaA.dubr_delta).toBeGreaterThan(0);
    expect(deltaA.post_rating).toBeGreaterThan(deltaA.pre_rating);

    expect(deltaB.player_id).toBe('s2');
    expect(deltaB.rating_delta).toBeLessThan(0);
    expect(deltaB.dubr_delta).toBeLessThan(0);
    expect(deltaB.post_rating).toBeLessThan(deltaB.pre_rating);
  });

  it('voids singles matches with fewer than 11 points', () => {
    const playerA = { id: 's1', rating: 1500.0, matches_played: 3 };
    const playerB = { id: 's2', rating: 1500.0, matches_played: 3 };

    const [deltaA, deltaB] = calculateSinglesMatchDeltas(
      playerA,
      playerB,
      [[6, 2]],
      'SINGLE_21'
    );

    expect(deltaA.rating_delta).toBe(0);
    expect(deltaA.dubr_delta).toBe(0);
    expect(deltaA.matches_played_after).toBe(3);
    expect(deltaB.rating_delta).toBe(0);
    expect(deltaB.dubr_delta).toBe(0);
    expect(deltaB.matches_played_after).toBe(3);
  });

  it('rejects identical player IDs in singles match', () => {
    const playerA = { id: 'same-id', rating: 1500.0, matches_played: 0 };
    expect(() =>
      calculateSinglesMatchDeltas(playerA, playerA, [[21, 15]])
    ).toThrow(/distinct/i);
  });

  describe('SkillTier Cold-Start Anchors & Calibration', () => {
    it('provides 3-way tier anchors adhering to ADR 0002', () => {
      expect(DEFAULT_SKILL_TIER).toBe('INTERMEDIATE');

      // Beginner: 2.500 / 1000 rating
      expect(TIER_ANCHORS.BEGINNER.dubr).toBe(2.500);
      expect(TIER_ANCHORS.BEGINNER.rating).toBe(1000.0);
      expect(getTierRating('BEGINNER')).toBe(1000.0);
      expect(getTierDubr('BEGINNER')).toBe(2.500);
      expect(ratingToDubr(TIER_ANCHORS.BEGINNER.rating)).toBe(2.5);

      // Intermediate: 3.500 / 1400 rating [Default]
      expect(TIER_ANCHORS.INTERMEDIATE.dubr).toBe(3.500);
      expect(TIER_ANCHORS.INTERMEDIATE.rating).toBe(1400.0);
      expect(getTierRating('INTERMEDIATE')).toBe(1400.0);
      expect(getTierDubr('INTERMEDIATE')).toBe(3.500);
      expect(ratingToDubr(TIER_ANCHORS.INTERMEDIATE.rating)).toBe(3.5);

      // Advanced: 4.500 / 1800 rating
      expect(TIER_ANCHORS.ADVANCED.dubr).toBe(4.500);
      expect(TIER_ANCHORS.ADVANCED.rating).toBe(1800.0);
      expect(getTierRating('ADVANCED')).toBe(1800.0);
      expect(getTierDubr('ADVANCED')).toBe(4.500);
      expect(ratingToDubr(TIER_ANCHORS.ADVANCED.rating)).toBe(4.5);
    });

    it('correctly evaluates provisional calibration status under 8-match threshold', () => {
      expect(isProvisional(0)).toBe(true);
      expect(isProvisional(1)).toBe(true);
      expect(isProvisional(7)).toBe(true);
      expect(isProvisional(8)).toBe(false);
      expect(isProvisional(9)).toBe(false);
    });
  });
});

