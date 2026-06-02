# 03A — Header + icon box contrast — node-category-contrast-v1

## Agent instructions (START HERE)

Depends on task **01**. Edit **header print** and **icon box** tokens together per category — changing icon bg without icon color (or vice versa) often trades one failure for another.

Header **port name labels** inherit `--node-header-print-*`; fix print color once for title + ports.

## Overview

Raise contrast on **node header titles**, **header port names**, and **icon box icons** below AA thresholds from the design review.

## Scope

### In

| Category / sub | Pair | Review ratio | Target |
| --- | --- | --- | --- |
| inputs | gray-20 on gray-90/80 header | ~2.9:1 | ≥ 3:1 large text; prefer gray-120+ print or darker header |
| inputs system | blue-gray-110 on blue-gray-80 | ~3.4:1 | ≥ 4.5:1 or lighten header end |
| math | clean-gray-40 on blue-gray-100 gradient end | ~1.9:1 | ≥ 3:1 at darkest header stop |
| blend | gray-40 on red-gray-gray-90 | ~4.4:1 | ≥ 4.5:1 normal or ≥ 3:1 if treated as display title only — prefer bump to gray-20/130 print |
| utilities header | blue-gray-100 on blue-gray-60 | ~4.4:1 | ≥ 4.5:1 |
| patterns icon | leaf-gray-50 on red-purple-90 | ~3.3:1 | ≥ 4.5:1 icon |
| patterns structured icon | gray-130 on violet-90 | ~4.3:1 | ≥ 4.5:1 |
| sdf icon | cyan-110 on cyan-gray-80 | ~3.4:1 | ≥ 4.5:1 |
| shapes icon | yellow-110 on teal-gray-80 | ~3.3:1 | ≥ 4.5:1 |
| shapes derived icon | blue-110 on orange-80 | ~3.4:1 | ≥ 4.5:1 |
| distort warp icon | red-orange-100 on clean-gray-70 | ~3.2:1 | ≥ 4.5:1 |
| mask icon | violet-gray-40 on violet-gray-80 | ~2.7:1 | ≥ 4.5:1 |
| output icon | red-gray-130 on red-90 | ~4.2:1 | ≥ 4.5:1 |
| math / effects icons on **transparent** icon box | icon on header gradient | variable | Set icon color for worst gradient stop OR add subtle icon-box bg |

Categories already OK (audio, midi, default, distort transform): **no change** unless audit regresses.

### Out

- Icon box size/shape; header layout; side panel icons

## Dependencies

### Prerequisites

- Task **01**.

### Provides

- Header/icon manifest pairs pass tiers.

### Blocks

- Task **06**.

## Implementation tasks

1. Run audit; list failing `header-*` and `icon-*` pairs.
2. Per category file, adjust `--node-header-print-*` and/or `--node-header-bg-*` stops for worst gradient point.
3. Adjust `--node-icon-box-color-*` / `--node-icon-box-bg-*` for failing icons; re-check header harmony.
4. Verify port `.name-label` and `.label-text` in canvas for inputs, math, blend.
5. Audit + `--baseline`; build + tests.

## Technical notes

- Transparent icon boxes (math, effects): optional **semi-opaque** `color-mix` bg is allowed if it preserves category look.
- Do not lighten header so much that body transition looks broken — small step changes only.

## Completion

✅ Done when all header title and icon box manifest pairs meet tiers, `--baseline` passes, and inputs/math/blend headers are readable at gradient ends.

### Final steps

- Mark task **03A** ✅ in **`_OVERVIEW.md`**.
