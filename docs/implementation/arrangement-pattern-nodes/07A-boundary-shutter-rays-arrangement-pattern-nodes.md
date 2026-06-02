# 07A — Boundary Shutter Rays — arrangement-pattern-nodes

## Agent instructions (START HERE)

Follow sections in order. **Depends on 02B**; **05** recommended for boundary visual validation. Use **`add-shader-node`** skill.

## Overview

Ship **`boundary-shutter-rays`** — region **start/end** events trigger **radial shutter / iris rays** (section drops, chorus entrances).

## Scope

### In

| Field | Value |
| --- | --- |
| `id` | `boundary-shutter-rays` |
| `displayName` | `Boundary Shutter Rays` |
| `category` | `Patterns` |

**Ports:** `in` UV, `time` → `uTimelineTime`.

**Output:** `out` float ray mask.

**Parameters:** `window` 2.0, `rayCount` 18, `width` 0.12, `spin` 0.35, `endPolarity` -0.5, `centerX/Y`, track filter, `kindFilter`.

**Shader:** Polar coords; loop boundaries in `[time - window, time]` max **96**; spoke pattern `fract((theta + phase) / TAU * rayCount)`; radial gate + fade; `endPolarity` phase flip on ends.

**Data:** Reuse **02B** boundary bake (same as **05**).

**Tests:** Compile smoke with fixture.

### Out

- Region block fills.

## Dependencies

### Prerequisites

- **02B**; **05** recommended

### Provides

- Section-transition ray node.

### Blocks

- **08** (partial)

## Completion

✅ Done when rays fire at region boundaries in demo scrub, verify green.

### Final steps

- Update `_OVERVIEW.md` row **07A** → ✅ + date.
