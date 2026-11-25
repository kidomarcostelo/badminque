# Badminque AI Agent Operating Guidelines

Welcome, AI Agent. You are pair-programming on **Badminque**, a club-first badminton rating and match-tracking system providing universal skill transparency (DUPR/RecClub model for badminton).

Before proposing, modifying, or implementing any code, you must strictly read and adhere to the repository rules below.

---

## 1. Domain Vocabulary (Strict)

Always consult and speak the canonical vocabulary defined in `GLOSSARY.md`. Never invent language or substitute prohibited synonyms:

- **Club Night** (*Avoid*: event, tournament, meetup)
- **Organizer** (*Avoid*: admin, manager, host)
- **Roster** (*Avoid*: guest list, sign-up sheet, attendees)
- **Match** (*Avoid*: game, bout, fixture)
- **Rating** (*Avoid*: score, rank, level, tier)
- **Roster Player** (*Avoid*: guest, phantom user, unregistered player)
- **Claimed Player** (*Avoid*: verified user, linked member)
- **Claim Token** (*Avoid*: invite code, magic link, activation key)
- **Player Passport** (*Avoid*: member card, global ID, digital badge)
- **Match Stake** (*Avoid*: bet, gamble, pot, wager)
- **Session Fee Ledger** (*Avoid*: tab, debt sheet, casino balance)

If a concept is not yet in `GLOSSARY.md`, do not guess—flag it for domain modeling.

---

## 2. Architecture & Technology Constraints

Respect **ADR 0001** (`docs/adr/0001-tech-stack-decision.md`), **ADR 0003** (`docs/adr/0003-google-stitch-design-system.md`), and **ADR 0004** (`docs/adr/0004-match-stakes-and-session-fee-settlement.md`):

1. **Frontend & PWA Offline Shell**: **Next.js 15 PWA** (React 19 / TypeScript / Tailwind CSS Silk Light theme).
   - Client storage uses IndexedDB (`idb`) via `storageService`; register `/sw.js` via `features/pwa/`.
   - **API Routing Contract**: Route every client HTTP call through `buildApiUrl()` in `apps/web/src/services/apiClient.ts` so `NEXT_PUBLIC_API_URL` directs production traffic cleanly from Vercel to Koyeb.
   - **Service Worker Contract**: `apps/web/public/sw.js` (`badminque-shell-v2`) serves `navigate` requests Network-First with `/` offline fallback and keeps `/api/*` and non-`GET` traffic strictly uncached; `apps/web/next.config.ts` serves `/sw.js` with `Cache-Control: no-cache, no-store, must-revalidate`.
2. **Backend & Container Runtime**: **Python 3.12 (FastAPI)** housing the DUBR rating engine, validation schemas, and batch sync endpoints. Packaged via `apps/api/Dockerfile` + `apps/api/start.sh` (runs `alembic upgrade head` before `uvicorn`) with permissive `CORS_ORIGINS` and `CORS_ORIGIN_REGEX` for Vercel production/preview domains.
3. **Database (Neon Serverless PostgreSQL)**: Relational schema with SQL `RANK() OVER` club leaderboards. Always route connection strings through `normalize_database_url()` (`apps/api/src/badminque_api/config.py`) in `database.py` and `alembic/env.py` so Neon `postgresql://...?sslmode=require&channel_binding=require` URIs normalize cleanly to `postgresql+asyncpg://` + `connect_args={'ssl': 'require'}`.
4. **Cost Ceiling**: **$0.00 / month**. All services must run within free tiers (Vercel Hobby, Koyeb Eco, Neon Free). Never add paid SaaS dependencies without explicit user authorization.

---

## 3. Mathematical Rating Engine Invariants

All rating calculations must strictly conform to **ADR 0002** (`docs/adr/0002-dubr-rating-algorithm.md`):

1. **Independent Disciplines & Cross-Discipline Prior Seeding**: Singles ($R_S$) and Doubles ($R_D$) ratings never bleed on match updates. When an established player ($\ge 8$ matches in one discipline) plays an unrated discipline ($0$ matches), only their initial baseline seeds from the established counterpart prior; subsequent updates remain 100% isolated.
2. **Weak-Link Soft Mean**: In doubles, team rating is calculated using:
   $$R_{team} = \frac{R_1 + R_2}{2} - 0.08 \cdot |R_1 - R_2|$$
   giving 58% weight to the lower-rated partner and 42% to the higher-rated partner.
3. **Non-Inversion Invariant**: A match winner must **never** lose rating points ($\Delta R \ge 0$), and a loser must **never** gain rating points ($\Delta R \le 0$).
4. **Logarithmic MOV Multiplier**: Victory margins scale logarithmically between $0.50$ (close 21-19) and $1.75$ (crushing 21-5 blowout) with favorite-damping.
5. **Continuous $K$-Factor Decay**: Dynamic $K$-factor scaling from $K=64$ (provisional, $< 8$ matches) down to $K=16$ (established, $\ge 8$ matches) with automatic leaderboard graduation at match 8.

---

## 4. Offline Synchronization & Data Integrity

All data exchange must follow `docs/research/sync-protocol-spec.md`:

1. **Client UUIDs**: Every match must be assigned a client-generated UUID v4 courtside.
2. **Strict Idempotency**: The server must use `ON CONFLICT (id) DO NOTHING`. Network drop retries must never double-count matches or alter ratings twice.
3. **Chronological Batch Fold**: Uploaded batches must be sorted by `(recorded_at, sequence_num)` before applying rating updates.
4. **Tricount Identity Lifecycle**: Unauthenticated roster players accumulate full match history under their permanent UUID with `auth_user_id = NULL`. Account claiming binds the user ID without mutating historical records.

---

## 5. Engineering Discipline & Quality Bar

Strictly adhere to the conventions defined in [`CODING_STANDARDS.md`](CODING_STANDARDS.md).

1. **Test-Driven Development (TDD)**:
   - Write the failing test first before implementing business logic, rating formulas, or sync handlers.
   - Test against the highest testing seam (external behavior, not internal implementation details).
2. **Tracer-Bullet Vertical Slices**:
   - Deliver complete functional paths (database schema &rarr; API &rarr; UI &rarr; tests) rather than disconnected horizontal layers.
3. **Zero Quality Downgrades & Code Conventions**:
   - Follow all conventions in `CODING_STANDARDS.md` (no nested ternaries, guard clauses, strict typing).
   - Never silence linter errors with `@ts-ignore` or `# noqa`.
   - Never skip or delete existing tests to achieve green builds.
   - Preserve comments and architectural rationale.
4. **Conventional Commits**:
   - Format git commits as `feat:`, `fix:`, `docs:`, `test:`, `refactor:`.
5. **Mandatory Documentation Parity**:
   - Document everything delivered or changed before closing a task:
     - **Tasks & Issues**: Maintain bidirectional sync between GitHub Issues (`gh`) and root `TASKS.md`.
     - **Architecture & Operations**: Record new architectural choices in `docs/adr/`, operational/cloud setup in `docs/deployment.md`, and user-facing features in `README.md`.
     - **Agent Context Pointers**: Update `AGENTS.md` with any new architectural invariants, environment contracts, or disclosed `docs/` pointers introduced by your work (keep tutorials in `docs/` to minimize context bloat).

---

## Agent skills

### Issue tracker

Dual-sync issue tracker: remote GitHub Issues via `gh` CLI paired with local root `TASKS.md`. See `docs/agents/issue-tracker.md`. All agents must strictly maintain bidirectional synchronization between GitHub Issues and `TASKS.md`.

### Triage labels

Canonical five-role vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context (`GLOSSARY.md` + `docs/adr/` at repo root). See `docs/agents/domain.md`.

### Cloud deployment & provisioning

Read `docs/deployment.md` (and `scripts/deploy-wizard.sh`) whenever modifying environment variables, CORS, database URLs, Dockerfiles, or Vercel/Koyeb/Neon configurations.

### Design system & PWA assets

Read `docs/adr/0003-google-stitch-design-system.md` (and `docs/research/stitch-design-system-spec.md`) when building UI components or modifying `manifest.json` / PWA shell behavior.

### Handoffs

Always save handoff documents generated by `/mattpocock-skills:handoff` or session summaries directly into the workspace's local `.scratch/` directory (e.g. `.scratch/<project>-handoff-<date>.md`).
