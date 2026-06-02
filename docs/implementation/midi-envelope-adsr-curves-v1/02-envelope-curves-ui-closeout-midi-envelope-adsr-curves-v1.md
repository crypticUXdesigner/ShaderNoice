# 02 — Envelope curves UI + closeout — midi-envelope-adsr-curves-v1

## Agent instructions (START HERE)

Depends on **01** ✅. Follow sections in order. Read **`midi-envelope-adsr-curves-v1/_OVERVIEW.md`**.

Use **`applyEnvelopeCurve`** from task **01** for SVG sampling — do not duplicate easing math in the component.

## Overview

Expose per-phase curve presets in **`AdsrEnvelopeEditor`** and draw the non-linear envelope path. Improve time readability with **ms labels** for sub-second A/D/R values. Wire through **`MidiEnvelopeCard`** / **`MidiDriverPanelContent`** if props need passing (likely via existing `adsr` patch callbacks).

## Scope

### In

- **`AdsrEnvelopeEditor.svelte`:**
  - Per-phase curve control (compact — e.g. small select or segmented control per A/D/R row)
  - SVG path built from ~32 sampled points per segment using shared easing helper (not straight-line segments for curved phases)
  - **ms display** for attack/decay/release when value &lt; 1 s (store/commit still in seconds)
  - Drag handles: continue to adjust **attack/decay/release seconds** and **sustain level** only; curve shape edited via preset control
- Patch **`onChange` / `onCommit`** to include curve fields on **`MidiEnvelopeAdsr`**
- Optional one-line helper under graph: sustain hold = note length in arrangement (clarify fixed visual sustain width)
- Storybook or manual spot-check note in task completion if no story exists for ADSR editor

### Out

- Global “envelope character” macro affecting all phases
- Drag-to-edit curve shape / bezier handles
- **`docs/user-goals/`** rewrite (add a short note to **`12-parameter-drivers.md`** only if MIDI envelope section exists and lacks curve mention)
- Polyphony or runtime changes

## Dependencies

### Prerequisites

- **01** model + runtime easing ✅

### Provides

- User-facing curve authoring; package complete

### Blocks

- —

## Implementation tasks

1. Add curve preset UI to each A/D/R control row in **`AdsrEnvelopeEditor.svelte`**; respect `disabled` prop.
2. Replace **`envelopePath`** derivation with sampled points per segment (attack, decay, release slopes; sustain segment stays horizontal at `sustainLevel`).
3. Add ms formatting for time fields (&lt; 1 s show ms; editing accepts ms or s consistently — prefer display-only ms with seconds in `ValueInput` unless dual-unit UX is trivial).
4. Verify **`MidiEnvelopeCard`** / panel content passes full `adsr` object through patch helpers without stripping new fields.
5. Manual check: linear preset matches pre-change shape; exponential attack visibly concave; release logarithmic visibly convex.

## Technical notes

- Reuse **`SUSTAIN_VISUAL_SECONDS`** for layout; curved paths affect A/D/R segments only.
- Match **`.cursor/rules/frontend/`** (CSS tokens, Svelte 5 runes, no `$effect` for derivable path geometry — use `$derived`).
- Keep parameter grid compact; curve control must not break node-body-style density rules from **`shaders/node-standards.mdc`** (short labels).

## Completion

✅ Done when users can set per-phase curves from the MIDI envelope panel, the graph reflects the selected curves, saved graphs reload correctly, checks green, and **`_OVERVIEW.md`** marks package done.

### Final steps

- Mark **02** ✅ in **`_OVERVIEW.md`**; set overall progress to 100%.
- Add row to **`docs/implementation/README.md`** if not already linked.
