# 0003. Adoption of Google Stitch Courtside Design System

Date: 2026-11-21  
Status: accepted

## Context

Badminque's Courtside Station OS is operated on tablets (10–12") and mobile devices in brightly lit recreational badminton halls by organizers with sweaty hands, gym background noise, and ambient lighting glare.

Previously, Issue #22 explored a high-contrast dark-mode prototype (`prototypes/courtside-station-v2.html`) built via Google AI Studio. While effective at establishing key functional modules, the high-contrast pure black aesthetic exhibited several ergonomic drawbacks when evaluated in real sports center environments:
1. **Specular Glare**: Overhead fluorescent and high-bay LED gymnasium lighting causes harsh reflections on dark glossy tablet screens.
2. **Elevation Ambiguity**: Dark themes make visual hierarchy of nested elevation layers (surface background, court station cards, on-deck queue pools, action sheets) harder to distinguish at arm's length.
3. **Information Density**: Rapid 15-minute court rotations require glanceable telemetry without requiring vertical scrolling.

A Google Stitch design reference (`prototypes/courtside-station-stitch.html`) was authored applying Material Design 3 (MD3) surface elevation tiers ("Silk Light Soft Depth"), dense 46px telemetry app bars, tactile extruded and sunken button wells, and an indigo action hierarchy.

## Decision

We formally adopt the **Google Stitch Courtside Design System** as the canonical design language for Badminque Station OS across PWA, tablet, and mobile views:

1. **Design System & Elevation Model**:
   - Standardize on Material Design 3 (MD3) semantic surface containers: `surface`, `surface-dim`, `surface-bright`, and elevation tiers (`surface-container-lowest` through `surface-container-highest`).
   - **Silk Light Soft Depth**: Subtle extruded cards (`.silk-extruded`, `.silk-extruded-sm`) and sunken wells (`.silk-sunken`, `.silk-sunken-shallow`) for high-glare readability and tactile depth.
2. **Color Palette & Brand Identity**:
   - **Primary Brand**: Indigo 600 (`#4f46e5`) with active gradient accents (`linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)`).
   - **Accent & Feedback**: Emerald accent (`#059669` / `#ecfdf5`) for active court states and positive delta metrics; Amber for wait states; Error containers (`#fef2f2` / `#dc2626`).
3. **Typography**:
   - **Headings, UI labels, and body text**: **Plus Jakarta Sans** (clean, modern geometric sans-serif optimized for legibility at small sizes).
   - **Rating numbers, timers, scores, and match statistics**: **JetBrains Mono** (monospaced tabular numbers preventing layout shifts).
   - **Icons**: **Material Symbols Outlined** (with Lucide Icons as component fallback).
4. **Courtside Ergonomics**:
   - Ultra-compact 46px (`h-11`) telemetry header displaying session status, battery/sync state, active player count, and court occupancy in a single glanceable horizontal bar.
   - High-contrast `.court-active` focus ring (`outline: 2px solid #6366f1`) with soft indigo glow.
   - 30-Point Quick Score keypad presets (`30-28`, `30-25`, `30-22`, etc.) with physical active press states (`transform: scale(0.97)`).
5. **Zero-Runtime Overhead**:
   - Design tokens implemented purely through Tailwind CSS configuration (`apps/web/tailwind.config.ts`) and CSS custom utilities, maintaining the $0.00/mo cost and zero heavy UI library dependencies.

## Considered Options

- **Retain AI Studio Dark Mode (`courtside-station-v2.html`)**: Kept as an optional high-contrast theme variant, but superseded as the default primary theme due to screen glare in brightly lit sports halls and lower contrast for dense tabular queue pools.
- **Heavyweight UI Component Libraries (e.g. MUI, Ant Design, Chakra UI)**: Rejected because adding a 200KB+ runtime dependency degrades offline PWA cold-start performance on budget tablets and violates minimal-footprint architecture.
- **Ad-hoc Tailwind Classes without Semantic Tokens**: Rejected because hardcoded hex codes across components cause visual drift and make courtside theming unmaintainable.

## Consequences

- All Next.js PWA components in `apps/web/src/features/` will consume Google Stitch tokens (`bg-surface`, `bg-surface-container`, `text-on-surface`, `silk-extruded`, etc.).
- The official prototype deliverable is updated to [`prototypes/courtside-station-stitch.html`](prototypes/courtside-station-stitch.html).
- `apps/web/tailwind.config.ts` and `apps/web/src/app/globals.css` are updated with Stitch color tokens, typography, and utility classes.
