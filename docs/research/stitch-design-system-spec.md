# Badminque Courtside Station OS — Google Stitch Design System Specification

## 1. Overview & Principles

The **Google Stitch Design System** provides the visual, tactile, and typographic foundation for **Badminque Courtside Station OS**. It is specifically engineered for tablet and mobile operation by club Organizers courtside in recreational badminton centers.

### Core Ergonomic Principles
1. **Glare Resistance (Silk Light Soft Depth)**: Rather than stark white `#ffffff` or reflective pure black `#000000`, the system uses calibrated slate-toned surfaces (`#f8fafc` and `#f1f5f9`) with soft inner and outer drop shadows to defeat gym LED glare.
2. **Dense Telemetry (46px App Bar)**: Organizers need maximum vertical real estate for 3 courts and on-deck queues; the top telemetry bar is constrained to 46px (`h-11`).
3. **Sweat & Touch Resilience**: All primary touch targets have minimum dimensions of $44 \times 44\text{px}$ with instant `:active` tactile depression (`transform: scale(0.97)`).
4. **Tabular Precision**: Ratings ($R_S/R_D$), match clocks, and scorelines strictly use **JetBrains Mono** tabular numbers to eliminate layout jitter.

---

## 2. Design Tokens

### 2.1 Material Design 3 (MD3) Surface Containers
| Token Name | Hex Value | Usage |
| :--- | :--- | :--- |
| `surface` | `#f8fafc` | Base application canvas |
| `surface-dim` | `#f1f5f9` | Subdued surface areas / sunken wells |
| `surface-bright` | `#ffffff` | Elevated active card backgrounds |
| `surface-container-lowest` | `#ffffff` | Highest elevation cards |
| `surface-container-low` | `#f8fafc` | Card inner containers |
| `surface-container` | `#f1f5f9` | Default container background |
| `surface-container-high` | `#e2e8f0` | Table headers, chip backgrounds |
| `surface-container-highest` | `#cbd5e1` | Borders, subtle dividers |
| `on-surface` | `#0f172a` | Primary high-contrast text |
| `on-surface-variant` | `#64748b` | Subtitle, secondary metadata text |
| `outline` | `#94a3b8` | Active element borders |
| `outline-variant` | `#e2e8f0` | Subtle hairline dividers |

### 2.2 Brand & Functional Accent Tokens
| Token Name | Hex Value | Usage |
| :--- | :--- | :--- |
| `primary` | `#4f46e5` | Primary action buttons, active navigation pills |
| `primary-container` | `#6366f1` | Gradient start, prominent badges |
| `on-primary` | `#ffffff` | Text on primary buttons |
| `emerald-accent` | `#059669` | Active court status, positive DUBR deltas ($\Delta R > 0$) |
| `emerald-container` | `#ecfdf5` | Positive badge backgrounds |
| `error` | `#ef4444` | High-priority warnings, court resets |
| `error-container` | `#fef2f2` | Error chips, negative status pills |

---

## 3. Typography Scale

1. **Plus Jakarta Sans** (Google Fonts):
   - `font-headline-md`: `Plus Jakarta Sans`, 700/800 weight, tight tracking (Station OS title, court headings).
   - `font-body-base`: `Plus Jakarta Sans`, 500/600 weight (player names, menu items, action labels).
2. **JetBrains Mono** (Google Fonts):
   - `font-mono-data`: `JetBrains Mono`, 600 weight (elapsed match timers, scores `30-22`, queue positions).
   - `font-mono-badge`: `JetBrains Mono`, 700 weight, uppercase (DUBR ratings `3.850`, tier pills).
3. **Material Symbols Outlined**:
   - Google Material Symbols for tactile action buttons (`sports_tennis`, `timer`, `bolt`, `tune`, `check_circle`).

---

## 4. Silk Light Elevation & Neomorphic Utility Classes

```css
/* Extruded Surface (Cards & Floating Buttons) */
.silk-extruded {
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.03);
}

.silk-extruded-sm {
  background: #f8fafc;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

/* Sunken Surface (Score Wells & Bench Trays) */
.silk-sunken {
  background: #f8fafc;
  box-shadow: inset 1px 1px 3px rgba(0, 0, 0, 0.06);
}

.silk-sunken-shallow {
  background: #f8fafc;
  box-shadow: inset 0.5px 0.5px 2px rgba(0, 0, 0, 0.04);
}

/* Primary Gradient Action Button */
.silk-btn-primary {
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
  box-shadow: 0 2px 6px rgba(99, 102, 241, 0.28);
}
.silk-btn-primary:active {
  box-shadow: inset 0 2px 4px rgba(30, 27, 75, 0.25);
  transform: scale(0.97);
}

/* Active Court Focus Ring */
.court-active {
  border: 2px solid #6366f1 !important;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12), 0 4px 12px rgba(99, 102, 241, 0.08) !important;
}
```

---

## 5. Screen Anatomy Reference

The canonical implementation is documented in [`prototypes/courtside-station-stitch.html`](file:///prototypes/courtside-station-stitch.html):

```text
┌────────────────────────────────────────────────────────────────────────┐
│ 1. Telemetry Bar (46px): Logo | Session Chip | Courts Occupied | Sync  │
├────────────────────────────────────────────────────────────────────────┤
│ 2. 3-Court Active Grid: Court 1 (Active) | Court 2 (Active) | Court 3  │
│    - Elapsed Clock (JetBrains Mono)                                    │
│    - Doubles Pair A vs Pair B with DUBR chips                          │
│    - Actions: [⚡ Quick Score] [Custom Match] [Reset]                  │
├────────────────────────────────────────────────────────────────────────┤
│ 3. On-Deck Staging Trays:                                              │
│    - Slot 1: Next Up (Co-Pilot Auto-Matched Quad)                      │
│    - Slot 2: Following (Co-Pilot Quad)                                 │
│    - Slot 3: Custom Staging Well                                       │
├────────────────────────────────────────────────────────────────────────┤
│ 4. Bench Roster Drawer & Quick Check-In:                               │
│    - 1-Tap Tier Anchors (Beginner: 2.500 | Inter: 3.500 | Adv: 4.500)  │
│    - Search Autocomplete Filter                                        │
│    - Player Touch Sheet (Rest / 1-Match Skip / Pair Pinning)           │
└────────────────────────────────────────────────────────────────────────┘
```
