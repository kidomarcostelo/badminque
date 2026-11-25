# Frontend Coding Conventions — Agent Rule

This document is the **agent-facing enforcement summary** of `docs/frontend-coding-conventions.md`.  
Read the full spec before creating or modifying any file under `apps/web/src/`.

---

## Mandatory Pre-Flight Checks

Before writing any new frontend file, answer these:

1. **Which layer does this belong to?** Page Shell / Feature Container / Presentational  
2. **Which feature folder owns it?** File must live inside `features/<feature>/`  
3. **Is there already a barrel export?** Add new exports to `index.ts`  
4. **Does it need a co-located test?** Yes — always. `Component.tsx` → `Component.test.tsx`

---

## Directory Law

```
apps/web/src/
├── app/           ← thin shells ONLY. No logic, no state, no fetch.
├── features/      ← ALL components, hooks, and feature-local types live here
│   └── <feature>/
│       ├── index.ts         ← only export surface (barrel)
│       ├── types.ts         ← feature-local types (optional)
│       ├── use<Feature>.ts  ← primary data/state hook
│       └── <Component>.tsx  ← components (never nested inside /components/)
├── hooks/         ← ONLY truly cross-cutting hooks (no feature affinity)
└── services/      ← apiClient.ts, storageService.ts, mockFixtures.ts
```

**Never**:
- Create a `components/` subfolder inside a feature
- Place a component with a single feature owner in `hooks/`
- Create a new feature folder for a purely presentational sub-component (it goes inside the existing feature)

---

## File Naming Law

| Artifact | Rule | Example |
|---|---|---|
| Component | `PascalCase.tsx` | `PlayerStatusBadge.tsx` |
| Component test | `PascalCase.test.tsx` | `PlayerStatusBadge.test.tsx` |
| Hook | `use<Name>.ts` | `useRoster.ts` |
| Hook test | `use<Name>.test.ts` | `useRoster.test.ts` |
| Service | `camelCase.ts` | `storageService.ts` |
| Barrel | `index.ts` (never `.tsx`) | `features/roster/index.ts` |
| Types | `types.ts` | `features/courts/types.ts` |

Kebab-case is **only** for Next.js App Router segments (`app/club-night/page.tsx`), never for component files.

---

## Component Rules (Hard Constraints)

### Declaration
```tsx
// ✅ ALWAYS — named function declaration, explicit return type
export function PlayerStatusBadge({ status }: PlayerStatusBadgeProps): React.JSX.Element { ... }

// ❌ NEVER — no default export, no anonymous arrow at module level
export default function PlayerStatusBadge(...) { ... }
export const PlayerStatusBadge = (...) => { ... };
```

### Props Interface
```tsx
// ✅ Co-located in same file, named <ComponentName>Props
export interface PlayerStatusBadgeProps {
  status: PlayerState;
  isCompact?: boolean;        // boolean: is/has/can/should prefix
  onStatusChange?: () => void; // callback: on[Event]
}
```

### Size Limits
- **Soft**: 150 lines → consider decomposing  
- **Hard**: 300 lines → **must** decompose before merging

### Guard Clauses First
```tsx
export function MatchView({ match, isOpen }: MatchViewProps): React.JSX.Element {
  if (!isOpen) return <></>;      // guard first
  if (!match) return <Spinner />; // guard first
  return <div>...</div>;          // happy path last
}
```

---

## Tailwind Rules (Hard Constraints)

### Token First
```tsx
// ✅ Semantic Stitch tokens
<div className="bg-surface border border-outline-variant text-on-surface silk-extruded rounded-xl">

// ❌ Never hardcode hex or use arbitrary values
<div className="bg-[#f8fafc]">
<div style={{ backgroundColor: '#f8fafc' }}>
```

**Core token vocabulary**:
- Surfaces: `bg-surface`, `bg-surface-dim`, `bg-surface-container` through `bg-surface-container-highest`
- Text: `text-on-surface`, `text-on-surface-variant`
- Borders: `border-outline-variant`
- Brand: `text-primary`, `bg-primary`, `silk-btn-primary`
- Elevation: `silk-extruded`, `silk-extruded-sm`, `silk-sunken`, `silk-sunken-shallow`
- Court state: `court-active`

### Typography Tokens
```tsx
// ✅ Always use semantic font classes
font-body-base       // body text, player names
font-headline-sm     // section heads, button labels
font-mono-data       // ratings, scores
font-mono-badge      // status pills, ID badges

// ❌ Never
font-sans / font-mono  // bypasses typography system
```

### Complex Class Logic
```tsx
// ✅ Extract to a lookup table above JSX
const STATE_STYLE: Record<CourtState, string> = {
  IDLE: 'border-outline-variant bg-slate-50',
  IN_MATCH: 'border-amber-300 bg-amber-50',
};

// ❌ Never nest ternaries inside className
className={`${state === 'IDLE' ? 'border-outline-variant' : state === 'IN_MATCH' ? 'border-amber-300' : '...'}`}
```

---

## TypeScript Rules (Hard Constraints)

```tsx
// ✅ Explicit return types on all exports
export function formatTimer(seconds: number): string { ... }

// ✅ unknown + Zod (never any)
function parse(raw: unknown): PlayerState { return PlayerStateSchema.parse(raw); }

// ✅ Discriminated union for state machines
type SyncState = { status: 'idle' } | { status: 'syncing'; jobId: string } | { status: 'error'; message: string };

// ✅ satisfies for constants
const TIER_LABELS = { BEGINNER: 'Beginner', INTERMEDIATE: 'Intermediate' } satisfies Record<SkillTier, string>;

// ✅ type imports for type-only artifacts
import type { CourtState } from '@badminque/core';

// ❌ Never
any         @ts-ignore       @ts-expect-error
val!        (non-null assertion)
```

---

## React Rules (Hard Constraints)

```tsx
// ✅ && with explicit boolean coercion
{count > 0 && <Badge />}
{Boolean(pending) && <SyncIndicator />}

// ❌ Never — renders "0" on screen
{count && <Badge />}

// ✅ Stable UUID keys
{roster.map((p) => <Row key={p.id} player={p} />)}

// ❌ Never index keys
{roster.map((p, i) => <Row key={i} player={p} />)}

// ✅ Derived state inline or useMemo
const filtered = query ? roster.filter(...) : roster;

// ❌ Never useEffect for derived state
useEffect(() => setFiltered(roster.filter(...)), [roster, query]);

// ✅ Async handler — void operator in JSX
<button onClick={() => void handleSubmit()}>

// ✅ 'use client' at leaf components only
```

---

## Import Rules

### Order (enforced by ESLint)
1. `react`
2. External packages (`@badminque/core`, third-party)
3. Internal absolute (`@/services/`, `@/hooks/`)
4. Feature-relative (`./CourtStationCard`, `./types`)
5. `import type` statements

### Barrel Contract
```tsx
// ✅ From barrel
import { RosterCheckInList } from '@/features/roster';

// ❌ From internal file
import { RosterCheckInList } from '@/features/roster/RosterCheckInList';
```

**Exception**: Within the same feature folder, sibling direct imports are allowed.

---

## Storage Access Contract

```tsx
// ✅ Via service layer
import { storageService } from '@/services/storageService';

// ❌ Never raw IndexedDB in a component or hook
const db = await openDB('badminque', 1);
```

---

## Forbidden Patterns Reference

| Pattern | Reason |
|---|---|
| `@ts-ignore` / `@ts-expect-error` | Silences type safety |
| `any` | Erases safety |
| `val!` | Runtime crash risk |
| `export default` on components | Breaks DevTools & refactoring |
| Nested ternary in JSX className | Unreadable, error-prone |
| `key={index}` | List reorder bugs |
| `style={{ padding, display }}` | Circumvents Tailwind |
| Raw `openDB` in component/hook | Bypasses service layer |
| `useEffect` for derived state | Extra render cycle |
| Import from internal file (not barrel) | Bypasses encapsulation |
| Hardcoded hex / `bg-[#hex]` | Breaks theming |
| `font-sans` / `font-mono` (bare) | Bypasses typography system |
| Component > 300 lines | Monolith |
| `components/` subfolder in feature | Wrong structure |
| New feature for presentational-only sub-component | Unnecessary fragmentation |

---

## Full Specification

→ [`docs/frontend-coding-conventions.md`](../docs/frontend-coding-conventions.md)
