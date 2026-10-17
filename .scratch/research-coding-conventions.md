# Modern Coding Standards, Readability Guidelines, & Linting Rules

> Research Date: 2026-10-10  
> Context: Badminque (Next.js PWA Offline Frontend + Python FastAPI Mathematical Backend)

---

## 1. Executive Summary & Core Philosophy

1. **Readability is maintainability**: Code is read 10x more often than it is written. Clever one-liners and nested expressions are liabilities.
2. **Strict boundaries, flexible cores**:
   - Validate and type-check strictly at system I/O boundaries (HTTP requests, URL params, local IndexedDB storage).
   - Keep internal domain and mathematical calculations lightweight, typed, and predictable.
3. **Fail fast & unnest**: Apply early returns and guard clauses (the "Bouncer Pattern") to eliminate indentation drift and cognitive overload.
4. **Zero tolerance for untyped escapes**: Never use `any` in TypeScript or unannotated `Any` in Python without strict type narrowing.

---

## 2. TypeScript, React, and Next.js Standards

### 2.1 Clean Code & Component Design
- **Single Responsibility Principle (SRP)**: A component should render UI, coordinate state, or handle data fetching—never all three at once.
- **Size Limits**: Target <= 150 lines per React component. If a component exceeds 200 lines, extract subcomponents or custom hooks.
- **Canonical Naming Conventions**:
  - **Boolean props/state**: Prefix with `is`, `has`, `can`, or `should` (e.g., `isOnline`, `hasPendingSync`, `canSubmitMatch`).
  - **Event Handlers**:
    - Prop contract: `on[Event]` (e.g., `onScoreChange`, `onPlayerClaim`).
    - Internal handler implementation: `handle[Event]` (e.g., `handleScoreChange`, `handlePlayerClaim`).
  - **Custom Hooks**: Prefix with `use` (e.g., `useClubNightSession`, `useOfflineRoster`).

### 2.2 Why Nested Ternaries Are Harmful (And What to Use Instead)
Chaining ternary expressions (`a ? b : c ? d : e ? f : g`) is a notorious readability anti-pattern.

#### The Harm:
1. **Exponential Cognitive Load**: The human brain must juggle multiple simultaneous conditional branches and their inverse states while scanning JSX.
2. **Indentation & Formatting Fragility**: Linters and Prettier often wrap nested ternaries awkwardly, making diff reviews messy and error-prone.
3. **Hidden Bugs & Falsy Fallthrough**: A misplaced colon `:` can silently change branch precedence, causing subtle runtime visual regressions.
4. **Violates ESLint Standards**: Enforced by the standard ESLint rule: `"no-nested-ternary": "error"`.

#### Recommended Clean Replacements:
- **Early Returns / Guard Clauses** for top-level states (loading, error, empty).
- **Lookup Tables (`Record<Key, Value>`)** for mapping fixed status enums to UI labels/colors.
- **Component Extraction** for handling distinct branches cleanly.

### 2.3 Early Returns & Guard Clauses (The Bouncer Pattern)
In business logic, rating calculations, and event handlers, eliminate `else` blocks and reduce indentation by handling invalid states, edge cases, and preconditions at the top of the function.

### 2.4 Strict Typing & TypeScript Best Practices
- **Strict Mode**: Enable `"strict": true`, `"noImplicitAny": true`, `"strictNullChecks": true`, and `"noUncheckedIndexedAccess": true` in `tsconfig.json`.
- **Zero `any`**: Treat `any` as a compile-time bug. If an input type is unknown (e.g., IndexedDB blob or incoming network response), type it as `unknown` and validate via **Zod** or a type guard.
- **The `satisfies` Operator**: Use `satisfies` instead of type annotations `as SomeType` when you want type-checking without widening literal types.
- **Discriminated Unions**: Represent state machines explicitly rather than maintaining optional flags.

### 2.5 Common React Anti-Patterns & Pitfalls
1. **The `0` / Falsy Render Bug with `&&`**:
   - `count && <Badge />` renders literal `0` when `count === 0`.
   - *Fix*: Always use `{count > 0 && <Badge />}` or `{Boolean(count) && <Badge />}`.
2. **`useEffect` for Derived State**: Calculate derived values directly during render; wrap in `useMemo` only if profiling indicates a bottleneck.
3. **Array Index as `key`**: Use immutable domain UUIDs (`key={player.id}`).
4. **State Mutation**: Never mutate state arrays/objects in place; create fresh references (`[...prev, item]`).

### 2.6 Next.js (App Router) Boundaries & Best Practices
- **Server Components by Default**: Pages and layout trees default to Server Components.
- **Push `"use client"` to the Leaf Nodes**: Keep interactive client components as small, localized leaves.
- **Serialization Boundary Safety**: Never pass non-serializable objects (Date instances, class instances, functions) across the boundary; serialize to ISO-8601 strings or primitives.
- **Server Actions Discipline**: Treat Server Action parameters as untrusted input; validate with Zod.
- **Protect Server Secrets**: Import `import 'server-only'` into database utility files.

---

## 3. Python and FastAPI Standards

### 3.1 PEP 8 & Pythonic Idioms
- **Naming Conventions**: `snake_case` for functions/variables, `PascalCase` for classes/Pydantic schemas, `UPPER_SNAKE_CASE` for constants.
- **Line Length**: 88 characters (Black / Ruff standard).
- **Explicit Imports**: Never use wildcard imports (`from module import *`).
- **"Flat is better than nested"**: Refactor nested conditional blocks into guard clauses.

### 3.2 Modern Type Hints (Python 3.10+)
- **Built-in Generics (PEP 585)**: Use `list[str]`, `dict[str, Any]`, `set[UUID]` directly from Python built-ins.
- **Union Syntax (PEP 604)**: Use pipe notation `str | None` instead of `Optional[str]`.
- **`typing.Annotated` for FastAPI**: Use `Annotated[AsyncSession, Depends(get_db)]` for clean dependency injection.
- **Structural Typing with `Protocol`**: Use `typing.Protocol` for swappable interfaces (e.g. rating calculators).

### 3.3 Pydantic v2 vs. Standard Dataclasses
1. **At the API Boundary**: Use **Pydantic v2** (`BaseModel`) for validating incoming offline match sync batches, parsing score limits ($0 \le score \le 30$), and formatting JSON responses.
2. **In the Rating Calculation Engine**: Convert validated payloads into frozen, slotted **Dataclasses** (`@dataclass(slots=True, frozen=True)`) for executing the iterative rating fold over hundreds of matches with zero parsing overhead.

### 3.4 Defensive Error Handling & Transaction Safety
- **Custom Domain Exception Hierarchy**: Inherit from a common `BadminqueError` base class.
- **Centralized FastAPI Exception Handlers**: Catch domain exceptions at application boundaries and return `RFC 7807 Problem Details`.
- **Context Managers for DB Transactions**: Ensure transactions commit together or roll back atomically.
- **No Bare `except:`**: Never swallow exceptions silently.

### 3.5 Modern Ruff Configuration
Use **Ruff** for linting, formatting, import sorting, and code upgrades (`pyproject.toml`).
