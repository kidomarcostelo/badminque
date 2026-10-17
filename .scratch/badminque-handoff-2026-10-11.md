# Badminque Handoff: Ready for MVP Implementation (Ticket #13 Frontier)

**Date**: 2026-10-11  
**Repository**: `/data/data/com.termux/files/home/repo/badminque`  
**GitHub**: [kidomarcostelo/badminque](https://github.com/kidomarcostelo/badminque)  
**Branch**: `main` (clean, up to date with `origin/main` at commit `86514ce`)  
**Parent Specification**: [#12 Spec: Badminque MVP Implementation — Courtside Queueing, Offline Synchronization, and Universal Rating System](https://github.com/kidomarcostelo/badminque/issues/12)

---

## 1. Executive Summary & Session Outcomes

In this session, we transitioned from architectural exploration and interactive prototyping into active implementation readiness:

1. **Wayfinder Maps Resolved**:
   - Both foundational architecture epics are closed and complete:
     - [Map #1 (MVP Architecture)](https://github.com/kidomarcostelo/badminque/issues/1)
     - [Map #7 (Courtside Queueing, Rotation, and Matchmaking Engine)](https://github.com/kidomarcostelo/badminque/issues/7)
2. **Unified MVP Specification Published**:
   - Authored and published [#12 Spec: Badminque MVP Implementation](https://github.com/kidomarcostelo/badminque/issues/12) consolidating all algorithms, data models, queueing state machines, sync protocols, and testing seams.
3. **Tracer-Bullet Implementation Slicing (`/to-tickets`)**:
   - Consumed Spec #12 and sliced the implementation into 8 tracer-bullet vertical slice tickets with explicit dependency edges (`blocked_by`).
   - Published Tickets 1 through 8 on GitHub Issues with label `ready-for-agent` ([#13](https://github.com/kidomarcostelo/badminque/issues/13) through [#20](https://github.com/kidomarcostelo/badminque/issues/20)).
4. **Dual-Sync Tracker Synchronized**:
   - Updated and committed [TASKS.md](file:///data/data/com.termux/files/home/repo/badminque/TASKS.md) on `main`, pushing commit `86514ce` to `origin/main`.
   - Identified the active, unblocked **Frontier Ticket**: **[#13 Foundational Workspace Scaffolding & CI Pipeline](https://github.com/kidomarcostelo/badminque/issues/13)**.

---

## 2. Implementation Dependency Graph & Tracker State

| Ticket | Issue | Title | Status | Blocked By | Frontier? | Scope / Deliverable |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Ticket 1** | **[#13](https://github.com/kidomarcostelo/badminque/issues/13)** | Foundational Workspace Scaffolding & CI Pipeline | 🟡 `ready-for-agent` | *None* | 🚀 **Frontier** | Turborepo / pnpm monorepo (`frontend/` Next.js PWA + `backend/` FastAPI), Neon schema migrations, zero-cost GitHub Actions CI. |
| **Ticket 2** | **[#14](https://github.com/kidomarcostelo/badminque/issues/14)** | Mathematical Rating Engine & Invariant Suite | 🟡 `ready-for-agent` | [#13](https://github.com/kidomarcostelo/badminque/issues/13) | Blocked | Pure Python rating calculation engine with Hypothesis property invariants ($R_S/R_D$, weak-link soft mean, MOV, $K$-decay). |
| **Ticket 3** | **[#15](https://github.com/kidomarcostelo/badminque/issues/15)** | Tricount-Style Roster Player Management & Offline Check-In | 🟡 `ready-for-agent` | [#13](https://github.com/kidomarcostelo/badminque/issues/13) | Blocked | Rapid courtside player check-in, search/filter, guest player creation with permanent UUIDs, local IndexedDB persistence. |
| **Ticket 4** | **[#16](https://github.com/kidomarcostelo/badminque/issues/16)** | 3-Court Courtside Station Board with 30-Point Quick Scoring | 🟡 `ready-for-agent` | [#15](https://github.com/kidomarcostelo/badminque/issues/15) | Blocked | 3-court live station grid, rolling independent match dispatch, 30-pt quick score presets (`30-28`, `30-22` etc.), 4-player stamina step-off. |
| **Ticket 5** | **[#17](https://github.com/kidomarcostelo/badminque/issues/17)** | Automated Queue Dispatch & Multi-Policy Matchmaking Engine | 🟡 `ready-for-agent` | [#14](https://github.com/kidomarcostelo/badminque/issues/14), [#16](https://github.com/kidomarcostelo/badminque/issues/16) | Blocked | Priority score $Q(i)$, 4 policies (Fair Play, Split & Mix, Ladder, Flighted Tiers), On-Deck 2-slot pre-grouped quads. |
| **Ticket 6** | **[#18](https://github.com/kidomarcostelo/badminque/issues/18)** | Touch-First Organizer Overrides, Pair Pinning & Edge Cases | 🟡 `ready-for-agent` | [#17](https://github.com/kidomarcostelo/badminque/issues/17) | Blocked | On-Deck Slot 3 custom staging, Custom Match Builder modal, player action sheet, locked pair $\max(t_a, t_b)$ anchoring. |
| **Ticket 7** | **[#19](https://github.com/kidomarcostelo/badminque/issues/19)** | Offline-First Synchronization & Idempotent Batch Upload | 🟡 `ready-for-agent` | [#14](https://github.com/kidomarcostelo/badminque/issues/14), [#17](https://github.com/kidomarcostelo/badminque/issues/17) | Blocked | IndexedDB sync queue buffer, `POST /api/v1/sync/batch` with `ON CONFLICT (id) DO NOTHING`, chronological batch fold. |
| **Ticket 8** | **[#20](https://github.com/kidomarcostelo/badminque/issues/20)** | Tricount Account Claiming & Player Passport | 🟡 `ready-for-agent` | [#19](https://github.com/kidomarcostelo/badminque/issues/19) | Blocked | Single-use Claim Token QR codes (48h expiry), `auth_user_id` binding, Player Passport with $R_S/R_D$, windowed leaderboard. |

---

## 3. Key Architectural References & Domain Invariants

Before writing code, the incoming agent must review and uphold these invariants:

1. **Domain Vocabulary**:
   - Strictly follow [`GLOSSARY.md`](file:///data/data/com.termux/files/home/repo/badminque/GLOSSARY.md).
   - Canonical terms: *Club Night*, *Organizer*, *Roster*, *Match*, *Rating*, *Roster Player*, *Claimed Player*, *Claim Token*, *Player Passport*.
2. **Architecture & Cost Constraints**:
   - Follow **ADR 0001** ([`docs/adr/0001-tech-stack-decision.md`](file:///data/data/com.termux/files/home/repo/badminque/docs/adr/0001-tech-stack-decision.md)).
   - Frontend: Next.js PWA (TypeScript, Tailwind CSS, IndexedDB).
   - Backend: Python (FastAPI).
   - Database: Neon Serverless PostgreSQL.
   - Cost Ceiling: strictly $0.00 / month (free tiers only).
3. **Badminton Rating Mathematics**:
   - Follow [`docs/research/rating-algorithm-spec.md`](file:///data/data/com.termux/files/home/repo/badminque/docs/research/rating-algorithm-spec.md).
   - Strict separation of Singles ($R_S$) and Doubles ($R_D$).
   - Weak-link soft mean: $R_{\text{team}} = \frac{R_1 + R_2}{2} - 0.08 \cdot |R_1 - R_2|$ (58% lower / 42% higher).
   - Non-inversion invariant: $\Delta R_{\text{win}} \ge 0$, $\Delta R_{\text{loss}} \le 0$.
   - Logarithmic MOV multiplier ($0.50 \le \text{MOV} \le 1.75$) with favorite-damping.
   - Dynamic $K$-factor decay ($K=64$ provisional $\to$ $K=16$ established at $\ge 8$ matches).
4. **Courtside Queueing & Interaction Engine**:
   - Follow [`docs/research/courtside-queue-board-spec.md`](file:///data/data/com.termux/files/home/repo/badminque/docs/research/courtside-queue-board-spec.md) and prototype [`prototypes/courtside-queue-board.html`](file:///data/data/com.termux/files/home/repo/badminque/prototypes/courtside-queue-board.html).
   - 30-point recreational scoring with 1-tap quick presets.
   - Independent rolling court dispatch (no synchronized round freezes).
   - Decoupled physical courts (Courts 1–3 are stations, not fixed skill levels).
   - 4-player stamina step-off invariant upon match conclusion.
   - Queue priority: $Q(i) = t_{\text{wait}} - 1800 \cdot M_i + 600 \cdot S_i$.
   - Pinned pair queue anchoring: $\max(t_a, t_b)$, unpinned partner stays in `WAITING_PARTNER` with zero line-cutting.
   - Touch-first tablet ergonomics: no HTML5 drag-and-drop; use tap action sheets and dedicated modal match builder.
   - UI principle (Google Stitch): dense "spreadsheet-familiar one-pager" layout fitting all 3 courts, 3 on-deck slots, and full roster on one landscape screen.
5. **Offline Synchronization Protocol**:
   - Follow [`docs/research/sync-protocol-spec.md`](file:///data/data/com.termux/files/home/repo/badminque/docs/research/sync-protocol-spec.md).
   - Client-generated UUID v4 for all matches.
   - Strict database idempotency: `ON CONFLICT (id) DO NOTHING`.
   - Chronological batch fold sorted by `(recorded_at, sequence_num)`.
   - Tricount identity: permanent UUID with `auth_user_id = NULL`; claim token binds user without mutating historical match records.
6. **Engineering Discipline**:
   - Strictly follow [`CODING_STANDARDS.md`](file:///data/data/com.termux/files/home/repo/badminque/CODING_STANDARDS.md) and [`AGENTS.md`](file:///data/data/com.termux/files/home/repo/badminque/AGENTS.md).
   - Test-Driven Development (TDD): write failing test first.
   - Zero quality downgrades: never use `@ts-ignore` or `# noqa`; never delete or skip tests.

---

## 4. Suggested Skills for Next Step

The incoming agent should invoke the following skills via the Skill tool:

1. **`implement` (`/mattpocock-skills:implement`)**:
   - To claim and implement the unblocked frontier ticket: **[#13 Foundational Workspace Scaffolding & CI Pipeline](https://github.com/kidomarcostelo/badminque/issues/13)**.
   - Assign the issue: `gh issue edit 13 --add-assignee @me`.
   - Scaffold the monorepo structure, Next.js PWA, FastAPI backend, Alembic migrations, and GitHub Actions CI workflow.
2. **`tdd` (`/mattpocock-skills:tdd`)**:
   - To maintain rigorous red-green-refactor loops across all workspace test configurations and subsequent ticket implementations.
3. **`code-review` (`/mattpocock-skills:code-review`)**:
   - To review the branch against repo standards and Ticket #13 requirements before merging.

---

## 5. Active Environment State

- **Current Working Directory**: `/data/data/com.termux/files/home/repo/badminque`
- **Git Branch**: `main` (commit `86514ce`, working tree clean, in sync with `origin/main`)
- **Background Processes**:
  - Python HTTP server running on port `8080` serving prototypes (`http://localhost:8080/prototypes/courtside-queue-board.html`).
