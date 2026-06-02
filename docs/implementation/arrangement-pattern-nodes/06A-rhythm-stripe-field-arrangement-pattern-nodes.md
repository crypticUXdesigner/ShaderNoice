# 06A — Rhythm Stripe Field — arrangement-pattern-nodes

## Agent instructions (START HERE)

Follow sections in order. **Depends on 02A** (density bins). Prefer **03** merged for preview-loop patterns. Use **`add-shader-node`** skill.

## Overview

Ship **`rhythm-stripe-field`** — fullscreen **stripe mask** whose frequency/phase/bend follow **recent note density**; optional **`warp`** vec2 for downstream UV chains.

## Scope

### In

| Field | Value |
| --- | --- |
| `id` | `rhythm-stripe-field` |
| `displayName` | `Rhythm Stripe Field` |
| `category` | `Patterns` |

**Ports:** `in` UV, `time` → `uTimelineTime`, `angle` float (default 0).

**Outputs:** `out` float stripe mask; `warp` vec2 displacement.

**Parameters:** `baseScale` 12, `densityGain` 8, `window` 0.5, `sharpness` 0.4, `warpAmount` 0.04, track filter.

**Shader:** O(1) sample density/mean pitch/velocity bins over `[time - window, time]`; rotate UV by `angle`; `scale = baseScale + density * densityGain`; sine stripe + bend modulated by density; `warp = normal * bend * warpAmount`.

**Performance:** **No per-note loop** — density bins only.

**Tests:** Compile smoke; density bin fixture changes stripe frequency (optional snapshot assert).

### Out

- Audio FFT coupling.

## Dependencies

### Prerequisites

- **02A**; **03** recommended

### Provides

- Composable warp output pattern.

### Blocks

- **08** (partial)

## Completion

✅ Done when stripes tighten audibly on dense MIDI passage in manual check, both backends compile, verify green.

### Final steps

- Update `_OVERVIEW.md` row **06A** → ✅ + date.
