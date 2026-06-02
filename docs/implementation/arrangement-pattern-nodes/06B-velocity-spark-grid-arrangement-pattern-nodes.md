# 06B — Velocity Spark Grid — arrangement-pattern-nodes

## Agent instructions (START HERE)

Follow sections in order. **Depends on 02A.** Prefer **03** merged. Use **`add-shader-node`** skill.

## Overview

Ship **`velocity-spark-grid`** — procedural **grid cells** flash on recent note attacks; velocity → dot size/brightness. Not a sequencer timeline layout.

## Scope

### In

| Field | Value |
| --- | --- |
| `id` | `velocity-spark-grid` |
| `displayName` | `Velocity Spark Grid` |
| `category` | `Patterns` |

**Ports:** `in` UV, `time` → `uTimelineTime`.

**Outputs:** `out` float spark mask; `cellId` float hashed cell id (optional compositing).

**Parameters:** `gridScale` 10, `decay` 0.55, `dotSize` 0.22, `feather` 0.05, `pitchShuffle` 1.0, track filter.

**Shader:** `cell = floor(uv * gridScale)`; loop onsets in `[time - decay, time]` max **256**; map pitch+track → target cell via hash; only contribute when `cell` matches; velocity scales size.

**Tests:** Compile + onset window preview uniforms wired.

### Out

- Timeline rows; piano keys.

## Dependencies

### Prerequisites

- **02A**; **03** recommended

### Provides

- Grid + onset window node.

### Blocks

- **08** (partial)

## Completion

✅ Done when sparks appear on drum hits in demo, verify green.

### Final steps

- Update `_OVERVIEW.md` row **06B** → ✅ + date.
