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

If a concept is not yet in `GLOSSARY.md`, do not guess—flag it for domain modeling.

---

## 2. Architecture & Technology Constraints

Respect **ADR 0001** (`docs/adr/0001-tech-stack-decision.md`):

1. **Frontend**: **Next.js PWA** (React / TypeScript / Tailwind CSS). Configured for offline courtside operation using Service Workers and IndexedDB for local roster and match storage.
2. **Backend**: **Python (FastAPI)**. Houses the mathematical rating calculation engine, validation schemas, and batch sync endpoints.
3. **Database**: **Neon Serverless PostgreSQL**. Relational data with window functions (`RANK() OVER`) for club leaderboards.
4. **Cost Ceiling**: **$0.00 / month**. All services must run within free tiers (Vercel, Koyeb, Neon). Never add paid SaaS dependencies without explicit user authorization.

---

## 3. Mathematical Rating Engine Invariants

All rating calculations must strictly conform to `docs/research/rating-algorithm-spec.md`:

1. **Independent Disciplines**: Singles ($R_S$) and Doubles ($R_D$) ratings are maintained separately and never bleed into each other.
2. **Weak-Link Soft Mean**: In doubles, team rating is calculated using:
   $$R_{team} = \frac{R_1 + R_2}{2} - 0.08 \cdot |R_1 - R_2|$$
   giving 58% weight to the lower-rated partner and 42% to the higher-rated partner.
3. **Non-Inversion Invariant**: A match winner must **never** lose rating points ($\Delta R \ge 0$), and a loser must **never** gain rating points ($\Delta R \le 0$).
4. **Logarithmic MOV Multiplier**: Victory margins scale logarithmically between $0.50$ (close 21-19) and $1.75$ (crushing 21-5 blowout) with favorite-damping.
5. **Continuous $K$-Factor Decay**: Dynamic $K$-factor scaling from $K=64$ (provisional) to $K=16$ (established at $\ge 8$ matches).

---

## 4. Offline Synchronization & Data Integrity

All data exchange must follow `docs/research/sync-protocol-spec.md`:

1. **Client UUIDs**: Every match must be assigned a client-generated UUID v4 courtside.
2. **Strict Idempotency**: The server must use `ON CONFLICT (id) DO NOTHING`. Network drop retries must never double-count matches or alter ratings twice.
3. **Chronological Batch Fold**: Uploaded batches must be sorted by `(recorded_at, sequence_num)` before applying rating updates.
4. **Tricount Identity Lifecycle**: Unauthenticated roster players accumulate full match history under their permanent UUID with `auth_user_id = NULL`. Account claiming binds the user ID without mutating historical records.

---

## 5. Engineering Discipline & Quality Bar

1. **Test-Driven Development (TDD)**:
   - Write the failing test first before implementing business logic, rating formulas, or sync handlers.
   - Test against the highest testing seam (external behavior, not internal implementation details).
2. **Tracer-Bullet Vertical Slices**:
   - Deliver complete functional paths (database schema &rarr; API &rarr; UI &rarr; tests) rather than disconnected horizontal layers.
3. **Zero Quality Downgrades**:
   - Never silence linter errors with `@ts-ignore` or `# noqa`.
   - Never skip or delete existing tests to achieve green builds.
   - Preserve comments and architectural rationale.
4. **Conventional Commits**:
   - Format git commits as `feat:`, `fix:`, `docs:`, `test:`, `refactor:`.

---

## Agent skills

### Issue tracker

GitHub issues via `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Canonical five-role vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context (`GLOSSARY.md` + `docs/adr/` at repo root). See `docs/agents/domain.md`.
