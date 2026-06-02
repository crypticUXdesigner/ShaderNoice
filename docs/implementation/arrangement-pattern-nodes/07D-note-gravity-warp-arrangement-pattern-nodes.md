# 07D — Note Gravity Warp — arrangement-pattern-nodes

## Agent instructions (START HERE)

Follow sections in order. **Depends on 02A**; **03** strongly recommended (onset window stability). Use **`add-shader-node`** skill.

## Overview

Ship **`note-gravity-warp`** — recent notes as temporary **gravity wells** distorting UV; **`warp`** vec2 for compositing into any pattern chain; **`out`** field magnitude mask.

## Scope

### In

| Field | Value |
| --- | --- |
| `id` | `note-gravity-warp` |
| `displayName` | `Note Gravity Warp` |
| `category` | `Patterns` |

**Ports:** `in` UV, `time` → `uTimelineTime`.

**Outputs:** `warp` vec2 displacement; `out` float field magnitude.

**Parameters:** `window` 1.0, `strength` 0.04, `radius` 0.22, `swirl` 0.5, `clamp` 0.08, track filter.

**Shader:** Loop strongest onsets in window max **96**; pitch-derived attractor positions; radial/tangent mix by `swirl`; accumulate displacement; `clampLength` by `clamp`; `out = saturate(field)`.

**Performance:** Heavier node — validate dense snapshot still interactive with preview loop clamp.

**Tests:** Compile; warp non-zero with snapshot, zero without.

### Out

- Ping-pong feedback buffers.

## Dependencies

### Prerequisites

- **02A**; **03** strongly recommended

### Provides

- Arrangement-aware UV warp utility.

### Blocks

- **08** (partial)

## Completion

✅ Done when wiring `note-gravity-warp.warp` → downstream pattern visibly bends on note hits, verify green.

### Final steps

- Update `_OVERVIEW.md` row **07D** → ✅ + date.
