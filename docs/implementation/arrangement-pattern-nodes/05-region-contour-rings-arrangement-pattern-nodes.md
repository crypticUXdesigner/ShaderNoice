# 05 — Region Contour Rings — arrangement-pattern-nodes

## Agent instructions (START HERE)

Follow sections in order. **Depends on 02B.** Use **`add-shader-node`** skill.

## Overview

Ship **`region-contour-rings`** — **region start/end** times emit expanding circular **contour lines** from track-derived origins (abstract section transitions, not DAW blocks).

## Scope

### In

| Field | Value |
| --- | --- |
| `id` | `region-contour-rings` |
| `displayName` | `Region Contour Rings` |
| `category` | `Patterns` |

**Ports:** `in` UV, `time` → `uTimelineTime`.

**Output:** `out` float contour mask.

**Parameters:**

| Param | Default | Label |
| --- | --- | --- |
| `boundaryWindow` | 4.0 | Window |
| `speed` | 0.18 | Speed |
| `width` | 0.018 | Width |
| `endWeight` | 0.75 | End wt |
| `trackSpread` | 0.35 | Spread |
| `kindFilter` | -1 | Kind |
| `centerX`, `centerY` | 0.5 | Center |
| track filter | (reuse) | Tracks |

**Shader:** Loop boundaries in window (max **128**): `age = abs(time - boundary.time)`; track angle → origin offset; expanding ring distance field; `endWeight` on `isEnd` events; kind filter skips non-matching kinds.

**Data:** **02B** boundary bake only — no note arrays.

**Tests:** Compile with spike fixture regions; empty snapshot → zero.

### Out

- Colored region rectangles (that's **Regions** node).

## Dependencies

### Prerequisites

- **02B**

### Provides

- Region boundary visual path.

### Blocks

- **07A** (soft)

## Completion

✅ Done when contours visible at region edges in demo, both backends compile, tests green.

### Final steps

- Update `_OVERVIEW.md` row **05** → ✅ + date.
