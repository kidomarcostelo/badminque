# Badminque Coding Standards & Style Guide

These are the canonical coding conventions, style rules, and linting guidelines for all contributors (human and AI) working on Badminque.

---

## 1. General Readability & Control Flow

### 1.1 Ban on Nested Ternaries
- **Rule**: Chained or nested ternary expressions (`a ? b : c ? d : e`) are strictly prohibited in both TypeScript (including JSX conditional rendering) and Python.
- **Allowed**: A single, simple inline ternary is permitted only for trivial assignments:
  ```ts
  const statusLabel = isWinner ? "Winner" : "Runner-up";
  ```
- **Replacements for complex branches**:
  - **Early Returns / Guard Clauses**: Handle loading, error, and empty states at the top of functions.
  - **Lookup Tables (`Record<Key, Value>`)**: Use exhaustive mapping objects for status codes or enum-to-UI mappings.
  - **Component Extraction**: Break separate conditional sub-trees into dedicated subcomponents.

### 1.2 Guard Clauses (The Bouncer Pattern)
- Handle invalid arguments, authentication checks, edge cases, and preconditions at the top of the function with immediate returns.
- Keep the happy path at the lowest possible indentation level. Avoid wrapping core logic in deep `if / else` blocks.

### 1.3 Descriptive Naming & Anti-Abbreviation Policy
- Variables, functions, parameters, and types must describe their domain intent:
  - `doublesRating`, `rosterPlayer`, `activeCourtMatch`, `sequenceNumber`.
- Cryptic abbreviations (`pr`, `m`, `clt`, `sq`, `btn`) are prohibited.
- The only permitted single-letter variables are standard loop indices (`i, j`) or mathematical coordinates (`x, y`).

### 1.4 No Bare Magic Numbers or Strings
- All domain constants and threshold values must be declared as named constants or enums:
  - Standard winning score: `STANDARD_SET_WIN_SCORE = 21`
  - Overtime cap: `OVERTIME_SET_CAP = 30`
  - Default baseline rating: `INITIAL_RATING_BASELINE = 1500.0`
  - Weak-link sensitivity: `WEAK_LINK_GAMMA = 0.08`
- Match disciplines (`"singles"`, `"doubles"`) and formats (`"SINGLE_21"`, `"BEST_OF_3"`) must use typed string enums.

---

## 2. TypeScript & Frontend Standards (Next.js / React)

### 2.1 Function & Component Style
- **Named Function Declarations**: Use explicit function declarations for top-level React components rather than anonymous arrow functions:
  ```tsx
  // ✅ PREFERRED
  export function CourtStationCard({ court, onScoreSubmit }: CourtCardProps) { ... }
  ```
- **Explicit Return Types**: All exported utility functions and API service helpers must declare explicit return types. (Local internal variables can rely on TypeScript type inference).
- **Component Sizing Guideline**: Aim for a soft target of $\le 150$ lines per React component and $\le 250$ lines per file. When a component grows beyond this, consider decomposing it into sub-components or custom hooks (`useOfflineRoster`, `useMatchQueue`).

### 2.2 Strict Type Safety
- **Zero `any`**: `any` is treated as a compile error. Use `unknown` paired with Zod schemas or type narrowing guards.
- **No Non-Null Assertions (`!`)**: Do not bypass the compiler with `val!`. Use optional chaining (`val?.property`) or explicit truthiness guards.
- **Zero Suppressions**: Never silence compiler errors or linter warnings with `@ts-ignore`, `@ts-expect-error`, or `@ts-nocheck`.
- **Use `satisfies`**: Use the `satisfies` operator to validate constants against a type contract without widening literal types.

### 2.3 React Pitfalls & Best Practices
- **No Falsy `0` Bug in JSX**: Never use `{count && <Component />}` because a count of `0` renders the number `0` onto the page. Always use `{count > 0 && <Component />}` or `{Boolean(count) && <Component />}`.
- **No `useEffect` for Derived State**: Calculate derived or filtered values directly during render (wrap in `useMemo` only if profiling proves a bottleneck).
- **Stable Keys**: Always use stable domain UUIDs for list keys (`key={player.id}`), never array indices (`key={index}`).
- **Immutable State Updates**: Never mutate state arrays or objects in place. Always return fresh copies (`[...prev, newItem]`).

### 2.4 Offline Storage Abstraction
- UI components must **never** call browser `indexedDB` APIs directly.
- All offline operations must be encapsulated in a typed service layer (`storageService.ts`), accessed by React components through custom hooks.

---

## 3. Python & Backend Standards (FastAPI)

### 3.1 PEP 8 & Pythonic Idioms
- Naming: `snake_case` for modules/functions/variables, `PascalCase` for classes/Pydantic schemas, `UPPER_SNAKE_CASE` for constants.
- Line length: 88 characters (Black / Ruff standard).
- No wildcard imports (`from module import *` is banned).

### 3.2 Modern Python 3.10+ Type Hints
- Use built-in generic types: `list[str]`, `dict[str, Any]`, `set[UUID]` (do not import `List`, `Dict` from `typing`).
- Use pipe syntax for unions and optionals: `str | None` (avoid `Optional[str]`), `int | float`.
- Use `typing.Annotated` for FastAPI dependency injection:
  ```python
  DbSession = Annotated[AsyncSession, Depends(get_db_session)]
  ```

### 3.3 Data Modeling: Pydantic vs. Dataclasses
- **At the Network Boundary**: Use **Pydantic v2** (`BaseModel`) for validating incoming API sync payloads, parsing score limits ($0 \le score \le 30$), and generating OpenAPI schemas.
- **In Core Mathematical Loops**: Use frozen, slotted **`@dataclass(slots=True, frozen=True)`** in the rating engine for zero-overhead performance and immutability during match fold calculations.

### 3.4 Error Handling & Transactions
- Define explicit domain exceptions inheriting from `BadminqueError`.
- Catch domain exceptions at application boundaries with centralized FastAPI exception handlers returning `RFC 7807 Problem Details`. Never leak raw unhandled 500 stack traces.
- Enforce database transaction atomicity with async context managers (`async with session.begin():`).
- No bare `except:` or silent `except Exception: pass`.

### 3.5 Mathematical Documentation
- Every rating calculation function must include a docstring citing the specific mathematical formula defined in `docs/research/rating-algorithm-spec.md`.

---

## 4. Linting, Formatting & Tooling Enforcement

- **Python**: Enforce **Ruff** for linting, formatting, and import sorting.
- **TypeScript**: Enforce **ESLint 9** Flat Config with `typescript-eslint` strict type checking + **Prettier**.
- **Quality Gate**: A single lint warning or type error will fail CI. Zero quality downgrades.
