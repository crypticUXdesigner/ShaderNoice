# 07 — Unified focused driver header — parameter-drivers-v1

## Agent instructions (START HERE)

Depends on **06** (final action names). Milestone **C**. Reuse existing card patterns; prefer a small shared snippet or component over duplicating markup in three content files.

## Overview

Focused driver mode (`layoutMode === 'focused'`) should present the **same information architecture** for every kind:

```text
┌─────────────────────────────────────────────┐
│ [Kind icon] Audio / Animation / MIDI env    │  ← shell header (existing)
├─────────────────────────────────────────────┤
│ Target: Node · Param          [live value]  │
│ Source: Band 01 · Remap 1  |  Tracks: …     │  ← new unified block
│ [optional header actions per 06]            │
├─────────────────────────────────────────────┤
│ … driver editor …                           │
├─────────────────────────────────────────────┤
│ [Disconnect/Remove]          [Swap]         │  ← footer (existing)
└─────────────────────────────────────────────┘
```

Differences between kinds belong in the **Source** row and editor body — not in header layout.

## Scope

### In

- Extract **`DriverFocusedHeader`** (or `{#snippet driverFocusedHeader(...)}` in `ParameterDriverPanel`) with props:
  - `targetLabel` (`Node · Param`)
  - `liveValue?: number | null`
  - `sourceLabel` + optional `sourceDetail` (chips for MIDI tracks)
  - `headerActions` snippet (kind-specific: delete/disconnect per **06**)
- Wire into:
  - `AudioSignalPickerCompact.svelte` (remapper + raw band paths)
  - `AnimationDriverPanelContent.svelte` — **Source:** `Transport` (or omit row with subtitle under target)
  - `MidiEnvelopeCard.svelte` embedded mode — move target line up if card title currently duplicates param; **Source:** connected track chips summary
- Live value formatting: match existing 3-decimal float display on audio/MIDI.
- Visual parity: spacing, typography tokens from `.impeccable.md` / design-system; no new colors for decoration.

### Out

- Overview-mode left nav (**09**).
- MIDI preset sharing (**08**).
- Hiding `TimelineCurveEditor` internal toolbar (**09**).

## Dependencies

### Prerequisites

- **06** (disconnect/delete naming frozen).

### Provides

- Single focused chrome pattern for all driver kinds.

### Blocks

- **09** (overview polish assumes focused header is stable).

## Implementation tasks

1. Add shared header component/snippet + Storybook or `ParameterDriverPanel.stories.ts` variants showing three kinds side by side.
2. **Audio:** Source row = `Signal: {band.name} · {remapper.name}` (or band-only for raw `-raw` connection).
3. **Animation:** Target row only + `Source: Transport` secondary line; do not show curve region index in header (**09** handles editor chrome).
4. **MIDI:** Target row + `Source:` track chip summary (first 2 + “+N” overflow).
5. Remove duplicate `parameterTitle` headers inside embedded cards where the shared header replaces them.
6. Verify focused panel max-width (~520px) — source row truncates with `title` tooltip, no layout break.
7. Manual: open focused panel for each kind from port double-click; header fields match attached driver.

## Technical notes

- `parameterTitle` already computed in `ParameterDriverPanel` — pass down rather than re-derive in children.
- MIDI track labels: reuse `listArrangementTracksForFilter` row labels from parent where possible.

## Completion

✅ Done when all three focused drivers show target + source in the same header structure, embedded cards no longer duplicate target title, stories or screenshot note exists, build green.

### Final steps

- Mark **07** ✅ in **`_OVERVIEW.md`**.
