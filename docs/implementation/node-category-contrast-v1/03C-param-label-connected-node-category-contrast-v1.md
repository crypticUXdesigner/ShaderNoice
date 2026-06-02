# 03C — Param labels + connected states — node-category-contrast-v1

## Agent instructions (START HERE)

Depends on task **01**. Task **01** wires `--param-label-color` — this task fixes **token values** and **connected bg/label co-design**.

When changing connected backgrounds, update **label color** and/or **connected value overrides** together (distort teaches this: teal value on salmon failed).

## Overview

Fix param **label readability** on cells/bodies and **connected-state** pairs where background swaps hurt contrast.

## Scope

### In

**Param labels (normal state)**

| Category / sub | Issue | Target |
| --- | --- | --- |
| sdf | cyan-gray-40 on blue-gray-80 cell | ≥ 4.5:1 — lighten label or darken cell |
| sdf raymarcher | cyan-gray-20 on cyan-gray-70 cell | ≥ 4.5:1 |
| patterns | red-purple-90 on leaf-gray-40 | ~3.8:1 → ≥ 4.5:1 |
| utilities | gray-60 on blue-gray-100 (muted) | OK at 5.7:1 — optional bump to gray-80 for readability |
| mask | gray-40 on violet-gray-gray-100 | OK but harsh — optional lighten label to gray-90 if ≥ 4.5:1 |

**Transparent cells** (inputs, math, effects, blend, distort): where audit fails, add **minimal cell tint** (`rgba` or token) so label contrast does not depend on gradient position.

**Connected states**

| Category | Issue | Fix |
| --- | --- | --- |
| inputs | gray-110 label on `#ffffff2e` | Label → gray-130 or darken connected bg |
| math | clean-gray-100 on `#ffffff0d` | Stronger connected tint or darker label |
| patterns | red-purple-90 on leaf-gray-120 | Lighten label or darken connected bg |
| sdf | cyan-gray-40 on blue-gray-90 connected | Adjust pair coherently |
| distort | teal-110 value on red-orange-120 bg (~1.3:1) | Lighten connected bg **and/or** use darker teal reserved tone; keep animated teal for arc only if needed |
| effects / mask / midi / shapes | verify connected bg + label | Fix any manifest failures |

Define per-category tokens where missing:

```css
--node-param-label-color-connected-{cat}
--param-cell-bg-connected  /* already exists — tune */
```

Wire connected label override on `.param-cell.connected .label` when label color must change.

### Out

- Teal animated/connected semantic change globally
- Connected border styling unless needed for contrast

## Dependencies

### Prerequisites

- Task **01** (`--param-label-color` wiring).

### Provides

- Stable label + connected contrast all categories.

### Blocks

- Task **06**.

## Implementation tasks

1. Audit `param-label-*` and `connected-*` pairs.
2. Fix sdf, sdf raymarcher, patterns labels first (clear failures).
3. Co-tune connected bg + label (+ value color for distort) per category.
4. Add connected label tokens only where normal label token wrong for connected bg.
5. Canvas: connect a param on inputs, math, patterns, distort — verify label + value + mode button.
6. Audit + `--baseline`; build + tests.

## Technical notes

- `--input-value-color-connected` / knob animated colors stay **`--reserved-animated-connected`** unless value box bg forces a darker teal variant — document if introducing `--reserved-animated-connected-on-light`.
- Driver bypass dimming uses `--opacity-disabled` — ensure label still ≥ 3:1 when bypassed.

## Completion

✅ Done when all param-label and connected manifest pairs meet tiers, distort connected **value** readable, `--baseline` passes.

### Final steps

- Mark task **03C** ✅ in **`_OVERVIEW.md`**.
