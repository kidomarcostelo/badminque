# 0002. Adoption of DUBR (Dynamic Universal Badminton Rating) Algorithm

Date: 2026-10-30  
Status: accepted

## Context

Badminque initially evaluated integrating with external rating systems like Universal Badminton Rating (UBR). However, UBR is an external, proprietary platform lacking a public developer API, data portability, or transparent mathematical contracts. Meanwhile, recreational badminton suffers from fragmented, club-specific grading systems with no universal skill transparency—analogous to pickleball before the widespread adoption of DUPR (Dynamic Universal Pickleball Rating).

## Decision

We establish **DUBR (Dynamic Universal Badminton Rating)** as Badminque's native, canonical rating standard and calculation engine. DUBR models the dynamic expected-score and margin-of-victory mechanics of DUPR while tailoring them to 21-point badminton rally scoring and strictly enforcing five domain invariants:

1. **Independent Disciplines**: Singles ($R_S$) and Doubles ($R_D$) ratings are maintained independently and never bleed into each other.
2. **Weak-Link Soft Mean**: In doubles, team rating is calculated giving 58% weight to the lower-rated partner and 42% to the higher-rated partner:
   $$R_{team} = \frac{R_1 + R_2}{2} - 0.08 \cdot |R_1 - R_2|$$
3. **Non-Inversion Invariant**: A match winner must never lose rating points ($\Delta R \ge 0$), and a match loser must never gain rating points ($\Delta R \le 0$).
4. **Logarithmic MOV Multiplier**: Victory margins scale logarithmically between $0.50$ (close 21-19) and $1.75$ (crushing blowout) with favorite damping.
5. **Continuous $K$-Factor Decay**: Dynamic $K$-factor scaling from provisional status ($K=64$) down to established status ($K=16$) over an 8-match decay threshold.
6. **Dual-Layer Scale Representation**: Internal calculations operate on a high-precision 800–2800 logistic scale, while the presentation layer and Player Passports expose a user-facing **2.000 to 7.000 decimal DUBR** (formatted to 3 decimal places, $\text{DUBR} = 2.000 + \frac{R - 800}{400}$).
7. **Cold-Start 1-Tap Tier Anchor**: Organizers can optionally assign an initial skill tier anchor when checking in unrated players (`Beginner: 2.500 / 1000 Elo`, `Intermediate: 3.500 / 1500 Elo [Default]`, `Advanced: 4.500 / 1900 Elo`), accelerating convergence to 1–2 matches.
8. **Provisional Status & Leaderboard Gating**: Players with fewer than 8 completed matches carry a `Provisional` status indicator and are excluded from official club leaderboards until reaching established status.
9. **Cross-Discipline Prior Seeding**: When an established player in one discipline (e.g. Doubles) plays their first match in the other (e.g. Singles), their starting rating is seeded from their established rating to avoid rookie-tier blowouts, while subsequent match updates remain 100% mathematically isolated.
10. **Player Passport Portability**: Organizers scanning a visitor's Player Passport QR code import their established DUBR ratings directly into the local session roster, preserving universal rating continuity across clubs.

## Considered Options

- **Third-Party Integration with UBR**: Rejected due to the lack of an official public API, zero control over algorithm modifications, and external platform risk.
- **Traditional Elo (Chess/FIDE)**: Rejected because binary win/loss Elo ignores the margin of victory (e.g. 21-19 vs 21-3), leading to slow convergence in recreational club play.
- **Glicko-2**: Evaluated for rating volatility tracking; rejected for core presentation because multi-parameter variance is less intuitive for recreational players than DUPR's expected-score model.

## Consequences

- Badminque owns full mathematical sovereignty over its rating engine with zero external API dependencies or costs.
- The rating engine operates deterministically as a pure, zero-dependency Python domain service with offline batch recomputation support.
- All documentation, API schemas, and client UI components standardize on DUBR.
