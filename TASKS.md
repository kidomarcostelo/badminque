# Badminque Tasks & Roadmap

This document provides a single-source dashboard of all tasks, active decision tickets, and completed deliverables for **Badminque**. It mirrors our GitHub Issue Tracker ([kidomarcostelo/badminque](https://github.com/kidomarcostelo/badminque)) so both human contributors and AI agents can check project status at a glance.

---

## 🚀 Active Epics & In-Progress Work

### Active Specification: Full Frontend-Backend Bridge & Courtside Production Wiring
| Issue | Type | Status | Assignee / Branch | Deliverable / Notes |
| :--- | :--- | :--- | :--- | :--- |
| **[#31 Spec: Full Frontend-Backend Bridge & Courtside Production Wiring](https://github.com/kidomarcostelo/badminque/issues/31)** | Spec | 🟡 **Ready for Agent** | Unassigned | Parent specification bridging all remaining unimplemented backend REST endpoints, `/claim` flow, DUBR feedback, and Silk Light UI parity on `apps/web`. |

### Implementation Tickets (Frontend-Backend Bridge Tracer-Bullet Slices)
| Issue | Title | Status | Blocked By | Frontier? | Deliverable / Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **[#32](https://github.com/kidomarcostelo/badminque/issues/32)** | Club & Club Night Session Initialization (API + Cockpit) | 🟡 **Ready for Agent** | None | 🚀 **Frontier** | Backend `GET/POST /clubs` & `GET/POST /clubs/{id}/nights`; Organizer session picker/creator backed by real UUIDs with offline creation/sync reconciliation. |
| **[#33](https://github.com/kidomarcostelo/badminque/issues/33)** | Live Roster Check-In & Status Mutation Bridging | 🔒 **Blocked** | #32 | Blocked | Route cockpit check-ins, typeahead hydration, and status changes (`QUEUED`/`RESTING`/`PLAYING`) through `useRoster(clubId)` when online with IndexedDB fallback. |
| **[#34](https://github.com/kidomarcostelo/badminque/issues/34)** | End-to-End Match Sync & Discipline-Aware DUBR Outcome Flow | 🔒 **Blocked** | #32 | Blocked | Real UUID batch sync (`POST /clubs/{id}/sync/batch`), Singles vs. Doubles delta reconciliation, `PostMatchOutcomeView` surfacing, and synced Match History retention. |
| **[#35](https://github.com/kidomarcostelo/badminque/issues/35)** | Real Claim Token QR Generation & `/claim` Redemption Page | 🔒 **Blocked** | #33 | Blocked | Call `POST /clubs/{id}/players/{id}/claim-token`, render real scannable SVG QR + `/claim?token=...` link, and add Next.js `/claim` page calling `POST /claim/token`. |
| **[#36](https://github.com/kidomarcostelo/badminque/issues/36)** | Live Player Passport Hydration & Cross-Club Portability | 🔒 **Blocked** | #33 | Blocked | Hydrate `PlayerPassportModal` from `GET /players/{id}/passport` when online, render portable QR/payload, and allow visitor Passport import during check-in. |
| **[#37](https://github.com/kidomarcostelo/badminque/issues/37)** | Live SQL-Ranked Club Leaderboard & Silk Light Parity | 🔒 **Blocked** | #32, #34 | Blocked | Hydrate `ClubLeaderboardView` from `GET /clubs/{id}/leaderboard` when online with local fallback; migrate Leaderboard, Claim Modal, & Passport Modal to ADR 0003 Silk Light. |

### Active Feature: Match Stakes & Zero-Sum Session Fee Settlement
| Issue | Type | Status | Assignee / Branch | Deliverable / Notes |
| :--- | :--- | :--- | :--- | :--- |
| **[#38 feat(stakes): voluntary match stakes & zero-sum session fee settlement](https://github.com/kidomarcostelo/badminque/issues/38)** | Feature | 🟡 **Ready for Agent** | Unassigned | Voluntary per-player doubles match stakes with zero-sum escrow settlement against court fees, unanimous consent, deterministic event-sourced ledger fold, and checkout mode per ADR 0004. |

*Phase 2 deployment infrastructure (**#30**) and PWA offline shell (**#29**) are complete and merged to `main` (`bash scripts/deploy-wizard.sh` ready when provisioning live dashboards).*

---

## ✅ Completed Milestones & Deliverables

### Phase 2 Deliverables
| Issue | Title | Status | Deliverable / Notes |
| :--- | :--- | :--- | :--- |
| **[#29](https://github.com/kidomarcostelo/badminque/issues/29)** | Phase 2: PWA Service Worker Registration, App Icons & Full Offline Shell | ✅ **Done** | Registered `/sw.js`, generated crisp 192x192/512x512/180x180 PNG icons, aligned Silk Light `manifest.json`, upgraded SW caching (network-first navigation, API bypass, SKIP_WAITING updates), added no-cache `/sw.js` headers. |
| **[#30](https://github.com/kidomarcostelo/badminque/issues/30)** | Phase 2: Zero-Cost Cloud Deployment Setup (Vercel + Koyeb + Neon) | ✅ **Done** | Neon `asyncpg` URL/SSL normalization, Koyeb `Dockerfile` + `start.sh` auto-migrations, flexible `CORS_ORIGINS` + Vercel preview regex, root `vercel.json`, centralized `NEXT_PUBLIC_API_URL` client routing, `.env.example` templates, and interactive `scripts/deploy-wizard.sh`. |

### Spec: [Badminque MVP Implementation — Courtside Queueing, Offline Synchronization, and Universal Rating System](https://github.com/kidomarcostelo/badminque/issues/12) (#12 - CLOSED)
*Objective: Complete club-first badminton rating and courtside match-tracking PWA + FastAPI engine operating offline within $0/month infrastructure tiers.*

| Issue | Title | Status | Blocked By | Deliverable / Notes |
| :--- | :--- | :--- | :--- | :--- |
| **[#12](https://github.com/kidomarcostelo/badminque/issues/12)** | Spec: Badminque MVP Implementation | ✅ **Closed** | None | All 9 vertical tracer-bullet slices implemented and verified on `main`. |
| **[#13](https://github.com/kidomarcostelo/badminque/issues/13)** | Foundational Workspace Scaffolding & CI Pipeline | ✅ **Done** | None | Turborepo / pnpm monorepo (Next.js PWA + FastAPI), Neon schema migrations, zero-cost CI pipeline on `feat/spec-12-mvp`. |
| **[#14](https://github.com/kidomarcostelo/badminque/issues/14)** | Mathematical Rating Engine & Invariant Suite | ✅ **Done** | None | Pure Python domain rating calculation engine with Hypothesis property invariants ($R_S/R_D$, weak-link, MOV, decay) in `badminque_api/domain/rating/`. |
| **[#15](https://github.com/kidomarcostelo/badminque/issues/15)** | Tricount-Style Roster Player Management & Offline Check-In | ✅ **Done** | None | Fast courtside player check-in, search/filter, guest creation with permanent UUIDs, IndexedDB persistence. |
| **[#16](https://github.com/kidomarcostelo/badminque/issues/16)** | 3-Court Courtside Station Board with 30-Point Quick Scoring | ✅ **Done** | None | 3-court live grid, rolling independent match dispatch, 30-pt quick scoring presets, 4-player stamina step-off. |
| **[#17](https://github.com/kidomarcostelo/badminque/issues/17)** | Automated Queue Dispatch & Multi-Policy Matchmaking Engine | ✅ **Done** | None | Priority score $Q(i)$, Fair Play, Split & Mix, Ladder, Flighted Tiers, On-Deck staging pool, Co-Pilot dispatch. |
| **[#18](https://github.com/kidomarcostelo/badminque/issues/18)** | Touch-First Organizer Overrides, Pair Pinning & Edge Cases | ✅ **Done** | None | On-Deck Slot 3 custom staging, Custom Match Builder modal, player touch action sheet, locked pair $\max(t_a, t_b)$ anchoring, 1-match skip, and bypassed player wait preservation. |
| **[#19](https://github.com/kidomarcostelo/badminque/issues/19)** | Offline-First Synchronization & Idempotent Batch Upload | ✅ **Done** | None | IndexedDB sync queue, `POST /api/v1/sync/batch` with `ON CONFLICT (id) DO NOTHING`, chronological batch fold on `feat/issue-19-offline-sync`. |
| **[#20](https://github.com/kidomarcostelo/badminque/issues/20)** | Tricount Account Claiming & Player Passport | ✅ **Done** | None | Single-use Claim Token QR codes (48h expiry), `auth_user_id` binding, Player Passport with $R_S/R_D$, windowed leaderboard. |
| **[#28](https://github.com/kidomarcostelo/badminque/issues/28)** | Google Stitch Courtside Station UI & Offline Contract Mocking | ✅ **Done** | None | Google Stitch Silk Light Soft Depth UI transformation, 46px telemetry app bar, offline fixture factory seam, and demo data seeding on `feat/issue-28-stitch-ui`. |

---

### Spec: [DUBR (Dynamic Universal Badminton Rating) Algorithm & System](https://github.com/kidomarcostelo/badminque/issues/23) (#23 - CLOSED)
*Objective: Canonical mathematical specification and vertical implementation for DUBR (2.000–7.000 decimal scale, 1-tap tier anchors, provisional calibration, cross-discipline prior seeding, and leaderboard gating).*

| Issue | Title | Status | Blocked By | Deliverable / Notes |
| :--- | :--- | :--- | :--- | :--- |
| **[#23](https://github.com/kidomarcostelo/badminque/issues/23)** | Spec: DUBR Algorithm & System | ✅ **Closed** | None | All 4 DUBR system slices implemented and verified per [`docs/adr/0002-dubr-rating-algorithm.md`](docs/adr/0002-dubr-rating-algorithm.md). |
| **[#24](https://github.com/kidomarcostelo/badminque/issues/24)** | Courtside Roster Check-In with 1-Tap Tier Anchor & DUBR Display | ✅ **Done** | None | 2.000–7.000 decimal DUBR mapping, 1-tap tier anchor pills (Beginner: 2.500, Intermediate: 3.500 [Default], Advanced: 4.500) in check-in modal & inline bar, 3-decimal DUBR display, and provisional badges. |
| **[#25](https://github.com/kidomarcostelo/badminque/issues/25)** | Match Score Recording with DUBR Rating Delta Calculation | ✅ **Done** | None | Match score recording, logarithmic MOV multiplier, non-inversion enforcement, DUBR delta calculation, post-match outcome view, and offline batch sync fold. |
| **[#26](https://github.com/kidomarcostelo/badminque/issues/26)** | Cross-Discipline Prior Seeding (Singles ↔ Doubles) | ✅ **Done** | None | Initial discipline baseline seeded from established counterpart (>= 8 matches), strict mathematical isolation on subsequent match updates, distinct provisional badges and seeded indicators on Player Passport. |
| **[#27](https://github.com/kidomarcostelo/badminque/issues/27)** | Provisional-to-Established Milestone & Club Leaderboard | ✅ **Done** | None | Club leaderboard window ranking (`RANK() OVER`), provisional exclusion, collapsible Calibrating roster section, and 8th match graduation milestone. |

---

### Standalone Architectural & Design Tasks
| Issue | Type | Status | Deliverable / Notes |
| :--- | :--- | :--- | :--- |
| **[#6 Research: Frontend and Backend Architectural Methodology](https://github.com/kidomarcostelo/badminque/issues/6)** | Research (AFK) | ✅ **Done** | Ratified Feature-Driven Vertical Slices (`apps/web/src/features/`) and Pragmatic Clean Domain Core (`apps/api/src/badminque_api/domain/`). Deliverable: [`docs/research/architecture-methodology.md`](file:///docs/research/architecture-methodology.md). |
| **[#22 Prototype: Revisit Frontend Courtside Design using Google AI Studio](https://github.com/kidomarcostelo/badminque/issues/22)** | Prototype (HITL) | ✅ **Done** | High-contrast courtside UI prototype with 3-court live grid, 30-pt score keypad, on-deck queue cards, bench roster, and Match History tab. Deliverable: [`prototypes/courtside-station-v2.html`](prototypes/courtside-station-v2.html). |
| **[ADR 0003: Google Stitch Courtside Design System](docs/adr/0003-google-stitch-design-system.md)** | Architecture / Design | ✅ **Done** | Canonical design system adoption: Silk Light Soft Depth, MD3 surface containers, Plus Jakarta Sans + JetBrains Mono, dense 46px telemetry app bar, and tactile indigo action palette. Deliverables: [`prototypes/courtside-station-stitch.html`](prototypes/courtside-station-stitch.html) & [`docs/research/stitch-design-system-spec.md`](docs/research/stitch-design-system-spec.md). |

---

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
