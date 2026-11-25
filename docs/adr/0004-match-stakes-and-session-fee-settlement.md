# 0004. Voluntary Match Stakes & Zero-Sum Session Fee Settlement

Date: 2026-11-25  
Status: accepted  

## Context

In many recreational badminton clubs, players frequently arrange friendly side wagers on matches to elevate competitive intensity. Traditionally, these transactions are recorded manually on paper or whiteboards and settled at checkout against each player's club night venue/court fee (winners receive court fee discounts; losers pay additional fees).

However, introducing financial wagering into a club management application introduces legal, regulatory, and architectural challenges:
1. **App Store & Platform Compliance**: Apple App Store Guideline 5.3 and Google Play policies strictly prohibit unlicensed real-money gambling or casino mechanics. Software that facilitates house wagering or takes rake fees faces immediate suspension.
2. **Club Financial Neutrality**: Club organizers cannot act as a "house", take cuts, or absorb financial risk from player wagers.
3. **Data Integrity & Offline Dropouts**: Courtside stations operate offline in sports halls with intermittent connectivity. Mutable balance counters risk drifting or double-counting during sync retries.
4. **Rating Integrity**: DUBR ratings must represent pure badminton skill transparency and must never be distorted by money.

## Decision

We establish the **Match Stake & Session Fee Settlement** architecture for Badminque, governed by strict domain invariants:

1. **Ubiquitous Vocabulary**:
   - **Match Stake**: The voluntary, fixed per-player monetary or point amount agreed upon unanimously by all participating players on a court prior to match dispatch.
   - **Session Fee Ledger**: The running financial balance for a Roster Player during a Club Night session, comprising their base venue court fee plus/minus net Match Stake redistributions.
   - *Prohibited Language*: Terms such as *bet*, *gamble*, *pot*, *wager*, *tab*, or *debt sheet* are prohibited in code, API schemas, and UI copy.

2. **Strict Zero-Sum Club Escrow Invariant**:
   - For every staked match, the sum of ledger adjustments across all players on that court is strictly zero:
     $$\sum_{i \in \text{Players}} \Delta \text{Ledger}_i = 0$$
   - The club collects exactly the same aggregate court fee revenue regardless of match outcomes. The organizer acts purely as a neutral settlement agent at checkout.

3. **Symmetric Per-Player Doubles Allocation & Unanimous Consent**:
   - In doubles, the stake amount $S$ is per-player. If Team A defeats Team B with stake $S$:
     $$\Delta \text{Ledger}_{\text{Team A players}} = -S \quad (\text{fee discount})$$
     $$\Delta \text{Ledger}_{\text{Team B players}} = +S \quad (\text{fee addition})$$
   - Staking strictly requires 100% unanimous consent of all players on that court. If any player opts out, the match proceeds strictly as an un-staked rating match.

4. **Rating Independence Invariant**:
   - Match Stakes and DUBR rating algorithms are 100% mathematically isolated. Rating updates $\Delta R$ are calculated exclusively from scores, sets, MOV, and $K$-factor decay without any weighting or scaling from financial stakes.

5. **Deterministic Event-Sourced Ledger Fold**:
   - Balances are not stored as mutable, un-auditable counters. Instead, `MatchRecord` stores immutable `stake_amount: number | null` and `stake_currency: string | null`.
   - A player's session fee ledger balance is deterministically folded from session history:
     $$\text{Final Balance} = \text{Base Fee} + \sum_{m \in \text{Matches}} \Delta \text{Stake}_{m, \text{player}}$$
   - Idempotent offline batch sync (`ON CONFLICT (id) DO NOTHING`) guarantees that re-uploading matches can never double-credit or desynchronize player balances.

6. **Signed Net Balance & Club Policy Configuration**:
   - The ledger supports signed balances (positive = player owes organizer; negative = player is owed cash payout or credit).
   - Clubs can toggle an optional policy: `ALLOW_CASH_PAYOUTS` (default: net payouts permitted) vs `CAP_AT_ZERO_COURT_FEE` (discounts cannot exceed the base venue fee).

7. **Courtside Station UI Seams**:
   - **Match Dispatch**: 1-tap stake preset pill (`[No Stake]`, `[⚡ ₱50 (Default)]`, `[Custom]`) on `CourtStationCard` and `CustomMatchModal`.
   - **Quick Score Entry**: Live fee redistribution preview on `QuickScoreModal` before score confirmation.
   - **Checkout Mode**: Dedicated Excel-dense settlement table in the bench roster pane displaying Base Fee, Staked W/L, Stake Delta, Final Net Due, and a 1-tap "Mark Settled" checkbox.

8. **Player Auditability**:
   - Staked matches display a discreet `⚡ Staked` indicator in `MatchHistoryView`.
   - Player Passports and Claim Token views include an itemized breakdown of base court fees and match stake deltas.

## Considered Options

- **Direct Peer-to-Peer Cash / Digital Wallets**: Rejected. Requires third-party payment gateways, merchant KYC, payment processing fees, and exposes the app to gambling operator licensing.
- **Mutable Running Balance Column on Player Profile**: Rejected. Susceptible to drift, double-counting during offline batch retries, and lacks audit trails.
- **Organizer House Rake (Percentage Fee)**: Rejected. Violates Apple/Google gambling guidelines and alters the club's non-profit / court-rental business model.

## Consequences

- Casual clubs have a structured, error-free mechanism to track informal match stakes against court fees without paper whiteboards.
- Full offline courtside operation is preserved with zero sync drift.
- Badminque maintains full compliance with app store guidelines and sports integrity standards.
