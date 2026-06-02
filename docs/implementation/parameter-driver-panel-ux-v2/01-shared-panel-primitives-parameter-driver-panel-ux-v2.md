# 01 — Shared panel primitives — parameter-driver-panel-ux-v2

## Agent instructions (START HERE)

Follow sections in order. Add **shared UI building blocks only**—do not change connect behavior, nav filtering logic, or evaluators in this task.

Respect **`.cursor/rules/frontend/`** (Svelte 5, CSS tokens, component placement under `src/lib/components/floating-panel/`).

## Overview

Introduce reusable **`DriverPanelEmptyState`** and **`DriverPresetCardShell`** (name flexible) so later tasks wire consistent empty states and card section order without copy-pasting markup/CSS across audio, MIDI, and animation.

## Scope

### In

- **`DriverPanelEmptyState.svelte`**
  - Props: `icon` (or kind meta), `title`, `copy`, optional `primaryAction` snippet, optional `secondaryHint` string.
  - Matches spacing/typography of existing empty states in `AnimationDriverPanelContent` / `MidiDriverPanelContent` (icon lg, title md, copy sm, centered).
- **`DriverPresetCardShell.svelte`** (or equivalent)
  - Slots/snippets: `header` (title + `headerActions`), `editor`, `sources` (optional), `targets` (optional).
  - Documents section order: **header → editor → sources → targets**.
  - Supports `connected` / `selected` surface classes aligned with `panel-card` / remapper connected outline.
- **Storybook** (minimal): one story per primitive under `floating-panel/`.
- Export from `floating-panel/index.ts` if other modules need imports.

### Out

- Rewiring audio/MIDI/animation content (**05**, **02A**–**04**).
- Connect/disconnect behavior changes.

## Dependencies

### Prerequisites

- **`parameter-drivers-v1`** shipped (panel exists).

### Provides

- Shared primitives for tasks **02A**–**05**.

### Blocks

- **02A**, **02B**, **03**, **04**, **05**

## Implementation tasks

1. Implement `DriverPanelEmptyState` with token-based styles (no one-off hex).
2. Implement `DriverPresetCardShell` with flex column layout and consistent padding/radius with `RemapperCard` / `MidiEnvelopeCard`.
3. Add Storybook entries demonstrating connected vs selected vs default.
4. Run **`npm run type-check && npm run lint`**; fix any a11y labels on interactive slots.

## Technical notes

- Prefer **snippets** for `primaryAction` to match Svelte 5 patterns in neighboring panel files.
- Shell should accept `embedded` flag for focused driver bodies (transparent chrome) without forking a second component.

## Completion

✅ Done when both primitives exist, are documented via Storybook, and downstream tasks can import them without duplicating empty-state CSS.

### Final steps

- Mark task **01** ✅ in **`_OVERVIEW.md`**.
