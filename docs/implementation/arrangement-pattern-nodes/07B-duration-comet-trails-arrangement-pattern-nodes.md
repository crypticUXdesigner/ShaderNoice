# 07B — Duration Comet Trails — arrangement-pattern-nodes

## Agent instructions (START HERE)

Follow sections in order. **Depends on 02A**; **03** recommended. Use **`add-shader-node`** skill.

## Overview

Ship **`duration-comet-trails`** — notes become **curved comet strokes**; **duration** → trail length, **velocity** → brightness; separate **head** glint output.

## Scope

### In

| Field | Value |
| --- | --- |
| `id` | `duration-comet-trails` |
| `displayName` | `Duration Comet Trails` |
| `category` | `Patterns` |

**Ports:** `in` UV, `time` → `uTimelineTime`.

**Outputs:** `out` trail mask; `head` head glint mask.

**Parameters:** `trailTime` 1.4, `length` 0.28, `width` 0.025, `bend` 0.35, `durationGain` 0.7, `centerX/Y`, track filter.

**Shader:** Onsets in window max **256**; pitch → angle + head position; trail along `-dir` with sine bend; `trailLen = length * durationScale(note.duration)`; fade by age.

**Required bake fields:** start, end/duration, pitch, velocity (from onset pack).

**Tests:** Compile; long note produces longer trail in fixture.

### Out

- Piano-roll note bars.

## Dependencies

### Prerequisites

- **02A**; **03** recommended

### Provides

- Duration-expressive note pattern.

### Blocks

- **08** (partial)

## Completion

✅ Done when sustained notes show longer trails than staccato in demo, verify green.

### Final steps

- Update `_OVERVIEW.md` row **07B** → ✅ + date.
