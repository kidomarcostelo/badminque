# Frontend Coding Conventions

> **Status**: Active  
> **Applies to**: `apps/web/src/` — Next.js 15 / React 19 / TypeScript / Tailwind CSS  
> **Pairs with**: [`CODING_STANDARDS.md`](../../CODING_STANDARDS.md) (general), [`ADR 0003`](adr/0003-google-stitch-design-system.md) (design system)

---

## Purpose

These conventions exist to prevent three failure modes that make frontend codebases unmaintainable over time:

1. **File Clutter** — Unmapped, ad-hoc files accumulate with no clear ownership.
2. **Inconsistency** — Multiple competing patterns emerge across features.
3. **Monolith Components** — Logic, state, and UI collapse into a single unmanageable file.

Every rule below directly targets one of these failure modes.

---

## Table of Contents

1. [Directory Layout & File Ownership](#1-directory-layout--file-ownership)
2. [File Naming Conventions](#2-file-naming-conventions)
3. [Component Architecture Rules](#3-component-architecture-rules)
4. [Tailwind & Styling Conventions](#4-tailwind--styling-conventions)
5. [TypeScript Discipline](#5-typescript-discipline)
6. [React Patterns](#6-react-patterns)
7. [Hooks & State Management](#7-hooks--state-management)
8. [Import Discipline](#8-import-discipline)
9. [Forbidden Patterns (Hard Stops)](#9-forbidden-patterns-hard-stops)
10. [Quick Reference Cheatsheet](#10-quick-reference-cheatsheet)

---

## 1. Directory Layout & File Ownership

### 1.1 Canonical `src/` Structure

```
apps/web/src/
├── app/                        # Next.js App Router pages & layouts (thin shells only)
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── features/                   # Feature slices (see §1.2)
│   ├── courts/
│   ├── roster/
│   ├── matches/
│   ├── sessions/
│   ├── leaderboard/
│   ├── passport/
│   ├── claims/
│   ├── sync/
│   └── pwa/
├── hooks/                      # Truly cross-cutting hooks (no feature affinity)
└── services/                   # API client, storage service, mock fixtures
```

> [!IMPORTANT]
> `app/` pages must be **thin shells**. They import from `features/` and render layout. No business logic, no inline state, no fetch calls inside `app/page.tsx`.

### 1.2 Feature Slice Layout

Every feature folder follows this exact structure — no exceptions:

```
features/<feature>/
├── index.ts                    # Barrel: public exports only (components + hooks)
├── types.ts                    # Feature-local types, enums, constants (if needed)
├── use<Feature>.ts             # Primary data/state hook for this feature
├── use<Feature>.test.ts        # Co-located hook test
├── <FeatureView>.tsx           # Container / orchestrator component
├── <FeatureView>.test.tsx
├── <SubComponent>.tsx          # Presentational sub-components
└── <SubComponent>.test.tsx
```

**Rules:**
- One `index.ts` per feature. It is the **only** export surface. External code imports from `features/roster`, never from `features/roster/RosterCheckInList`.
- `types.ts` holds feature-local types. Types shared across features go into `@badminque/core`.
- Never create a bare `components/` folder inside a feature. Sub-components live alongside their parent.

### 1.3 When to Create a New Feature

A new feature folder is warranted when:

- It has its own data fetching or state lifecycle (needs a `use*.ts` hook), **AND**
- It is surfaced to the user as a distinct interaction (a card, modal, page section).

Resist the urge to create a feature for a purely presentational piece. It belongs inside the nearest existing feature as a sub-component.

### 1.4 Cross-Cutting Hooks (`hooks/`)

The `src/hooks/` directory is reserved for hooks that have **no single feature owner** — e.g., `useStorage`, `useOnlineStatus`. If a hook is only used in one feature, it must live inside that feature folder, not in `hooks/`.

---

## 2. File Naming Conventions

| Artifact | Convention | Example |
|---|---|---|
| React component | `PascalCase.tsx` | `CourtStationCard.tsx` |
| Component test | `PascalCase.test.tsx` | `CourtStationCard.test.tsx` |
| Hook | `camelCase.ts` with `use` prefix | `useRoster.ts` |
| Hook test | `camelCase.test.ts` | `useRoster.test.ts` |
| Service / utility | `camelCase.ts` | `storageService.ts`, `apiClient.ts` |
| Service test | `camelCase.test.ts` | `storageService.test.ts` |
| Types file | `types.ts` (flat) | `features/courts/types.ts` |
| Barrel export | `index.ts` (never `index.tsx`) | `features/roster/index.ts` |
| Page (App Router) | `page.tsx`, `layout.tsx` | `app/page.tsx` |

> [!CAUTION]
> Never use `kebab-case` for `.tsx` files. Next.js App Router uses it for route segments (`app/club-night/page.tsx`) but all component files must be `PascalCase`.

---

## 3. Component Architecture Rules

### 3.1 Three-Layer Component Model

Every UI piece belongs to exactly **one** of these three layers:

| Layer | Responsibility | Lives In |
|---|---|---|
| **Page Shell** | Composes feature components, sets layout | `app/` |
| **Feature Container** | Owns state, calls hooks, coordinates sub-components | `features/<feature>/<FeatureView>.tsx` |
| **Presentational** | Renders props only, no hooks except `useCallback`/`useMemo` | `features/<feature>/<SubComponent>.tsx` |

A single component must never cross two layers. If it starts owning state *and* rendering complex UI, it must be decomposed.

### 3.2 Hard Size Limits

| Artifact | Soft Limit | Hard Limit (CI Failure) |
|---|---|---|
| React component | 150 lines | 300 lines |
| Hook file | 100 lines | 200 lines |
| Service file | 150 lines | 250 lines |
| `types.ts` | 60 lines | 120 lines |

When a file approaches the soft limit, it **must** be decomposed. When it hits the hard limit, the CI pipeline fails.

> [!TIP]
> The `RosterCheckInList` component (360 lines) is a known violation earmarked for decomposition. The table rows should be extracted to `RosterPlayerRow.tsx`, and the suggestions dropdown to `RosterSuggestionDropdown.tsx`.

### 3.3 Component Declaration Style

Always use **named function declarations** for exported components:

```tsx
// ✅ CORRECT
export function CourtStationCard({ court, onDispatch }: CourtStationCardProps): React.JSX.Element {
  ...
}

// ❌ WRONG — anonymous arrow function
export const CourtStationCard = ({ court }: CourtStationCardProps) => { ... };

// ❌ WRONG — default export
export default function CourtStationCard(...) { ... }
```

**Why**: Named function declarations appear with their name in React DevTools, stack traces, and profiler flamegraphs. Default exports break tree-shaking and make refactoring barrel imports error-prone.

### 3.4 Props Interface Convention

```tsx
// ✅ Every component has a co-located Props interface, named <ComponentName>Props
export interface CourtStationCardProps {
  court: CourtStationData;
  onDispatch?: (courtId: number) => void;   // Event callback: on[Event]
  onEnterScore?: (courtId: number) => void;
}
```

**Rules:**
- Prop interface always lives in the **same file** as the component (not in `types.ts`).
- Event handler props use `on[Event]` naming.
- Internal handlers use `handle[Event]` naming.
- Boolean props use `is`, `has`, `can`, or `should` prefix: `isOpen`, `hasError`, `canSubmit`.

### 3.5 Guard Clause First, Happy Path Last

Render guard clauses (loading, error, empty) at the **top** of the component before the main return:

```tsx
export function MatchScoreEntryModal({ match, isOpen }: MatchScoreEntryModalProps): React.JSX.Element {
  const { data, isLoading, error } = useMatchRecording(match.id);

  // ✅ Guard clauses first
  if (!isOpen) return <></>;
  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorBanner message={error.message} />;

  // ✅ Happy path at lowest indentation
  return (
    <div>...</div>
  );
}
```

---

## 4. Tailwind & Styling Conventions

### 4.1 Stitch Token-First Rule

Always prefer **Google Stitch semantic tokens** over raw Tailwind utility values. Never hardcode hex colors.

```tsx
// ✅ CORRECT — semantic Stitch tokens
<div className="bg-surface border border-outline-variant text-on-surface">

// ✅ CORRECT — standard Tailwind for spacing/layout
<div className="flex flex-col gap-3 p-4 rounded-xl">

// ❌ WRONG — raw hex in className
<div style={{ backgroundColor: '#f8fafc' }}>

// ❌ WRONG — arbitrary Tailwind value with no semantic meaning
<div className="bg-[#f8fafc]">
```

**Available Stitch tokens** (defined in `tailwind.config.ts`):

| Token | Purpose |
|---|---|
| `bg-surface`, `bg-surface-dim`, `bg-surface-bright` | Page and panel backgrounds |
| `bg-surface-container` through `bg-surface-container-highest` | Nested card layers |
| `text-on-surface`, `text-on-surface-variant` | Body and secondary text |
| `border-outline-variant` | Standard dividers and card borders |
| `text-primary`, `bg-primary` | Indigo brand actions |
| `silk-extruded`, `silk-extruded-sm` | Raised card surfaces |
| `silk-sunken`, `silk-sunken-shallow` | Recessed wells |
| `silk-btn-primary` | Primary CTA button |
| `court-active` | Active court focus ring |

### 4.2 Class Name Order

Sort Tailwind classes in this order to maximize readability and diff clarity:

1. Layout (`flex`, `grid`, `block`)
2. Sizing (`w-`, `h-`, `min-h-`, `max-w-`)
3. Spacing (`p-`, `m-`, `gap-`, `space-`)
4. Borders (`border`, `rounded-`)
5. Background (`bg-`, `silk-*`)
6. Typography (`font-`, `text-`, `tracking-`, `leading-`)
7. Effects (`shadow-`, `opacity-`, `transition-`, `animate-`)
8. States (`hover:`, `active:`, `focus:`, `disabled:`)

> [!TIP]
> Install the **Tailwind CSS IntelliSense** VSCode extension. It enforces this ordering automatically with the `tailwindcss/classnames-order` Prettier plugin.

### 4.3 Complex Class Expressions

When a className involves branching logic, extract to a `const` above the JSX — never inline complex template literals:

```tsx
// ✅ CORRECT — extracted class map
const STATE_STYLE_MAP: Record<CourtState, StateBadgeStyle> = {
  IN_MATCH: { border: 'border-amber-300', badge: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  IDLE:     { border: 'border-outline-variant', badge: 'bg-slate-100 text-slate-500', dot: 'bg-slate-400' },
  ...
};

// ❌ WRONG — complex inline ternary in JSX className
<div className={`border ${state === 'IN_MATCH' ? 'border-amber-300' : state === 'IDLE' ? 'border-outline-variant' : 'border-emerald-300'}`}>
```

### 4.4 No `style` Prop for Layout

Never use inline `style` props for layout or spacing. Use Tailwind utilities. The `style` prop is reserved exclusively for dynamic CSS custom properties:

```tsx
// ✅ ONLY acceptable use of style prop
<div style={{ '--progress': `${percent}%` } as React.CSSProperties}>

// ❌ WRONG — layout via style prop
<div style={{ display: 'flex', gap: '8px', padding: '12px' }}>
```

### 4.5 Typography Tokens

Always use the semantic font family classes, never raw `font-sans` or `font-mono`:

| Class | Font | Use For |
|---|---|---|
| `font-body-base` | Plus Jakarta Sans | Body text, player names, labels |
| `font-headline-sm` / `font-headline-md` | Plus Jakarta Sans | Section headings, button labels |
| `font-mono-data` | JetBrains Mono | Ratings, scores, numeric data |
| `font-mono-badge` | JetBrains Mono | Status pills, ID badges |
| `font-mono` | JetBrains Mono | Court keys, timestamps, codes |

---

## 5. TypeScript Discipline

### 5.1 Explicit Return Types on All Exports

```tsx
// ✅ CORRECT — explicit return type
export function formatTimer(seconds: number): string { ... }
export function CourtStationCard(...): React.JSX.Element { ... }

// ❌ WRONG — inferred return type on exported function
export function formatTimer(seconds: number) { ... }
```

Local variables and internal helper functions may rely on inference.

### 5.2 Zero `any` — Use `unknown` + Zod

```tsx
// ✅ CORRECT — unknown + Zod guard
function parseStorageBlob(raw: unknown): PlayerState {
  return PlayerStateSchema.parse(raw);
}

// ❌ WRONG
function parseStorageBlob(raw: any): PlayerState { ... }
```

### 5.3 Discriminated Unions for State Machines

Model UI state as a discriminated union, never as a bag of optional booleans:

```tsx
// ✅ CORRECT — discriminated union
type SyncState =
  | { status: 'idle' }
  | { status: 'syncing'; jobId: string }
  | { status: 'error'; message: string }
  | { status: 'success'; syncedAt: Date };

// ❌ WRONG — boolean soup
interface SyncState {
  isSyncing?: boolean;
  hasError?: boolean;
  errorMessage?: string;
  lastSyncedAt?: Date;
}
```

### 5.4 `satisfies` for Constant Validation

```tsx
// ✅ Use satisfies to validate a constant against a type without widening
const TIER_LABELS = {
  BEGINNER: 'Beginner',
  INTERMEDIATE: 'Intermediate',
  ADVANCED: 'Advanced',
} satisfies Record<SkillTier, string>;
```

### 5.5 No Non-Null Assertions

```tsx
// ✅ CORRECT — optional chaining
const name = player?.name ?? 'Unknown';

// ❌ WRONG — non-null assertion
const name = player!.name;
```

---

## 6. React Patterns

### 6.1 JSX Conditional Rendering

**Rule**: Never use `&&` with a numeric/falsy left-hand side. Always coerce to boolean or use `> 0`:

```tsx
// ✅ CORRECT
{suggestions.length > 0 && <SuggestionDropdown />}
{Boolean(pendingCount) && <SyncBadge count={pendingCount} />}

// ❌ WRONG — renders literal "0" when count is 0
{suggestions.length && <SuggestionDropdown />}
```

### 6.2 List Keys

Use stable domain UUIDs from your data model, never array indices:

```tsx
// ✅ CORRECT
{roster.map((player) => <PlayerRow key={player.id} player={player} />)}

// ❌ WRONG
{roster.map((player, index) => <PlayerRow key={index} player={player} />)}
```

### 6.3 `useMemo` / `useCallback` Policy

- **Don't** memoize by default — it adds noise and cognitive overhead.
- **Do** memoize when: (a) profiling proves a bottleneck, or (b) the value is passed as a prop to a `React.memo` component.
- **Never** use `useEffect` to sync derived state. Compute it inline or in a `useMemo`.

```tsx
// ✅ CORRECT — derived value computed inline
const filteredRoster = normalizedQuery.length === 0
  ? roster
  : roster.filter((p) => p.name.toLowerCase().includes(normalizedQuery));

// ❌ WRONG — useEffect to derive state
useEffect(() => {
  setFilteredRoster(roster.filter(...));
}, [roster, searchQuery]);
```

### 6.4 `'use client'` Placement

Push `'use client'` to the **leaf** of the component tree. Parent layout files must remain Server Components.

```
app/page.tsx           → Server Component (no 'use client')
  └── features/courts/CourtStationCard.tsx  → 'use client' (leaf)
```

### 6.5 Async Event Handlers

Async event handlers must be explicitly typed and their floating promises must be handled:

```tsx
// ✅ CORRECT — void operator to suppress floating promise linter warning
<button onClick={() => void handleCheckIn()}>

// ✅ CORRECT — fully typed async handler
const handleCheckIn = async (event: React.FormEvent): Promise<void> => {
  event.preventDefault();
  ...
};

// ❌ WRONG — unhandled floating promise in JSX
<button onClick={async () => { await handleCheckIn(); }}>
```

---

## 7. Hooks & State Management

### 7.1 Hook Responsibility Boundary

A custom hook owns **exactly one** of:

- Data fetching + cache (e.g., `useCourts`)
- Form / input state (e.g., `useCheckInForm`)
- Domain side effects (e.g., `useSync`)

A hook that owns both data fetching *and* form state must be split.

### 7.2 Hook Return Shape

Return a named object (not a tuple) unless the hook is a simple toggle:

```tsx
// ✅ CORRECT — named object, easy to destructure selectively
export function useRoster(clubId?: string) {
  return { roster, suggestions, searchQuery, setSearchQuery, checkInPlayer };
}

// ❌ WRONG — positional tuple (order-sensitive, harder to extend)
export function useRoster(): [RosterPlayer[], string, (q: string) => void] { ... }
```

### 7.3 Storage Access Rule

UI components and hooks must **never** call `indexedDB` APIs directly. All storage access is channelled through `storageService.ts`, accessed through the `useStorage` hook.

```tsx
// ✅ CORRECT — through service layer
import { storageService } from '@/services/storageService';
const players = await storageService.getRosterPlayers(clubId);

// ❌ WRONG — raw IndexedDB access in a component
const db = await openDB('badminque', 1);
const players = await db.getAll('players');
```

---

## 8. Import Discipline

### 8.1 Import Order

Enforce this order (the ESLint `import/order` rule enforces it):

1. React (`import React from 'react'`)
2. External packages (`@badminque/core`, third-party)
3. Internal absolute paths (`@/services/`, `@/hooks/`)
4. Feature-relative imports (`./CourtStationCard`, `./types`)
5. Type-only imports (`import type { ... }`)

Separate each group with a blank line.

### 8.2 Barrel Imports Only

Always import from the feature barrel (`index.ts`), never from internal paths:

```tsx
// ✅ CORRECT
import { RosterCheckInList, useRoster } from '@/features/roster';

// ❌ WRONG — imports from internal implementation file
import { RosterCheckInList } from '@/features/roster/RosterCheckInList';
```

**Exception**: Within a feature folder, sibling imports are direct (not via barrel) to avoid circular deps.

### 8.3 `type` Keyword for Type Imports

```tsx
// ✅ CORRECT
import type { CourtState } from '@badminque/core';
import type { CourtStationData } from './types';

// ❌ WRONG — runtime import of a type-only artifact
import { CourtState } from '@badminque/core';
```

---

## 9. Forbidden Patterns (Hard Stops)

The following patterns are **strictly prohibited**. CI will fail and PRs will be blocked.

| Pattern | Reason | Alternative |
|---|---|---|
| `// @ts-ignore` / `@ts-expect-error` | Silences type safety | Fix the type, use `unknown` + Zod |
| `any` type | Erases all type safety | `unknown` + type guard |
| `val!` non-null assertion | Runtime crash risk | Optional chaining + guard clause |
| Nested ternary in JSX | Unreadable, error-prone | Lookup table, early return, extraction |
| `key={index}` in lists | List reorder / animation bugs | Stable UUID from domain model |
| Inline `style={{ display, padding }}` | Circumvents Tailwind system | Tailwind utilities |
| `export default` for components | Breaks DevTools, refactor-hostile | Named export |
| Raw IndexedDB in components | Bypasses service abstraction layer | `storageService.ts` via hook |
| `useEffect` for derived state | Causes extra render cycles | Inline computation or `useMemo` |
| `import { X } from '../../features/y/X'` | Bypasses barrel contract | Import from barrel `index.ts` |
| Hardcoded hex / `bg-[#hex]` | Breaks Stitch theming system | Semantic token (`bg-primary`, `bg-surface`) |
| `font-sans` / `font-mono` (bare) | Bypasses typography system | `font-body-base`, `font-mono-data` |
| Component > 300 lines | Monolith, unnavigable | Extract sub-component or hook |

---

## 10. Quick Reference Cheatsheet

```
STRUCTURE
  app/           → thin shells only, no logic
  features/      → feature slices (index.ts + use*.ts + Components)
  hooks/         → cross-cutting hooks only
  services/      → apiClient, storageService

NAMING
  Components     PascalCase.tsx
  Hooks          useFeatureName.ts
  Barrels        index.ts (never .tsx)
  Types          types.ts (per-feature) or @badminque/core (shared)
  Handlers       on[Event] (prop) / handle[Event] (impl)
  Booleans       is*, has*, can*, should*

COMPONENTS
  3 layers       Page Shell → Feature Container → Presentational
  Soft / Hard    150 / 300 lines per component file
  Declaration    named function export, never default, never arrow
  Guard first    loading/error/empty guards at top, happy path last

TAILWIND
  Token first    bg-surface, border-outline-variant, text-primary
  Spacing        Tailwind utilities only, no inline style
  Complex class  Record<State, ClassString> lookup table, never nested ternary
  Typography     font-body-base, font-headline-sm, font-mono-data

TYPESCRIPT
  Returns        explicit on all exported functions/components
  State          discriminated unions, not boolean bags
  Falsy          never `val!`, use optional chaining
  Constants      use `satisfies` to validate without widening
  Types          import type { ... }

REACT
  &&             always `count > 0 &&`, never `count &&`
  keys           stable UUID, never array index
  useMemo        only when profiling proves needed
  'use client'   push to leaf components
  async handler  void operator or typed Promise<void>

FORBIDDEN
  @ts-ignore     any     val!     key={index}     export default
  useEffect for derived state     raw IndexedDB     nested ternary
  hardcoded hex  font-sans / font-mono (bare)
```

---

*Last updated: 2026-11-25. Maintained by: Engineering team. Changes require a PR with ADR or inline rationale.*
