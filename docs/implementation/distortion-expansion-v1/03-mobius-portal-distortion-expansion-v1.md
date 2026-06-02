# 03 — Möbius Portal — distortion-expansion-v1

## Agent instructions (START HERE)

Follow sections in order. **Depends on nothing** (parallel with **01** after **00** if helpers unused here). Read **`_OVERVIEW.md`**.

## Overview

Ship **`mobius-portal`** — disk automorphism portal warp with pole position, rotation, blend, and singularity safety.

## Scope

### In

- **Files:** `src/shaders/nodes/mobius-portal.ts`; registry + WGSL case.

| Field | Value |
| --- | --- |
| `id` | `mobius-portal` |
| `displayName` | `Möbius Portal` |
| `category` | `Distort` |
| `icon` | `aperture` or `circle-notch` (distinct from **Radial Warp**) |

**Parameters:**

| Param | Type | Default | Label |
| --- | --- | --- | --- |
| `centerX`, `centerY` | float | `0` | **Center X/Y** (`coords`) |
| `poleX`, `poleY` | float | `0.3`, `0` | **Pole X/Y** (`coords`) |
| `poleRadius` | float | `0.85` | **Pole limit** (clamp `\|a\| < 0.95`) |
| `rotation` | float | `0` | **Rotation** |
| `zoom` | float | `1` | **Zoom** |
| `blend` | float | `0.5` | **Blend** |
| `boundarySoft` | float | `0.1` | **Edge soft** (fade near `\|z\|→1`) |

**Math (v1 — disk automorphism, not free 4×4 matrix):**

1. `z = (p - center) * zoom` as `vec2` complex.
2. `a = pole * poleRadius` clamped.
3. `w = exp(i*rotation) * (z - a) / (1 - dot(a, z))` with `denom = max(abs(1 - dot(a,z)), eps)`.
4. Optional boundary fade when `length(z) > 1 - boundarySoft`.
5. `out = mix(in, center + w, blend)`.

**Help text:** Conformal map; straight lines → circles; differs from **Radial Warp** symmetric lens.

**Tests:** compile smoke; preset-safe defaults (pole not on unit circle).

**Audio:** bass → **Blend** or **Pole limit**; tempo → **Rotation** (document in **06**).

### Out

- Full Möbius matrix UI (v2).
- Log-Droste / recursive texture sampling.

## Dependencies

### Provides

- `mobius-portal`

### Blocks

- **06**

## Completion

✅ Done when singular defaults are safe, both backends compile, tests green, verify command passes.

### Final steps

- Update `_OVERVIEW.md` row **03** → ✅ + date.
