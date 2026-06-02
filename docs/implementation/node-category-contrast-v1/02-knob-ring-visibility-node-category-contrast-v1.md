# 02 — Knob ring visibility — node-category-contrast-v1

## Agent instructions (START HERE)

Follow sections in order. Depends on task **01** (audit script + `--baseline`). After **each category file** edit, run `npm run contrast:node-categories` — **reject** changes that improve ring contrast but regress label/value pairs on the same cell.

Do **not** change `--knob-ring-active-color-static`, `--knob-ring-active-color-animated`, or marker semantics except where marker equals ring bg (invisible marker).

## Overview

Fix **invisible knob background arcs** (`--knob-ring-color` ≈ cell/body bg) across categories. Worst offenders: math (~1.0:1), utilities (~1.0:1), inputs, shapes, effects stylize, midi, distort warp arc.

## Scope

### In

Per `node-categories/*.css`, adjust `--node-knob-ring-color-{cat}` (mapped to `--knob-ring-color` on `.node`) so track vs **param-cell effective bg** ≥ **3:1**:

| Category / sub | Current issue | Direction |
| --- | --- | --- |
| inputs | gray-50 on gray-60/clean-gray-70 | Darken ring or lighten cell edge — keep value chip unchanged |
| math (+ functions, advanced) | clean-gray-50 on clean-gray-50 | Step ring to clean-gray-80+ or gray-100 |
| utilities | yellow-gray-110 on blue-gray-100/110 | Darken ring toward blue-gray-130 or yellow-gray-130 |
| shapes | yellow-gray-110 on teal-gray-gray-120 | Increase separation (teal-gray-80 ring or darker) |
| effects stylize | red-purple-gray-40 on red-purple-50 | Darken ring or lighten cell tint |
| midi | violet-gray-70 on violet-gray-60 | Darken ring 2+ steps |
| distort warp | arc active = marker = value bg clean-gray-60 | Separate arc color from fill |
| patterns, sdf, mask, blend, audio, output, default | Verify ≥ 3:1; tweak only if manifest fails |

Also verify **marker** vs ring contrast ≥ 3:1 where marker is user-facing.

### Out

- Knob size, ring width, center disc styling (unless center obscures ring)
- Value box colors (`--knob-value-bg/color`) unless required for adjacent regression fix

## Dependencies

### Prerequisites

- Task **01**.

### Provides

- Visible knob tracks all categories; updated manifest ratios.

### Blocks

- Task **06**.

## Implementation tasks

1. Run audit; filter manifest pairs tagged `knob-ring`.
2. For each failing category file, adjust `--node-knob-ring-color-*` (and warp arc token if shared with bg).
3. Re-run audit + `--baseline` after each file.
4. Canvas spot-check: one knob param each on math, utilities, shapes, inputs presets.
5. `npm run type-check && npm test && npm run lint && npm run build`.

## Technical notes

- Ring is stroke on param-cell background — use **cell bg end** token when gradient.
- Prefer **darker ring** on light cells, **lighter ring** on dark cells; avoid hue jumps that break category identity.
- Global fallback `#171718c2` in `tokens-node-editor.css` is OK on dark cells — do not weaken default category.

## Completion

✅ Done when all knob-ring manifest pairs ≥ 3:1, `--baseline` passes, and manual knob spot-check confirms arc track visible in worst categories.

**Completed 2026-05-31** — see `_OVERVIEW.md` Notes.

### Final steps

- Mark task **02** ✅ in **`_OVERVIEW.md`**.
