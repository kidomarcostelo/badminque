# Badminque Tasks & Roadmap

This document provides a single-source dashboard of all tasks, active decision tickets, and completed deliverables for **Badminque**. It mirrors our GitHub Issue Tracker ([kidomarcostelo/badminque](https://github.com/kidomarcostelo/badminque)) so both human contributors and AI agents can check project status at a glance.

---

## 🚀 Active Epics & In-Progress Work

### Active Specification: Badminque MVP Implementation
| Issue | Type | Status | Assignee / Branch | Deliverable / Notes |
| :--- | :--- | :--- | :--- | :--- |
| **[#12 Spec: Badminque MVP Implementation](https://github.com/kidomarcostelo/badminque/issues/12)** | Spec | 🟡 **Ready for Agent** | Unassigned | Parent MVP specification sliced into 8 tracer-bullet vertical tickets below. |
| **[#23 Spec: DUBR Algorithm & System](https://github.com/kidomarcostelo/badminque/issues/23)** | Spec | 🟡 **Ready for Agent** | Unassigned | Canonical specification for DUBR: 2.000–7.000 decimal scale, 1-tap tier anchors, provisional dynamics, and cross-discipline prior seeding. |

### Implementation Tickets (Tracer-Bullet Slices)
| Issue | Title | Status | Blocked By | Frontier? | Deliverable / Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **[#13](https://github.com/kidomarcostelo/badminque/issues/13)** | Foundational Workspace Scaffolding & CI Pipeline | ✅ **Done** | None | Completed | Turborepo / pnpm monorepo (Next.js PWA + FastAPI), Neon schema migrations, zero-cost CI pipeline on `feat/spec-12-mvp`. |
| **[#14](https://github.com/kidomarcostelo/badminque/issues/14)** | Mathematical Rating Engine & Invariant Suite | ✅ **Done** | None | Completed | Pure Python domain rating calculation engine with Hypothesis property invariants ($R_S/R_D$, weak-link, MOV, decay) in `badminque_api/domain/rating/`. |
| **[#15](https://github.com/kidomarcostelo/badminque/issues/15)** | Tricount-Style Roster Player Management & Offline Check-In | ✅ **Done** | None | Completed | Fast courtside player check-in, search/filter, guest creation with permanent UUIDs, IndexedDB persistence. |
| **[#16](https://github.com/kidomarcostelo/badminque/issues/16)** | 3-Court Courtside Station Board with 30-Point Quick Scoring | ✅ **Done** | None | Completed | 3-court live grid, rolling independent match dispatch, 30-pt quick scoring presets, 4-player stamina step-off. |
| **[#17](https://github.com/kidomarcostelo/badminque/issues/17)** | Automated Queue Dispatch & Multi-Policy Matchmaking Engine | 🟢 **In Progress** | None | 🚀 **Frontier** | Queue priority $Q(i)$, Fair Play, Split & Mix, Ladder, Flighted Tiers, On-Deck 2-slot pre-grouping. (Assignee: @kidomarcostelo) |
| **[#18](https://github.com/kidomarcostelo/badminque/issues/18)** | Touch-First Organizer Overrides, Pair Pinning & Edge Cases | 🟡 **Ready for Agent** | #17 | Blocked | On-Deck Slot 3 custom staging, Custom Match Builder modal, player action sheet, locked pair $\max(t_a, t_b)$ anchoring. |
| **[#19](https://github.com/kidomarcostelo/badminque/issues/19)** | Offline-First Synchronization & Idempotent Batch Upload | 🟡 **Ready for Agent** | #14, #17 | Blocked | IndexedDB sync queue, `POST /api/v1/sync/batch` with `ON CONFLICT (id) DO NOTHING`, chronological batch fold. |
| **[#20](https://github.com/kidomarcostelo/badminque/issues/20)** | Tricount Account Claiming & Player Passport | 🟡 **Ready for Agent** | #19 | Blocked | Single-use Claim Token QR codes (48h expiry), `auth_user_id` binding, Player Passport with $R_S/R_D$, windowed leaderboard. |

### Implementation Tickets: DUBR Algorithm & System (Spec #23)
| Issue | Title | Status | Blocked By | Frontier? | Deliverable / Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **[#24](https://github.com/kidomarcostelo/badminque/issues/24)** | Courtside Roster Check-In with 1-Tap Tier Anchor & DUBR Display | ✅ **Done** | None | Completed | 2.000–7.000 decimal DUBR mapping, 1-tap tier anchor pills (Beginner: 2.500, Intermediate: 3.500 [Default], Advanced: 4.500) in check-in modal & inline bar, 3-decimal DUBR display, and provisional badges. |
| **[#25](https://github.com/kidomarcostelo/badminque/issues/25)** | Match Score Recording with DUBR Rating Delta Calculation | ✅ **Done** | None | Completed | Match score recording, logarithmic MOV multiplier, non-inversion enforcement, DUBR delta calculation, post-match outcome view, and offline batch sync fold. |
| **[#26](https://github.com/kidomarcostelo/badminque/issues/26)** | Cross-Discipline Prior Seeding (Singles ↔ Doubles) | 🟡 **Ready for Agent** | None | 🚀 **Frontier** | Initial discipline baseline seeded from established counterpart, strict mathematical isolation on subsequent match updates. |
| **[#27](https://github.com/kidomarcostelo/badminque/issues/27)** | Provisional-to-Established Milestone & Club Leaderboard | 🟡 **Ready for Agent** | None | 🚀 **Frontier** | Club leaderboard ranking (`RANK() OVER`), provisional player exclusion, 8th match graduation milestone. |

### Standalone Architectural & Design Tasks
| Issue | Type | Status | Deliverable / Notes |
| :--- | :--- | :--- | :--- |
| **[#6 Research: Frontend and Backend Architectural Methodology](https://github.com/kidomarcostelo/badminque/issues/6)** | Research (AFK) | ✅ **Done** | Ratified Feature-Driven Vertical Slices (`apps/web/src/features/`) and Pragmatic Clean Domain Core (`apps/api/src/badminque_api/domain/`). Deliverable: [`docs/research/architecture-methodology.md`](file:///docs/research/architecture-methodology.md). |
| **[#22 Prototype: Revisit Frontend Courtside Design using Google AI Studio](https://github.com/kidomarcostelo/badminque/issues/22)** | Prototype (HITL) | ✅ **Done** | High-contrast courtside UI prototype with 3-court live grid, 30-pt score keypad, on-deck queue cards, bench roster, and Match History tab. Deliverable: [`prototypes/courtside-station-v2.html`](prototypes/courtside-station-v2.html). |

---

## ✅ Completed Milestones & Deliverables

### Map: [Courtside Queueing, Rotation, and Matchmaking Engine](https://github.com/kidomarcostelo/badminque/issues/7) (#7 - CLOSED)
*Objective: Complete architectural specification and interactive prototype for courtside doubles queueing, 3-court rotation policies (Fair Play, Split & Mix, Court Ladder, Flighted Tiers), player availability states, and organizer manual overrides.*

| Issue | Title | Type | Status | Branch / Artifact |
| :--- | :--- | :--- | :--- | :--- |
| **[#7](https://github.com/kidomarcostelo/badminque/issues/7)** | Map: Courtside Queueing, Rotation, and Matchmaking Engine | Map | ✅ Closed | All 4 queueing and rotation child tickets completed |
| **[#8](https://github.com/kidomarcostelo/badminque/issues/8)** | Research: Recreational Sports Queueing and Fair Rotation Algorithms | Research | ✅ Closed | [`docs/research/queueing-rotation-algorithms.md`](file:///data/data/com.termux/files/home/repo/badminque/docs/research/queueing-rotation-algorithms.md) on branch `research/queueing-rotation-algorithms` |
| **[#9](https://github.com/kidomarcostelo/badminque/issues/9)** | Grilling: Rotation Policy State Machines and Court Transitions | Grilling | ✅ Closed | Resolution in GitHub #9 (Rolling dispatch, virtual tiers, tie-breaks, co-pilot state machine) |
| **[#10](https://github.com/kidomarcostelo/badminque/issues/10)** | Grilling: Organizer Manual Override, Custom Pair Pinning, and Queue Backfill Edge Cases | Grilling | ✅ Closed | Resolution in GitHub #10 (Locked pair arrival anchoring, frictionless overrides, 1-skip anti-starvation) |
| **[#11](https://github.com/kidomarcostelo/badminque/issues/11)** | Prototype: Interactive Courtside Queue and Rotation Board | Prototype | ✅ Closed | [`prototypes/courtside-queue-board.html`](file:///data/data/com.termux/files/home/repo/badminque/prototypes/courtside-queue-board.html) & [`docs/research/courtside-queue-board-spec.md`](file:///data/data/com.termux/files/home/repo/badminque/docs/research/courtside-queue-board-spec.md) on branch `prototype/courtside-queue-board` |

---

### Map: [Badminque MVP — Club-First Badminton Rating App](https://github.com/kidomarcostelo/badminque/issues/1) (#1 - CLOSED)
*Objective: Foundational system architecture, rating mathematics, offline synchronization, player claiming, and courtside check-in UX.*

| Issue | Title | Type | Status | Branch / Artifact |
| :--- | :--- | :--- | :--- | :--- |
| **[#1](https://github.com/kidomarcostelo/badminque/issues/1)** | Map: Badminque MVP Architecture | Map | ✅ Closed | All 4 foundational child tickets completed |
| **[#2](https://github.com/kidomarcostelo/badminque/issues/2)** | Research: Badminton Rating Algorithm Specification | Research | ✅ Closed | [`docs/research/rating-algorithm-spec.md`](file:///data/data/com.termux/files/home/repo/badminque/docs/research/rating-algorithm-spec.md) on branch `research/rating-algorithm-spec` |
| **[#3](https://github.com/kidomarcostelo/badminque/issues/3)** | Prototype: Offline-First Synchronization Protocol and Schema | Prototype | ✅ Closed | [`prototypes/offline-sync-demo.html`](file:///data/data/com.termux/files/home/repo/badminque/prototypes/offline-sync-demo.html) and [`docs/research/sync-protocol-spec.md`](file:///data/data/com.termux/files/home/repo/badminque/docs/research/sync-protocol-spec.md) on branch `prototype/offline-sync-protocol` |
| **[#4](https://github.com/kidomarcostelo/badminque/issues/4)** | Grilling: Tricount-Style Player Identity and Account Claiming Flow | Grilling | ✅ Closed | Resolution in GitHub #4 (Permanent UUID, NULL auth_user_id, Claim Tokens, Passports) |
| **[#5](https://github.com/kidomarcostelo/badminque/issues/5)** | Prototype: Club Night Tablet Court-Side Check-in & Match Entry UX Flow | Prototype | ✅ Closed | [`prototypes/courtside-ux-variants.html`](file:///data/data/com.termux/files/home/repo/badminque/prototypes/courtside-ux-variants.html) and [`docs/research/courtside-ux-spec.md`](file:///data/data/com.termux/files/home/repo/badminque/docs/research/courtside-ux-spec.md) on branch `prototype/courtside-ux-flow` |

---

## 🔮 Future Backlog (Fog of War)

These items are identified as part of the broader vision but are not yet scheduled for live execution:

- **Audio/Visual Courtside Callouts**: Synthesized speech announcements ("Court 2: Alice & Bob vs Charlie & Dave").
- **Mobile Player Companion View**: Read-only web app for resting players to see live queue position on their phones.
- **Dynamic Court Count Rebalancing**: Gracefully handling mid-session court adjustments (e.g., dropping from 3 courts to 2 courts when gym booking ends).
- **Singles Queueing & Rotation**: Dedicated singles matchmaking mode (differing stamina and court capacity dynamics).
- **Pairing Frequency Matrix & Heatmap**: Post-session analytics visualizing who played with/against whom across the evening.
- **Multi-Club Federation**: Cross-club rating validation and player passport portability.

---

## 📌 Operating Protocol for Agents and Contributors

1. **Before Starting Work**:
   - Check this `TASKS.md` to see what is currently in progress.
   - If claiming an issue on GitHub, assign yourself: `gh issue edit <n> --add-assignee @me`.
2. **After Completing Work**:
   - Update the status column in `TASKS.md` (e.g. from 🟢 In Progress to ✅ Done) with the link to the artifact or PR.
   - Close the corresponding GitHub issue: `gh issue close <n> --comment "..."`.
