# 05 — Embedded UI tokens — node-category-contrast-v1

## Agent instructions (START HERE)

Depends on task **01**. **Highest regression risk** — change incrementally; prefer **scoped overrides on `.node.{slug} .bezier-editor`** (etc.) over editing global `tokens-node-editor.css` defaults.

After each embed type, spot-check on **one light** (math/inputs) and **one dark** (mask/utilities) node.

## Overview

Make in-node **embedded editors** (bezier, range/remap, vector2d/3d, color picker swatch, ADSR if rendered in node body) readable on category bodies instead of always using global `gray-20` embed slot.

## Scope

### In

- **Token propagation pattern:** on `.node.{slug}`, set:
  - `--embed-slot-bg`
  - `--bezier-editor-grid-color`, `--bezier-editor-label-color`, curve/control overrides (already partially per-category for curve)
  - `--range-editor-bg`, `--range-editor-label-color`, slider track
  - `--vector2d-editor-bg`, `--vector3d-editor-bg`, axis/grid colors
  - `--color-picker-node-swatch-bg`
- **Per-category tuning** priority: math, inputs, effects, distort (light bodies); mask, utilities (dark bodies)
- **ADSR envelope in node** (`AdsrEnvelopeEditor.svelte`): ensure ValueInput rows inherit `--param-control-*` (likely OK after 04) — verify grid/curve colors if any hardcoded

Category files already override **bezier curve/control** colors — extend to **grid + label** using same hue family.

### Out

- Popover color picker (`tokens.css` — DOM UI)
- RemapRangeEditor in floating panel
- Full embed layout redesign

## Dependencies

### Prerequisites

- Task **01**; task **04** recommended (ValueInput in embeds) but not blocking.

### Provides

- Embeds visually integrated + legible per category.

### Blocks

- Task **06**.

## Implementation tasks

1. List embed usages in node body (`NodeBodyLayoutItem` ui types: bezier, range, vector, color map, adsr).
2. Add `--embed-slot-*` overrides to `base.css` defaults using `color-mix` from `--param-cell-bg` / body tokens.
3. Per heavy-use category files (math, inputs, sdf, utilities, effects), tune embed grid/label tokens.
4. Run audit pairs for `bezier-label`, `range-label`, embed bg vs body (add to manifest in 01 if missing).
5. Canvas: math node with bezier param; utilities with range; color map node.
6. Audit + `--baseline`; build + tests.

## Technical notes

- Goal is **readable labels (≥ 4.5:1)** on embed bg, not matching body exactly.
- Dark embed on light body (or inverse) is acceptable if category identity preserved via hue.

## Completion

✅ Done when embed label/grid pairs pass manifest tiers on sampled categories (math, inputs, utilities, mask, effects), `--baseline` passes, no embed looks like foreign gray slab.

### Final steps

- Mark task **05** ✅ in **`_OVERVIEW.md`**.
