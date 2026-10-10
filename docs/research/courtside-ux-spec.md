# Courtside UX Flow and Ergonomics Specification

**Status**: Proposed  
**Date**: 2026-10-10  
**Context**: Resolves Ticket #5 (`wayfinder:prototype`)  
**Related Documents**: `GLOSSARY.md`, `docs/adr/0001-tech-stack-decision.md`, `prototypes/courtside-ux-variants.html`  

---

## 1. Executive Summary

Courtside club nights present unique ergonomic challenges:
- The organizer operates a single handheld or benchtop tablet in a noisy, high-turnover gymnasium.
- Matches end every 12–18 minutes across 2 to 6 courts simultaneously.
- Scores must be captured within 15–30 seconds before players rotate or leave the court.
- Lighting may produce screen glare; organizers frequently use one thumb while holding the tablet with their other hand.

To evaluate the optimal workflow, three structurally distinct UI variants were prototyped and tested in [`prototypes/courtside-ux-variants.html`](../../prototypes/courtside-ux-variants.html):
1. **Variant A: The Digital Pegboard (Court Grid View)**
2. **Variant B: The Rapid Match Wizard (Sequential 3-Step)**
3. **Variant C: The Master Match Sheet (Dense Split View)**

---

## 2. Variant Comparison Matrix

| Evaluation Dimension | Variant A: Digital Pegboard | Variant B: Rapid Wizard | Variant C: Master Sheet |
| :--- | :--- | :--- | :--- |
| **Primary Mental Model** | Physical club pegboard stations | Mobile form wizard | Tournament score sheet |
| **Speed to Log Match** | **~10 seconds** (Tap court &rarr; Tap preset score &rarr; Save) | **~15 seconds** (3 linear wizard steps) | **~20 seconds** (Select 4 dropdowns &rarr; type score) |
| **Court Queue Awareness** | **Superb**: Instantly see which court is free and who is waiting on bench | **Poor**: Focused only on single match entry | **Moderate**: Shows list of players with location badges |
| **Thumb Ergonomics (Tablet)** | **High**: Large tactile court cards and quick keypad modal | **High**: Big one-handed buttons and presets | **Low**: Dense tabular inputs require precise tapping |
| **Match History Visibility** | Collapsed in drawer or modal | Hidden until completion | **High**: Immediate historical log table |

---

## 3. Recommended UX Architecture: The Pegboard-Keypad Hybrid

Based on prototype evaluation, the winning design is **Variant A (The Digital Pegboard)** enhanced with the **Quick Score Presets from Variant B**:

1. **Main Screen: Active Court Stations**:
   - Each physical court (Court 1, Court 2, Court 3, ...) is represented as a high-contrast card showing the current match, player names, and elapsed match duration.
   - A floating "Bench Queue" at the bottom shows checked-in players waiting for a court.
2. **1-Tap Match Completion**:
   - When players walk off Court 1, the organizer taps **"Record Match Result"** directly on the Court 1 card.
3. **Ergonomic Quick-Score Keypad Modal**:
   - Badminton matches ending in recreational play cluster around standard score lines: `21-19`, `21-17`, `21-15`, `21-13`, `21-10`.
   - The modal presents 6 instant-tap score preset buttons, plus a "Custom" keypad for overtime deuces (e.g. `24-22`).
   - Logging a score takes **two taps** (Court &rarr; Score Preset) and completes in **under 5 seconds**.
4. **Immediate Court Turnover**:
   - Upon saving the score, Court 1 transitions to "Free" with an **"Auto-Fill"** button that pulls the next 4 waiting players from the queue based on balanced UBR ratings.

---

## 4. Interactive Prototype Reference

The multi-variant prototype is committed on branch `prototype/courtside-ux-flow` at [`prototypes/courtside-ux-variants.html`](../../prototypes/courtside-ux-variants.html).  
Users can toggle between variants using the floating bottom switcher (`←` / `→` or arrow keys).
