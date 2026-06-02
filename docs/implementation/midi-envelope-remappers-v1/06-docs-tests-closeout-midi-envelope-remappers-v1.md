# 06 — Docs + tests closeout — midi-envelope-remappers-v1

## Agent instructions (START HERE)

Follow sections in order. Depends on **01**–**05** shipped. Update user-goals; run full project checks; mark package done in **`_OVERVIEW.md`**.

## Overview

Align documentation with the band/remapper model, add manual QA checklist, and verify CI commands. Link package from **`docs/implementation/README.md`**.

## Scope

### In

- **`docs/user-goals/12-parameter-drivers.md`:** MIDI section — envelope preset (tracks + ADSR); **target ranges / remappers** attach to ports; Connect on remapper card; disconnect/delete table rows for remapper vs envelope.
- **`docs/user-goals/06-audio.md`:** cross-reference MIDI remapper parity (one sentence).
- **`docs/implementation/README.md`:** row for **`midi-envelope-remappers-v1`**.
- **`_OVERVIEW.md`:** 100% + completion date when verified.
- Optional: short note in **`parameter-drivers-v1/_OVERVIEW.md`** “Follow-up” pointing here (no rewrite of shipped v1).
- Full **`npm run type-check && npm test && npm run lint && npm run build`**.

### Out

- Renaming product strings app-wide beyond driver panel (unless trivial).

## Dependencies

### Prerequisites

- **01**–**05** ✅

### Provides

- Documented, merge-ready package.

### Blocks

- —

## Implementation tasks

1. Update **12-parameter-drivers** MIDI bullets (remove incorrect “per binding” range tuning).
2. Pick UI label (**Target ranges** vs **Remappers**) and use consistently in panel + user-goals.
3. Add README index row; set **`_OVERVIEW`** progress to 100%.
4. Run full checks; fix any regressions from **01**–**05**.
5. Manual QA (record in PR or task note):
   - Load pre-migration graph → ranges preserved.
   - Two remappers, one preset, two params, different scales.
   - One remapper → two params; edit range updates both.
   - Delete remapper with 2 targets → confirm.
   - Bypass on port still works.

## Technical notes

- If **`parameter-driver-panel-ux-v2`** tasks reference preset Connect, add one-line “superseded by midi-envelope-remappers-v1” only if those docs are actively linked—avoid broad doc churn.

## Completion

✅ Done when user-goals match shipped UX, README links the package, all checks green, and manual QA scenarios pass.

### Final steps

- Mark **06** ✅ and entire **`midi-envelope-remappers-v1`** package ✅ in **`_OVERVIEW.md`**.
