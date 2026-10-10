# Badminton Rating Algorithm Specification for Singles and Doubles

**Status**: Proposed  
**Date**: 2026-10-10  
**Context**: Badminque MVP — Club-First Badminton Rating App  
**Related Documents**: `GLOSSARY.md`, `docs/adr/0001-tech-stack-decision.md`  

---

## 1. Executive Summary & Goals

Badminque delivers universal skill transparency for recreational badminton communities. In a typical **Club Night**, an **Organizer** enters match scores on a courtside tablet operating under an offline-first PWA architecture (ADR 0001). Match formats frequently alternate between **Single Game to 21** (to clear congested court queues) and **Best-of-3 Games to 21** (standard BWF format), with games capped at 30 points.

To provide accurate matchmaking and ladder progression, Badminque requires a mathematically rigorous rating engine that:
1. **Differentiates Disciplines**: Maintains independent **Singles Ratings** ($R_S$) and **Doubles Ratings** ($R_D$) per player, as singles endurance and court coverage do not directly translate to doubles frontcourt interception and flat drive speed.
2. **Values Margin of Victory**: Appropriately distinguishes between a nail-biting 21-19 overtime deuce and a dominant 21-5 blowout.
3. **Reflects Doubles Tactical Reality**: Accounts for the "hunting the weak link" phenomenon in badminton doubles, where opponents exploit the lower-rated partner on defense and serve reception.
4. **Protects Competitive Integrity (The Non-Inversion Invariant)**: Ensures a match winner never loses rating points ($\Delta R \ge 0$), eliminating the demoralizing paradox seen in naive point-share systems.
5. **Accelerates Calibration**: Swiftly calibrates provisional newcomers ($K=64$) over their first 6–8 matches while providing stable, confidence-bounded ratings for established veterans ($K=16$).
6. **Maintains Zero-Cost Architectural Alignment**: Computes deterministically in $O(1)$ time per match without external mathematical solver services, allowing offline preview computation on tablets and batch reconciliation in Python FastAPI.

---

## 2. Review of Existing Sports Rating Models

| Rating Model | Primary Domain | Core Mechanism | Strengths | Fatal Flaws for Recreational Badminton |
| :--- | :--- | :--- | :--- | :--- |
| **Standard Elo** (FIDE) | Chess | Logistic win probability $E = \frac{1}{1 + 10^{\Delta R / 400}}$, binary outcome ($S \in \{0, 0.5, 1\}$). | Simple, interpretable, zero-sum conservation. | Discards point differentials; a 21-19 deuce yields identical delta to a 21-2 blowout. No doubles support. |
| **Glicko / Glicko-2** | Chess, Online Gaming | Adds Rating Deviation ($RD$) and Volatility ($\sigma$). Dynamic period batch updating. | Robust uncertainty tracking; 95% confidence intervals. | Inherently batch/period-oriented; does not natively account for within-set point spreads. |
| **DUPR** | Pickleball | Modified Elo with score-differential weighting, arithmetic team averaging, half-life decay. | Gold standard in recreational paddle sports; rewards decisive point margins. | Proprietary; pure point-share models can penalize a match winner if point margin underperforms expectation. |
| **UBR** | Badminton | Elo-anchored expected points model, letter flights (A: 7500+, B: 7000+, C: 6500+, D: 6000+, E: 5500+). | Badminton-specific; separate singles and doubles tracks. | Lacks published formal open-source specification; relies on proprietary central server. |

---

## 3. Mathematical Rating Specification for Badminque

### 3.1 Player Rating State Representation
For each player $i$ and discipline $d \in \{\text{singles}, \text{doubles}\}$, the rating state is a 4-tuple:
$$\mathbf{S}_{i, d} = \langle R_{i, d}, \; RD_{i, d}, \; N_{i, d}, \; t_{last} \rangle$$

- $R_{i, d} \in \mathbb{R}^+$: Numerical rating (baseline default $R_0 = 1500.0$).
- $RD_{i, d} \in \mathbb{R}^+$: Rating Deviation / uncertainty (initial $RD_0 = 350.0$, minimum $RD_{min} = 40.0$).
- $N_{i, d} \in \mathbb{N}_0$: Verified match count (initial $N_0 = 0$).
- $t_{last} \in \text{Timestamp}$: Timestamp of most recent match.

A player is designated **Provisional** if $N_{i, d} < 8$ or $RD_{i, d} > 100.0$.  
The 95% Confidence Interval is defined as:
$$CI_{95\%} = [R_{i, d} - 1.96 \cdot RD_{i, d}, \; R_{i, d} + 1.96 \cdot RD_{i, d}]$$

---

### 3.2 Singles Rating Update Model
For a singles match between Player A and Player B:
1. **Expected Win Probability**:
   $$E_A = \frac{1}{1 + 10^{(R_B - R_A) / 400.0}}$$
   $$E_B = 1.0 - E_A$$

2. **Match Result**:
   $$S_A = \begin{cases} 1.0 & \text{if Player A wins the match} \\ 0.0 & \text{if Player B wins the match} \end{cases}$$

3. **Rating Adjustments**:
   $$\Delta R_A = K(N_A) \cdot W_{format} \cdot M(MOV_{eff}, R_A - R_B) \cdot (S_A - E_A)$$
   $$\Delta R_B = K(N_B) \cdot W_{format} \cdot M(MOV_{eff}, R_B - R_A) \cdot (S_B - E_B)$$

---

### 3.3 Doubles Rating Update Model

#### 3.3.1 Tactical Reality: The "Hunting the Weak Link" Phenomenon
In badminton doubles, players cannot cover the 6.1m court independently. In defensive smash defense, partners stand side-by-side; during serving and receiving, each partner must receive 50% of serves. Competitive opponents actively isolate and attack the weaker partner. Consequently, an unbalanced pair (e.g. 1900 + 1100) performs significantly worse than the arithmetic average of 1500.

#### 3.3.2 Weak-Link Soft Mean Team Rating ($R_{team}$)
- **Why not Harmonic Mean?** The harmonic mean $H = \frac{2 R_1 R_2}{R_1 + R_2}$ is non-linear and not affine-invariant: shifting the arbitrary Elo origin (e.g. $+1000$) alters the penalty magnitude.
- **The Badminque Formulation**:
  Let $R_{high} = \max(R_1, R_2)$ and $R_{low} = \min(R_1, R_2)$.
  The effective team rating is:
  $$R_{team} = \frac{R_1 + R_2}{2} - \gamma \cdot (R_{high} - R_{low}) = (0.5 - \gamma) R_{high} + (0.5 + \gamma) R_{low}$$
  where $\gamma = 0.08$ is the **Weak-Link Sensitivity Parameter**.
  This assigns **58% weight to the weaker partner** and **42% weight to the stronger partner**.
  - **Affine Invariance**: $R_{team}(R_1 + c, R_2 + c) = R_{team}(R_1, R_2) + c$.
  - **Symmetry & Monotonicity**: Increasing either player's rating strictly increases $R_{team}$.

#### 3.3.3 Team Win Expectation
For Pair A ($A_1, A_2$) vs Pair B ($B_1, B_2$):
$$E_{team, A} = \frac{1}{1 + 10^{(R_{team, B} - R_{team, A}) / 400.0}}$$

#### 3.3.4 Individual Contribution-Weighted Allocation
To prevent high-rated players from artificially boosting by carrying weak partners (or beginners being unduly crushed for losing with a weak partner), each player's individual update evaluates their skill against the opposing team's effective rating:
$$E_{A1} = \frac{1}{1 + 10^{(R_{team, B} - R_{A1}) / 400.0}}$$
$$E_{A2} = \frac{1}{1 + 10^{(R_{team, B} - R_{A2}) / 400.0}}$$

Then:
$$\Delta R_{A1} = K(N_{A1}) \cdot W_{format} \cdot M \cdot (S_A - E_{A1})$$
$$\Delta R_{A2} = K(N_{A2}) \cdot W_{format} \cdot M \cdot (S_A - E_{A2})$$

*Result*: If Team A wins, the lower-rated partner who outperformed expectations against Team B earns a substantial reward, while the high-rated partner earns a modest increment.

---

### 3.4 Margin of Victory (MOV) Normalization

#### 3.4.1 Effective Game Margin ($MOV_{eff}$)
Let $P_{win}$ and $P_{lose}$ be total match points won and lost across $G$ games played ($G \in \{1, 2, 3\}$).
$$MOV_{eff} = \max\left(1.0, \; \frac{P_{win} - P_{lose}}{G}\right)$$
Dividing by $G$ normalizes the score scale: a single game 21-5 has $MOV_{eff} = 16.0$, identical to a two-set sweep of 21-5, 21-5 ($32 / 2 = 16.0$).

#### 3.4.2 Bounded Logarithmic Multiplier with Favorite-Damping
$$M(MOV_{eff}, \Delta R) = \text{clamp}\left( \left( \frac{\ln(MOV_{eff} + 1)}{\ln(8.0)} \right) \cdot \left( \frac{1 + \delta}{1 + \delta \cdot 10^{\Delta R / 400.0}} \right), \; M_{min}, \; M_{max} \right)$$
- Denominator $\ln(8.0) = \ln(7 + 1) \approx 2.0794$ calibrates a median 7-point victory (21-14) to $1.00$.
- Damping parameter $\delta = 0.5$ dampens blowout bonuses when an overwhelming favorite ($\Delta R > 0$) executes an expected blowout.
- Underdogs ($\Delta R < 0$) who achieve blowouts are amplified up to $M_{max} = 1.75$.
- Tight games (21-19, $MOV_{eff} = 2$) are dampened to $M \approx 0.53$.
- Clamping bounds: $M_{min} = 0.50$, $M_{max} = 1.75$.

#### 3.4.3 Format Weight ($W_{format}$)
$$W_{format} = \begin{cases} 1.00 & \text{Single Game to 21 (1x21)} \\ 1.25 & \text{Best-of-3 Games to 21 (3x21)} \end{cases}$$

---

### 3.5 Dynamic Volatility & K-Factor Scaling

#### 3.5.1 Continuous K-Factor Decay Curve
$$K(N) = K_{min} + (K_{max} - K_{min}) \cdot e^{-\lambda N}$$
- $K_{max} = 64.0$ (provisional agility)
- $K_{min} = 16.0$ (veteran stability)
- Half-life $H = 6$ matches: $\lambda = \frac{\ln(2)}{6} \approx 0.1155$.
- At $N=0$: $K=64.0$; at $N=6$: $K=40.0$; at $N=15$: $K=24.5$; at $N \ge 30$: $K \approx 16.0$.

#### 3.5.2 Rating Deviation Decay & Inactivity Inflation
$$RD(N) = RD_{min} + (RD_0 - RD_{min}) \cdot e^{-\lambda N}$$
- $RD_0 = 350.0$, $RD_{min} = 40.0$.
- Established threshold: $N \ge 8$ matches ($RD \le 100.0$).
- **Inactivity Inflation**: If a player is inactive for more than 30 days:
  $$RD_{active} = \min\left(350.0, \; \sqrt{RD^2 + c^2 \cdot \left(\frac{\Delta t_{days} - 30}{30}\right)}\right)$$
  where $c = 25.0$.

---

## 4. Complete Python Reference Implementation

```python
"""
Badminque Rating Engine Reference Implementation.
Zero-dependency, fully typed, production-ready rating calculation module.
"""

from __future__ import annotations
import math
from dataclasses import dataclass
from enum import Enum
from typing import List, Tuple, Optional


class MatchFormat(str, Enum):
    SINGLE_21 = "SINGLE_21"   # 1 game to 21
    BEST_OF_3 = "BEST_OF_3"   # Best of 3 to 21


@dataclass
class PlayerRatingState:
    player_id: str
    name: str
    rating: float = 1500.0
    rd: float = 350.0
    matches_played: int = 0

    @property
    def is_provisional(self) -> bool:
        return self.matches_played < 8 or self.rd > 100.0

    @property
    def confidence_interval(self) -> Tuple[float, float]:
        margin = 1.96 * self.rd
        return (round(self.rating - margin, 1), round(self.rating + margin, 1))


@dataclass
class RatingDeltaResult:
    player_id: str
    pre_rating: float
    post_rating: float
    rating_delta: float
    k_factor: float
    rd_after: float
    is_provisional: bool


class BadminqueRatingEngine:
    # Mathematical Constants
    K_MAX: float = 64.0
    K_MIN: float = 16.0
    K_HALF_LIFE: float = 6.0
    RD_INITIAL: float = 350.0
    RD_MIN: float = 40.0
    WEAK_LINK_GAMMA: float = 0.08
    M_MIN: float = 0.50
    M_MAX: float = 1.75
    FAVORITE_DAMPING: float = 0.50
    INACTIVITY_C: float = 25.0

    @classmethod
    def calculate_k_factor(cls, matches_played: int) -> float:
        decay_constant = math.log(2.0) / cls.K_HALF_LIFE
        return cls.K_MIN + (cls.K_MAX - cls.K_MIN) * math.exp(-decay_constant * matches_played)

    @classmethod
    def calculate_rd(cls, matches_played: int) -> float:
        decay_constant = math.log(2.0) / cls.K_HALF_LIFE
        return cls.RD_MIN + (cls.RD_INITIAL - cls.RD_MIN) * math.exp(-decay_constant * matches_played)

    @classmethod
    def apply_inactivity(cls, current_rd: float, days_inactive: int) -> float:
        if days_inactive <= 30:
            return current_rd
        months_over = (days_inactive - 30) / 30.0
        inflated_rd = math.sqrt(current_rd ** 2 + (cls.INACTIVITY_C ** 2) * months_over)
        return min(cls.RD_INITIAL, inflated_rd)

    @classmethod
    def expected_win_probability(cls, player_rating: float, opponent_rating: float) -> float:
        return 1.0 / (1.0 + 10.0 ** ((opponent_rating - player_rating) / 400.0))

    @classmethod
    def effective_doubles_team_rating(cls, r1: float, r2: float) -> float:
        r_high = max(r1, r2)
        r_low = min(r1, r2)
        return 0.5 * (r1 + r2) - cls.WEAK_LINK_GAMMA * (r_high - r_low)

    @classmethod
    def margin_of_victory_multiplier(
        cls,
        points_winner: int,
        points_loser: int,
        games_played: int,
        rating_diff_winner_minus_loser: float,
    ) -> float:
        mov_eff = max(1.0, (points_winner - points_loser) / float(games_played))
        log_factor = math.log(mov_eff + 1.0) / math.log(8.0)
        damping = (1.0 + cls.FAVORITE_DAMPING) / (
            1.0 + cls.FAVORITE_DAMPING * (10.0 ** (rating_diff_winner_minus_loser / 400.0))
        )
        raw_m = log_factor * damping
        return max(cls.M_MIN, min(cls.M_MAX, raw_m))

    @classmethod
    def format_weight(cls, match_format: MatchFormat) -> float:
        return 1.25 if match_format == MatchFormat.BEST_OF_3 else 1.00

    @classmethod
    def process_singles_match(
        cls,
        player_a: PlayerRatingState,
        player_b: PlayerRatingState,
        sets_scores: List[Tuple[int, int]],
        match_format: MatchFormat = MatchFormat.SINGLE_21,
    ) -> Tuple[RatingDeltaResult, RatingDeltaResult]:
        a_sets_won = sum(1 for sa, sb in sets_scores if sa > sb)
        b_sets_won = sum(1 for sa, sb in sets_scores if sb > sa)
        a_won_match = a_sets_won > b_sets_won

        total_pts_a = sum(sa for sa, _ in sets_scores)
        total_pts_b = sum(sb for _, sb in sets_scores)
        games_played = len(sets_scores)

        if a_won_match:
            pts_win, pts_lose = total_pts_a, total_pts_b
            rating_diff_win_lose = player_a.rating - player_b.rating
            s_a, s_b = 1.0, 0.0
        else:
            pts_win, pts_lose = total_pts_b, total_pts_a
            rating_diff_win_lose = player_b.rating - player_a.rating
            s_a, s_b = 0.0, 1.0

        m = cls.margin_of_victory_multiplier(pts_win, pts_lose, games_played, rating_diff_win_lose)
        w_fmt = cls.format_weight(match_format)

        e_a = cls.expected_win_probability(player_a.rating, player_b.rating)
        e_b = 1.0 - e_a

        k_a = cls.calculate_k_factor(player_a.matches_played)
        k_b = cls.calculate_k_factor(player_b.matches_played)

        delta_a = round(k_a * w_fmt * m * (s_a - e_a), 2)
        delta_b = round(k_b * w_fmt * m * (s_b - e_b), 2)

        res_a = RatingDeltaResult(
            player_id=player_a.player_id,
            pre_rating=player_a.rating,
            post_rating=round(player_a.rating + delta_a, 2),
            rating_delta=delta_a,
            k_factor=k_a,
            rd_after=round(cls.calculate_rd(player_a.matches_played + 1), 1),
            is_provisional=(player_a.matches_played + 1 < 8),
        )
        res_b = RatingDeltaResult(
            player_id=player_b.player_id,
            pre_rating=player_b.rating,
            post_rating=round(player_b.rating + delta_b, 2),
            rating_delta=delta_b,
            k_factor=k_b,
            rd_after=round(cls.calculate_rd(player_b.matches_played + 1), 1),
            is_provisional=(player_b.matches_played + 1 < 8),
        )
        return res_a, res_b

    @classmethod
    def process_doubles_match(
        cls,
        team_a: Tuple[PlayerRatingState, PlayerRatingState],
        team_b: Tuple[PlayerRatingState, PlayerRatingState],
        sets_scores: List[Tuple[int, int]],
        match_format: MatchFormat = MatchFormat.SINGLE_21,
    ) -> Tuple[List[RatingDeltaResult], List[RatingDeltaResult]]:
        a1, a2 = team_a
        b1, b2 = team_b

        eff_team_a = cls.effective_doubles_team_rating(a1.rating, a2.rating)
        eff_team_b = cls.effective_doubles_team_rating(b1.rating, b2.rating)

        a_sets_won = sum(1 for sa, sb in sets_scores if sa > sb)
        b_sets_won = sum(1 for sa, sb in sets_scores if sb > sa)
        team_a_won = a_sets_won > b_sets_won

        total_pts_a = sum(sa for sa, _ in sets_scores)
        total_pts_b = sum(sb for _, sb in sets_scores)
        games_played = len(sets_scores)

        if team_a_won:
            pts_win, pts_lose = total_pts_a, total_pts_b
            rating_diff_win_lose = eff_team_a - eff_team_b
            s_a, s_b = 1.0, 0.0
        else:
            pts_win, pts_lose = total_pts_b, total_pts_a
            rating_diff_win_lose = eff_team_b - eff_team_a
            s_a, s_b = 0.0, 1.0

        m = cls.margin_of_victory_multiplier(pts_win, pts_lose, games_played, rating_diff_win_lose)
        w_fmt = cls.format_weight(match_format)

        # Contribution-weighted individual updates
        results_a: List[RatingDeltaResult] = []
        for p in [a1, a2]:
            e_p = cls.expected_win_probability(p.rating, eff_team_b)
            k_p = cls.calculate_k_factor(p.matches_played)
            delta_p = round(k_p * w_fmt * m * (s_a - e_p), 2)
            results_a.append(
                RatingDeltaResult(
                    player_id=p.player_id,
                    pre_rating=p.rating,
                    post_rating=round(p.rating + delta_p, 2),
                    rating_delta=delta_p,
                    k_factor=k_p,
                    rd_after=round(cls.calculate_rd(p.matches_played + 1), 1),
                    is_provisional=(p.matches_played + 1 < 8),
                )
            )

        results_b: List[RatingDeltaResult] = []
        for p in [b1, b2]:
            e_p = cls.expected_win_probability(p.rating, eff_team_a)
            k_p = cls.calculate_k_factor(p.matches_played)
            delta_p = round(k_p * w_fmt * m * (s_b - e_p), 2)
            results_b.append(
                RatingDeltaResult(
                    player_id=p.player_id,
                    pre_rating=p.rating,
                    post_rating=round(p.rating + delta_p, 2),
                    rating_delta=delta_p,
                    k_factor=k_p,
                    rd_after=round(cls.calculate_rd(p.matches_played + 1), 1),
                    is_provisional=(p.matches_played + 1 < 8),
                )
            )

        return results_a, results_b
```

---

## 5. Numerical Test Cases & Empirical Validation

All test scenarios were evaluated using the reference implementation with $N=15$ ($K=24.5$, established status) unless noted otherwise.

### Scenario 1: Singles Evenly Matched Close Match (21-19)
- **Inputs**: Player A (1500) vs Player B (1500), Score: 21-19 (Single Game).
- **Expectation**: $E_A = 0.500$.
- **MOV Multiplier**: $M(2, 0) = 0.528$ (dampened due to 2-point deuce margin).
- **Rating Delta**:
  - Winner Player A: $+6.47$ points.
  - Loser Player B: $-6.47$ points.

### Scenario 2: Singles Evenly Matched Decisive Blowout (21-5)
- **Inputs**: Player A (1500) vs Player B (1500), Score: 21-5 (Single Game).
- **Expectation**: $E_A = 0.500$.
- **MOV Multiplier**: $M(16, 0) = 1.362$ (amplified by +36.2% for decisive blowout).
- **Rating Delta**:
  - Winner Player A: $+16.69$ points ($2.58\times$ greater than the 21-19 match).
  - Loser Player B: $-16.69$ points.

### Scenario 3: Singles Heavy Favorite Expected Blowout (21-3)
- **Inputs**: Player A (1800) vs Player B (1400), Score: 21-3 (Single Game).
- **Expectation**: $E_A = 0.909$.
- **MOV Multiplier**: $M(18, 400) = 0.500$ (damped to minimum bound because blowout was statistically predicted).
- **Rating Delta**:
  - Winner Player A: $+1.11$ points.
  - Loser Player B: $-1.11$ points.
- *Analysis*: Prevents top-seed rating inflation from expected recreational blowouts.

### Scenario 4: Singles Underdog Shock Upset (21-18)
- **Inputs**: Player A (1400) vs Player B (1800), Score: 21-18 (Single Game).
- **Expectation**: $E_A = 0.091$ (underdog).
- **MOV Multiplier**: $M(3, -400) = 0.952$.
- **Rating Delta**:
  - Winner Underdog A: $+21.20$ points.
  - Loser Favorite B: $-21.20$ points.

### Scenario 5: Doubles Unbalanced "Pro + Beginner" Pair vs Balanced Pair
- **Inputs**:
  - Team A: Player A1 (1800), Player A2 (1200). Skill gap = 600.
    - Effective Team A Rating: $\frac{1800 + 1200}{2} - 0.08 \times 600 = 1500 - 48 = \mathbf{1452.0}$.
  - Team B: Player B1 (1500), Player B2 (1500).
    - Effective Team B Rating: $\mathbf{1500.0}$.
- **Case 5A: Team A Wins 21-14**:
  - $MOV = 7$, $M = 1.088$.
  - Player A1 (1800 vs 1500 team): $E_{A1} = 0.849 \implies \Delta R_{A1} = \mathbf{+4.02}$ points.
  - Player A2 (1200 vs 1500 team): $E_{A2} = 0.151 \implies \Delta R_{A2} = \mathbf{+22.63}$ points.
  - Team B Players (1500 vs 1452 team): $E_{B} = 0.569 \implies \Delta R_{B1, B2} = \mathbf{-15.16}$ points each.
- **Case 5B: Team B Wins 21-14**:
  - $MOV = 7$, $M = 0.904$.
  - Player A1 (1800 failed to carry): $\Delta R_{A1} = \mathbf{-18.80}$ points.
  - Player A2 (1200 protected as underdog): $\Delta R_{A2} = \mathbf{-3.34}$ points.
  - Team B Players: $\Delta R_{B1, B2} = \mathbf{+9.55}$ points each.

### Scenario 6: Provisional Player Calibration Trajectory
A new unrated player ($R_0 = 1500$, $K=64$, $RD=350$) enters a club night and plays 8 consecutive matches against 1600-rated opponents, winning 21-14:

| Match | Pre-Rating | Opponent Rating | Pre-K | Pre-RD | Win Prob $E$ | Score | Delta $\Delta R$ | Post-Rating | Status |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| 1 | 1500.0 | 1600.0 | 64.0 | 350.0 | 0.360 | 21-14 | +48.0 | 1548.0 | Provisional |
| 2 | 1548.0 | 1600.0 | 58.8 | 316.2 | 0.426 | 21-14 | +36.9 | 1584.9 | Provisional |
| 3 | 1584.9 | 1600.0 | 54.1 | 286.0 | 0.478 | 21-14 | +29.0 | 1613.9 | Provisional |
| 4 | 1613.9 | 1600.0 | 49.9 | 259.2 | 0.520 | 21-14 | +23.3 | 1637.2 | Provisional |
| 5 | 1637.2 | 1600.0 | 46.2 | 235.3 | 0.553 | 21-14 | +19.1 | 1656.4 | Provisional |
| 6 | 1656.4 | 1600.0 | 42.9 | 214.0 | 0.580 | 21-14 | +16.0 | 1672.3 | Provisional |
| 7 | 1672.3 | 1600.0 | 40.0 | 195.0 | 0.603 | 21-14 | +13.6 | 1685.9 | Provisional |
| 8 | 1685.9 | 1600.0 | 37.4 | 178.1 | 0.621 | 21-14 | +11.7 | 1697.6 | **Established** |

*Analysis*: Over 8 matches, the newcomer smoothly converges by nearly 200 rating points to their accurate skill tier without overshooting or causing erratic ladder disruption.

---

## 6. Offline-First Synchronization & Architecture (ADR 0001)

1. **Chronological Batch Recomputation**:
   Matches recorded offline in IndexedDB on the club night tablet include a local timestamp and client sequence number. When synced to the FastAPI backend, the server executes a **deterministic chronological fold**:
   $$\mathbf{S}_{final} = \text{foldl}(\text{apply\_match}, \; \mathbf{S}_{initial}, \; \text{sort\_by\_timestamp}(\text{matches}))$$
2. **Optimistic Tablet Previews**:
   Because `BadminqueRatingEngine` is zero-dependency and computationally lightweight, the identical logic is implemented in TypeScript for the Next.js client, enabling instant courtside leaderboard feedback prior to internet sync.
3. **Idempotent Sync**:
   Every match log carries a UUID generated client-side. The database table `matches` enforces a unique constraint on `id`, ensuring re-syncing batches does not result in double-applied ratings.

---

## 7. Edge Cases & Anti-Gaming Rules

1. **Incomplete Matches & Mid-Match Retirements**:
   - If an injury occurs when fewer than 11 points have been played, the match is voided from rating calculations ($K=0$).
   - If 11 or more points have been completed and a player retires, the retiring side forfeits remaining points to 21 (e.g. at 14-12, score recorded as 21-12 in favor of the non-retiring side).
2. **Rating Floor**:
   An absolute rating floor is set at $R_{floor} = 800.0$. Ratings cannot drop below 800.0, preventing negative numbers or discouraging entry-level beginners.
3. **No Win-Loss Inversion**:
   Under no circumstances may a player's rating decrease following a victory, nor increase following a defeat. $M$ is strictly non-negative and $(S - E)$ determines the sign.
