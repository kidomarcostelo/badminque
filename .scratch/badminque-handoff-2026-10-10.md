# Badminque Handoff: Courtside Queueing, Rotation & Matchmaking Engine

**Date**: 2026-10-10  
**Repository**: `/data/data/com.termux/files/home/repo/badminque`  
**GitHub**: [kidomarcostelo/badminque](https://github.com/kidomarcostelo/badminque)  
**Branch**: `main` (clean, up to date with `origin/main`)  

---

## 1. Executive Summary & Context

In this session, we initiated the second major planning epic for Badminque: the **Courtside Queueing, Rotation & Matchmaking Engine**.

Following interactive breadth-first grilling rounds with the user, we charted and structured a new Wayfinder Map on GitHub:
- **Map Issue**: [Map: Courtside Queueing, Rotation, and Matchmaking Engine](https://github.com/kidomarcostelo/badminque/issues/7)

The first AFK research ticket on this map was resolved and closed in this session:
- **Ticket #8**: [Research: Recreational Sports Queueing and Fair Rotation Algorithms](https://github.com/kidomarcostelo/badminque/issues/8)
- **Branch**: `research/queueing-rotation-algorithms`
- **Specification Document**: [`docs/research/queueing-rotation-algorithms.md`](https://github.com/kidomarcostelo/badminque/blob/research/queueing-rotation-algorithms/docs/research/queueing-rotation-algorithms.md)

---

## 2. Core Decisions & Domain Invariants Settled

1. **Doubles-First Scope**: The queueing engine is built **exclusively for Doubles** (4 players per court; 12 active players on court at any time). Singles is out of scope for this effort and deferred.
2. **Badminton Stamina Invariant**: Unlike lower-intensity sports (e.g. pickleball), badminton is high-cardio and stamina-heavy. **All 4 players must step off the court** upon match completion to rest and hydrate. Consecutive court-staying is strictly prohibited.
3. **Four Selectable Rotation Policies**:
   - **Fair Play Pegboard**: Strict FIFO queue ensuring equal match counts across all players.
   - **Split & Mix**: Winners ($W_1, W_2$) and losers ($L_1, L_2$) step off and return to the queue, but are strictly partitioned across the net in subsequent rounds to avoid dominant pair stacking.
   - **Court Ladder (Up-and-Down the River)**: Court 1 (King/Apex), Court 2 (Challenger), Court 3 (Base). Winners promote up; losers demote down, with mandatory partner splitting upon arrival. Uses asynchronous staggered buffers.
   - **Flighted Skill Tiers**: Partitioned queues or court dedication (e.g. Courts 1–2 for Upper-Intermediate, Court 3 for Beginners).
4. **Player Availability States**:
   - `Playing`: Currently in an active match on court.
   - `Queued`: In queue, accumulating wait time.
   - `Skipped`: 1-Match Skip breather. Retains head-of-queue priority for the subsequent court cycle.
   - `Resting`: Extended break. Pauses wait-time accumulation while preserving match count $M_i$.
5. **Locked Pair Invariant**: When an Organizer customizes/pins a pair, their queue entry position is strictly the **later of their two natural readiness positions**:
   $$\text{QueuePosition}(P_{\{a, b\}}) = \max(\text{QueuePosition}(a), \text{QueuePosition}(b))$$
   This prevents line-cutting.
6. **Reference Setup**: 3 badminton courts, typical club night roster of 16–28 players.
7. **Player Match Counter**: Displayed prominently courtside as core MVP. Pairing frequency heatmaps and historical matrix analytics are deferred to post-MVP.

---

## 3. Current Map State & Issue Tracker Status

- **Map Issue**: [Map: Courtside Queueing, Rotation, and Matchmaking Engine](https://github.com/kidomarcostelo/badminque/issues/7)
- **Children**:
  - [x] [#8 Research: Recreational Sports Queueing and Fair Rotation Algorithms](https://github.com/kidomarcostelo/badminque/issues/8) (Resolved & Closed)
  - [ ] [#9 Grilling: Rotation Policy State Machines and Court Transitions for 3-Court Badminton](https://github.com/kidomarcostelo/badminque/issues/9) (**Unblocked on Frontier**)
  - [ ] [#10 Grilling: Organizer Manual Override, Custom Pair Pinning, and Queue Backfill Edge Cases](https://github.com/kidomarcostelo/badminque/issues/10) (**Unblocked on Frontier**)
  - [ ] [#11 Prototype: Interactive Courtside Queue and Rotation Board](https://github.com/kidomarcostelo/badminque/issues/11) (🔒 **Blocked natively** by #9 and #10)

---

## 4. Suggested Skills for Next Agent

The next agent should invoke the following skills:
1. `wayfinder` (`/mattpocock-skills:wayfinder`): To inspect the map and follow the one-ticket-per-session resolution rule.
2. `grilling` (`/mattpocock-skills:grilling`): To conduct the HITL interview on Ticket #9.
3. `domain-modeling` (`/mattpocock-skills:domain-modeling`): To enforce canonical vocabulary from `GLOSSARY.md` (Organizer, Club Night, Roster, Match, Rating).
4. `prototype` (`/mattpocock-skills:prototype`): When progressing to Ticket #11.

---

## 5. Next Steps for Next Session

1. **Claim Ticket #9**:
   ```bash
   gh issue edit 9 --add-assignee @me
   ```
2. **Conduct HITL Grilling on Ticket #9**:
   - Address court transition timing (asynchronous finishes across 3 courts).
   - Tie-break rules when players share identical match counts and wait times.
   - Mode switching dynamics if an Organizer changes rotation mode mid-session.
3. **Resolve Ticket #9**:
   - Post resolution comment to #9, close #9, and append context pointer to Map #7 `Decisions so far`.
4. **Proceed to Ticket #10**: Grilling on Organizer Manual Overrides and Custom Pair Pinning edge cases.
5. **Unblock Ticket #11**: Build interactive courtside prototype.

---

## 6. References & Key Artifacts

- Domain Glossary: [`GLOSSARY.md`](file:///data/data/com.termux/files/home/repo/badminque/GLOSSARY.md)
- Coding Standards: [`CODING_STANDARDS.md`](file:///data/data/com.termux/files/home/repo/badminque/CODING_STANDARDS.md)
- Architecture Decision: [`docs/adr/0001-tech-stack-decision.md`](file:///data/data/com.termux/files/home/repo/badminque/docs/adr/0001-tech-stack-decision.md)
- Queueing Algorithms Spec: [`docs/research/queueing-rotation-algorithms.md`](https://github.com/kidomarcostelo/badminque/blob/research/queueing-rotation-algorithms/docs/research/queueing-rotation-algorithms.md)
- Rating Engine Spec: [`docs/research/rating-algorithm-spec.md`](https://github.com/kidomarcostelo/badminque/blob/research/rating-algorithm-spec/docs/research/rating-algorithm-spec.md)
- Offline Sync Spec: [`docs/research/sync-protocol-spec.md`](https://github.com/kidomarcostelo/badminque/blob/prototype/offline-sync-protocol/docs/research/sync-protocol-spec.md)
- Courtside Tablet UX Spec: [`docs/research/courtside-ux-spec.md`](https://github.com/kidomarcostelo/badminque/blob/prototype/courtside-ux-flow/docs/research/courtside-ux-spec.md)
