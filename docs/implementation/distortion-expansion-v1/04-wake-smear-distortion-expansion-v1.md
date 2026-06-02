# 04 — Wake Smear — distortion-expansion-v1

## Agent instructions (START HERE)

Follow sections in order. **Depends on nothing.** Read **`_OVERVIEW.md`**. Study **Block Glitch** capped loop pattern (`UV_BLOCK_GLITCH_MAX`).

## Overview

Ship **`wake-smear`** — procedural capsule-trail UV displacement (datamosh-like) without frame history; capped emitter loop.

## Scope

### In

- **Files:** `src/shaders/nodes/wake-smear.ts`; registry + WGSL case.
- **Constant:** `WAKE_SMEAR_MAX_EMITTERS = 6` (or 8 — match loop unroll budget).

| Field | Value |
| --- | --- |
| `id` | `wake-smear` |
| `displayName` | `Wake Smear` |
| `category` | `Distort` |
| `icon` | `wind` or `waves` |

**Parameters:**

| Param | Type | Default | Label |
| --- | --- | --- | --- |
| `emitterCount` | int | `3` | **Emitters** |
| `pathPreset` | int | `0` | **Path** (enum: line, orbit, figure-8, drift — reuse Path Drive semantics where possible) |
| `speed` | float | `0.5` | **Speed** |
| `trailLength` | float | `0.4` | **Length** |
| `trailWidth` | float | `0.08` | **Width** |
| `dragStrength` | float | `0.3` | **Drag** |
| `curl` | float | `0` | **Curl** |
| `decay` | float | `2` | **Decay** |
| `quantizeHz` | float | `0` | **Quantize** (0 = off) |
| `blend` | float | `1` | **Blend** |

**Logic:**

- For each emitter `i < emitterCount`: moving segment / capsule in UV space; accumulate  
  `delta += drag * exp(-dPerp²/width²) * decay(age) * tangent` (+ curl × perpendicular).
- `out = mix(in, in + delta, blend)`.
- Path positions from analytic functions of `$time` (and quantize); optional doc: wire **Path Drive** to future center params — v1 may use presets only without extra ports.

**`parameterEnumMappings`:** `pathPreset` labels.

**Tests:** compile smoke; assert loop bound constant in emitted shader.

**Presets:** “Clean” (2 emitters, low drag) vs “Chaotic” (max emitters) in **06**.

### Out

- Per-emitter wired vec2 ports (v2).
- Video optical flow input.

## Dependencies

### Provides

- `wake-smear`

### Blocks

- **06**

## Completion

✅ Done when emitter cap enforced in shader + param max, both backends compile, tests green.

### Final steps

- Update `_OVERVIEW.md` row **04** → ✅ + date.
