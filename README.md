# 🏸 Badminque

[![CI Pipeline](https://github.com/kidomarcostelo/badminque/actions/workflows/ci.yml/badge.svg)](https://github.com/kidomarcostelo/badminque/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-3.12-blue?logo=python)](https://www.python.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)

> **Open-source, club-first badminton rating and match-tracking system delivering universal skill transparency for recreational and competitive badminton communities.**

Badminque provides the badminton equivalent of the DUPR/RecClub model: an offline-first courtside station board for club organizers, dynamic skill transparency via the **DUBR (Dynamic Universal Badminton Rating)** algorithm, frictionless check-in (Tricount identity model), and portable Player Passports.

---

## 🌟 Key Features

### ⏱️ Courtside Station Board
- **3-Court Rolling Dispatch**: Independent court state tracking (`IDLE` &rarr; `PROPOSED` &rarr; `IN_MATCH` &rarr; `SCORE_ENTRY`) designed specifically for tablet use courtside.
- **30-Point Quick Scoring**: 1-tap preset score buttons (`30-28`, `30-25`, `30-22`, etc.) and a custom score entry keypad.
- **Badminton Stamina Step-Off**: Automatic transition of just-finished players into `RESTING` state with rotation back into the active queue.

### 📊 DUBR (Dynamic Universal Badminton Rating) Engine
- **Universal Decimal Scale**: Internal logistic scale ($800$–$2800$) mapped cleanly to a human-friendly **2.000 to 7.000** decimal rating formatted to 3 decimal places.
- **Weak-Link Soft Mean**: Doubles team rating weighs the lower-rated partner at 58% and higher-rated partner at 42%:
  $$R_{team} = \frac{R_1 + R_2}{2} - 0.08 \cdot |R_1 - R_2|$$
- **Strict Non-Inversion Invariant**: Match winners never lose rating points ($\Delta R \ge 0$), and match losers never gain rating points ($\Delta R \le 0$).
- **Logarithmic Margin-of-Victory (MOV)**: Dynamic scale multiplier ($0.50$ to $1.75$) with favorite damping based on game scores.
- **Continuous $K$-Factor Decay**: Smooth transition from provisional status ($K=64$) down to established status ($K=16$) over an 8-match calibration curve.
- **1-Tap Tier Anchors**: Rapid check-in anchors (`Beginner: 2.500`, `Intermediate: 3.500`, `Advanced: 4.500`) enabling convergence within 1–2 matches.
- **Discipline Isolation**: Singles ($R_S$) and Doubles ($R_D$) ratings are maintained independently with cross-discipline prior seeding.

### 📶 Offline-First Architecture & Sync
- **Courtside Offline Operation**: Next.js Progressive Web App (PWA) backed by Service Workers and browser IndexedDB (`idb`). Operates seamlessly in gym venues with zero or intermittent internet.
- **Client UUIDs & Idempotency**: Matches are assigned client-side UUID v4 identifiers at creation; backend batch sync utilizes `ON CONFLICT (id) DO NOTHING` to guarantee zero double-counting on network drop retries.
- **Chronological Batch Fold**: Uploaded match batches are folded deterministically by `(recorded_at, sequence_num)` to ensure identical rating calculations whether processed online or offline.

### 🎫 Tricount-Style Identity & Player Passports
- **Zero-Friction Check-In**: Organizers create Roster Players courtside with permanent UUIDs without requiring immediate player account registration.
- **Claim Token QR Codes**: Players can claim their historical match record at any time using a single-use 48-hour Claim Token.
- **Player Passport**: Portable digital rating badge and QR code allowing players to carry their established DUBR rating to other badminton clubs.

---

## 🏛️ System Architecture

```text
┌────────────────────────────────────────────────────────┐
│                   Next.js 15 PWA                       │
│  (React 19, Tailwind CSS, IndexedDB, Service Worker)   │
└───────────────▲────────────────────────▲───────────────┘
                │                        │
       Offline Local Cache        Batch Sync REST API
        (IndexedDB / idb)        (POST /api/v1/sync/batch)
                │                        │
                ▼                        ▼
┌────────────────────────┐      ┌────────────────────────┐
│    @badminque/core     │      │   FastAPI Backend      │
│  - TypeScript Types    │      │  - Python 3.12 Engine  │
│  - DUBR Math & Consts  │      │  - Hypothesis Testing  │
│  - Validation Schemas  │      │  - Async SQLAlchemy 2  │
└────────────────────────┘      └───────────┬────────────┘
                                            │
                                            ▼
                                ┌────────────────────────┐
                                │ Neon Serverless PG     │
                                │  - Full ACID & Pooling │
                                │  - RANK() OVER Windows │
                                └────────────────────────┘
```

### Free-Tier Cost Ceiling ($0.00 / month)
- **Frontend / PWA**: Vercel Hobby Tier ($0/mo) + Android APK/AAB via GitHub Actions ($0/mo).
- **Backend API**: Koyeb Eco Tier container ($0/mo).
- **Database**: Neon Serverless PostgreSQL ($0/mo).

---

## 📁 Repository Structure

```text
badminque/
├── apps/
│   ├── api/                       # Python FastAPI backend & rating engine
│   │   ├── alembic/               # Database migration scripts
│   │   ├── pyproject.toml         # Python build config & dependencies
│   │   └── src/badminque_api/
│   │       ├── domain/rating/     # Pure Python DUBR engine & mathematical invariant suite
│   │       ├── models/            # SQLAlchemy database models
│   │       ├── routers/           # FastAPI API routes (matches, players, sync)
│   │       ├── schemas/           # Pydantic v2 validation contracts
│   │       └── services/          # Transactional business logic
│   └── web/                       # Next.js 15 Progressive Web App
│       ├── public/                # Web manifest, icons, service worker
│       └── src/
│           ├── app/               # App Router pages and layout composition
│           ├── features/          # Feature-Driven Vertical Slices
│           │   ├── courts/        # 3-Court station cards, quick score keypad, match history
│           │   ├── matches/       # Match score entry modal and DUBR outcome view
│           │   └── roster/        # Rapid check-in typeahead and player status badges
│           ├── hooks/             # Reactive hooks (useCourts, useStorage)
│           └── services/          # Offline IndexedDB storage abstraction
├── packages/
│   └── core/                      # Shared isomorphic TypeScript library
│       └── src/
│           ├── constants.ts       # Domain constants & algorithm hyperparameters
│           ├── dubr.ts            # Isomorphic DUBR rating math and conversions
│           └── types.ts           # Core domain entity types and enums
├── docs/                          # Architecture Decision Records (ADRs) & research
│   ├── adr/                       # Architectural Decision Records
│   └── research/                  # Algorithmic specifications & technical research
├── AGENTS.md                      # AI agent operating guidelines & repo invariants
├── CODING_STANDARDS.md            # Coding style conventions & quality standards
├── GLOSSARY.md                    # Canonical domain vocabulary
├── LICENSE                        # Open-source MIT License
└── TASKS.md                       # Synchronized project roadmap & task tracking
```

---

## 📖 Domain Vocabulary

To maintain strict domain clarity across code, documentation, and agent operations, consult [`GLOSSARY.md`](GLOSSARY.md). Key terms:

| Canonical Term | Avoid | Definition |
| :--- | :--- | :--- |
| **Club Night** | Event, meetup, tournament | A single session where badminton players assemble at a venue to play matches. |
| **Organizer** | Admin, manager, host | The club member administering the club night session and recording scores on the tablet. |
| **Roster** | Guest list, sign-up sheet | The collection of players checked in to participate in a given club night. |
| **Match** | Game, bout, fixture | A scored contest between two sides (singles or doubles) comprising one or more games. |
| **Rating** | Score, rank, level, tier | The numerical calculation representing a player's relative skill level. |
| **DUBR** | UBR, Elo, global rank | Dynamic Universal Badminton Rating; the canonical rating algorithm used by Badminque. |
| **Roster Player** | Guest, unregistered player | A player entry recorded on a club roster without mandatory account registration. |
| **Claimed Player** | Verified user, linked member | A player who has registered an account and linked historical roster entries. |
| **Claim Token** | Invite code, magic link | A secure single-use token or QR code link allowing a player to claim their roster profile. |
| **Player Passport** | Member card, global ID | Portable rating identity and QR code allowing check-in across different clubs. |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v22+
- **pnpm**: v9+
- **Python**: v3.10+ (v3.12 recommended)
- **uv** or standard Python `venv`

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/kidomarcostelo/badminque.git
   cd badminque
   ```

2. **Install Node.js monorepo dependencies:**
   ```bash
   pnpm install
   ```

3. **Set up the Python backend environment:**
   ```bash
   cd apps/api
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   cd ../..
   ```

---

## 🛠️ Development & Running Locally

### Run Frontend PWA (`apps/web`)
```bash
pnpm --filter web dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser. Use browser developer tools in mobile or tablet landscape emulation mode (e.g. iPad Pro 1024×768) for the optimal courtside station experience.

### Run Backend API (`apps/api`)
```bash
cd apps/api
source .venv/bin/activate
uvicorn badminque_api.main:app --reload --port 8000
```
API documentation and interactive Swagger UI are available at [http://localhost:8000/docs](http://localhost:8000/docs).

---

## 🧪 Testing & Quality Gates

Badminque follows strict **Test-Driven Development (TDD)** with colocated unit and property-based tests.

### Frontend & Core Tests (Vitest)
```bash
# Run all unit and component tests across packages/core and apps/web
pnpm test

# Run tests for a specific workspace
pnpm --filter @badminque/core test
pnpm --filter web test
```

### Backend Tests & Invariant Suite (Pytest & Hypothesis)
```bash
# From apps/api with virtual environment activated
pytest -v

# Run with test coverage
pytest --cov=badminque_api
```

### Linting & Type Checking
```bash
# Monorepo TypeScript typecheck
pnpm typecheck

# Monorepo ESLint check
pnpm lint

# Python Ruff formatting and linting
cd apps/api
ruff format --check .
ruff check .
```

---

## 📐 Mathematical Invariants Summary

All rating computations in `packages/core/src/dubr.ts` and `apps/api/src/badminque_api/domain/rating/` satisfy five core invariants:

1. **Discipline Isolation**: $R_S$ and $R_D$ are computed separately; singles results never update doubles ratings and vice versa.
2. **Weak-Link Soft Mean**: Teams are evaluated with a 58% / 42% weight favoring the lower-rated partner ($\gamma = 0.08$).
3. **Non-Inversion**: Winning a match guarantees $\Delta R \ge 0$; losing guarantees $\Delta R \le 0$.
4. **Logarithmic MOV Multiplier**: Multiplier $M \in [0.50, 1.75]$ scales smoothly with point differentials while dampening heavy favorites.
5. **Continuous $K$-Factor Decay**: Dynamic $K(n) = 16 + 48 \cdot 2^{-n/6}$ smoothly decays from $K=64$ down to $K=16$ at $n \ge 8$ matches.

---

## 🤝 Contributing

We welcome contributions from both human developers and AI pair programmers!

1. **Roadmap & Tasks**: Review [`TASKS.md`](TASKS.md) and open issues on [GitHub Issues](https://github.com/kidomarcostelo/badminque/issues).
2. **Coding Standards**: Read [`CODING_STANDARDS.md`](CODING_STANDARDS.md) before submitting pull requests (no nested ternaries, guard clauses, strict typing, colocated tests).
3. **AI Agent Guidelines**: Autonomous agents must follow [`AGENTS.md`](AGENTS.md) and adhere to canonical vocabulary in [`GLOSSARY.md`](GLOSSARY.md).
4. **Pull Requests**: Follow conventional commits (`feat:`, `fix:`, `docs:`, `test:`, `refactor:`). Ensure all tests and typechecks pass before submitting.

---

## 📄 Documentation & Architecture Records

For technical deep-dives and design specifications, refer to:
- [`GLOSSARY.md`](GLOSSARY.md) — Canonical Domain Terminology
- [`AGENTS.md`](AGENTS.md) — AI Agent Operating Guidelines & Rules
- [`CODING_STANDARDS.md`](CODING_STANDARDS.md) — Code Style & Quality Standards
- [`TASKS.md`](TASKS.md) — Project Roadmap & Task Synchronization
- [`docs/adr/0001-tech-stack-decision.md`](docs/adr/0001-tech-stack-decision.md) — Architecture & Tech Stack Selection
- [`docs/adr/0002-dubr-rating-algorithm.md`](docs/adr/0002-dubr-rating-algorithm.md) — DUBR Algorithm Adoption
- [`docs/research/architecture-methodology.md`](docs/research/architecture-methodology.md) — Vertical Slices & Clean Architecture Methodology

---

## 📜 License

This project is open-source software licensed under the [MIT License](LICENSE).
