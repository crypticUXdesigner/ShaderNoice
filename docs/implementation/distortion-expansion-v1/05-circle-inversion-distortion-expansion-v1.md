# 05 — Circle Inversion — distortion-expansion-v1

## Agent instructions (START HERE)

Follow sections in order. **Depends on task 00.** Read **`_OVERVIEW.md`**. **Do not** confuse with **KIFS SDF** or **Spotlight** (color).

## Overview

Ship **`circle-inversion`** — iterative multi-circle UV inversion with layout presets, soft boundaries, and escape clamps.

## Scope

### In

- **Files:** `src/shaders/nodes/circle-inversion.ts`; registry + WGSL case.
- Use **`emitCircleInversionGlsl/Wgsl`** from **00**.

| Field | Value |
| --- | --- |
| `id` | `circle-inversion` |
| `displayName` | `Circle Inversion` |
| `category` | `Distort` |
| `icon` | `circles-three` or `bubbles` |

**Parameters:**

| Param | Type | Default | Max | Label |
| --- | --- | --- | --- | --- |
| `layoutPreset` | int | `0` | 0..3 | **Layout** (triangle, chain, flower, random) |
| `circleCount` | int | `3` | 1..4 | **Circles** |
| `radius` | float | `0.35` | — | **Radius** |
| `inversionStrength` | float | `1` | 0..1 | **Strength** |
| `iterations` | int | `2` | 1..6 | **Iterations** |
| `softBoundary` | float | `0.1` | — | **Soft** |
| `globalRotation` | float | `0` | — | **Rotation** |
| `globalScale` | float | `1` | — | **Scale** |
| `escapeLimit` | float | `4` | — | **Clamp** (internal UV bail) |
| `blend` | float | `0.7` | 0..1 | **Blend** |

**Layout presets:** derive circle centers from preset + `circleCount` (fixed offsets in shader constants table — no 12 free XY knobs in v1).

**Loop:** `for (iter) for (circle) { z = circleInversion(z, c_i, radius, strength); rotate z by globalRotation; }` then clamp if `length(z) > escapeLimit`.

**Differentiation in description:** UV remap with multiple inversions; **Spotlight** is single-orbit color accumulation.

**Tests:** compile smoke; conservative defaults (low iterations).

**Golden:** optional in **06** — compile-only OK for this task.

### Out

- Spotlight refactor to shared helper.
- Apollonian / multi-scale IFS beyond preset layouts.

## Dependencies

### Provides

- `circle-inversion`

### Blocks

- **06**

## Completion

✅ Done when defaults are stable (no blow-up at rest), both backends compile, tests green.

### Final steps

- Update `_OVERVIEW.md` row **05** → ✅ + date.
