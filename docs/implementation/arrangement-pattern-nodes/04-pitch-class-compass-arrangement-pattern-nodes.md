# 04 — Pitch-Class Compass — arrangement-pattern-nodes

## Agent instructions (START HERE)

Follow sections in order. **Depends on 02A.** Use **`add-shader-node`** skill.

## Overview

Ship **`pitch-class-compass`** — **12 angular sectors** light by active/recent pitch-class energy; optional radial bands and **`color`** output from pitch-class palette.

## Scope

### In

| Field | Value |
| --- | --- |
| `id` | `pitch-class-compass` |
| `displayName` | `Pitch-Class Compass` |
| `category` | `Patterns` |

**Ports:** `in` UV, `time` → `uTimelineTime`.

**Outputs:** `out` float mask; `color` vec4 (RGB from helper, A = energy).

**Parameters:**

| Param | Default | Label |
| --- | --- | --- |
| `release` | 0.35 | Release |
| `innerRadius` | 0.12 | Inner |
| `outerRadius` | 0.72 | Outer |
| `sectorSoftness` | 0.08 | Soft |
| `radialBands` | 3.0 | Bands |
| `centerX`, `centerY` | 0.5 | Center |
| track filter | (reuse) | Tracks |

**Shader:** Polar UV vs center → sector index 0–11; sample `pitchClassEnergyAt(time, Release)` from **02A** bake (O(12) or O(1) table); radial annulus mask × angular smooth sector × energy × optional `sin` bands.

**Performance:** No per-note loop in fragment shader — **must** use pitch-class energy bins only.

**Tests:** Compile smoke + unit test that energy table peaks on correct pitch class for synthetic chord snapshot.

### Out

- Per-note loops; piano-roll axes.

## Dependencies

### Prerequisites

- **02A**

### Provides

- Pitch-class energy visualization path.

### Blocks

- **07C** (soft)

## Completion

✅ Done when node compiles both backends, sector lights respond to chord in demo scrub, tests green, full verify green.

### Final steps

- Update `_OVERVIEW.md` row **04** → ✅ + date.
