# Badminque Tasks & Roadmap

This document provides a single-source dashboard of all tasks, active decision tickets, and completed deliverables for **Badminque**. It mirrors our GitHub Issue Tracker ([kidomarcostelo/badminque](https://github.com/kidomarcostelo/badminque)) so both human contributors and AI agents can check project status at a glance.

---

## 🚀 Active Epics & In-Progress Work

### Map: [Courtside Queueing, Rotation, and Matchmaking Engine](https://github.com/kidomarcostelo/badminque/issues/7) (#7)
*Objective: Complete architectural specification and interactive prototype for courtside doubles queueing, 3-court rotation policies (Fair Play, Split & Mix, Court Ladder, Flighted Tiers), player availability states, and organizer manual overrides.*

| Ticket / Task | Type | Status | Assignee / Branch | Deliverable / Notes |
| :--- | :--- | :--- | :--- | :--- |
| **[#8 Research: Recreational Sports Queueing and Fair Rotation Algorithms](https://github.com/kidomarcostelo/badminque/issues/8)** | Research (AFK) | ✅ **Done** | `research/queueing-rotation-algorithms` | [`docs/research/queueing-rotation-algorithms.md`](file:///data/data/com.termux/files/home/repo/badminque/docs/research/queueing-rotation-algorithms.md) |
| **[#9 Grilling: Rotation Policy State Machines and Court Transitions for 3-Court Badminton](https://github.com/kidomarcostelo/badminque/issues/9)** | Grilling (HITL) | ✅ **Done** | kidomarcostelo | Asynchronous rolling dispatch, virtual tiers decoupled from physical courts, tie-breaking, and Organizer co-pilot dispatch state machine. |
| **[#10 Grilling: Organizer Manual Override, Custom Pair Pinning, and Queue Backfill Edge Cases](https://github.com/kidomarcostelo/badminque/issues/10)** | Grilling (HITL) | 🟢 **In Progress (Frontier)** | kidomarcostelo | Resolves locked pair entry timing, 1-match skip retention, and drag-and-drop overrides. |
| **[#11 Prototype: Interactive Courtside Queue and Rotation Board](https://github.com/kidomarcostelo/badminque/issues/11)** | Prototype (HITL) | 🔒 **Blocked** (by #10) | Unassigned | Interactive tablet UI prototype for 3-court queue management & quick scoring. |

---

### Standalone Architectural Tasks
| Issue | Type | Status | Deliverable / Notes |
| :--- | :--- | :--- | :--- |
| **[#6 Research: Frontend and Backend Architectural Methodology](https://github.com/kidomarcostelo/badminque/issues/6)** | Research (AFK) | 🟡 **Ready for Agent** | Compares Clean Architecture vs Feature-Sliced Design for Next.js PWA + FastAPI backend. |

---

## ✅ Completed Milestones & Deliverables

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
