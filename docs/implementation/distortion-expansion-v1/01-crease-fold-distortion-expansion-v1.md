# 01 — Crease Fold — distortion-expansion-v1

## Agent instructions (START HERE)

Follow sections in order. **Depends on nothing** (can run parallel to **00**). Read **`_OVERVIEW.md`**.

## Overview

Ship **`crease-fold`** — linear hinge UV fold with soft crease, optional repeat grid, and blend toward input.

## Scope

### In

- **Files:** `src/shaders/nodes/crease-fold.ts`; export `src/shaders/nodes/index.ts`.
- **WGSL:** `WgslMvpCompiler.ts` allow-list + `case 'crease-fold'`.

| Field | Value |
| --- | --- |
| `id` | `crease-fold` |
| `displayName` | `Crease Fold` |
| `category` | `Distort` |
| `icon` | `fold` or nearest Phosphor fold/paper icon in `canvas-icons` |
| `description` | Hinged mirror fold across moving crease line(s); not radial kaleidoscope |

**Ports:** `in` vec2 **UV** → `out` vec2 **UV**

**Parameters (v1):**

| Param | Type | Default | Range | Label |
| --- | --- | --- | --- | --- |
| `creaseAngle` | float | `0` | 0..360 | **Angle** |
| `creaseOffset` | float | `0` | -2..2 | **Offset** |
| `foldAmount` | float | `1` | 0..1 | **Fold** |
| `softness` | float | `0.02` | 0..0.5 | **Soft** |
| `repeatSpacing` | float | `0` | 0..2 | **Repeat** (0 = off) |
| `repeatCount` | int | `1` | 1..8 | **Count** |
| `phase` | float | `0` | 0..6.28 | **Phase** |
| `blend` | float | `1` | 0..1 | **Blend** |

- `creaseOffset` + optional origin: use **Offset** along crease normal; origin at `(0,0)` in UV space unless **Center X/Y** added — v1 may omit center (origin fixed) to limit params; document in help.
- `supportsAnimation` / `supportsAudio` on **Fold**, **Offset**, **Angle**, **Phase**.

**Shader logic:**

1. `n = (cos θ, sin θ)`, `d = dot(p, n) - offset` (after phase on offset).
2. Reflect positive side: `p' = p - 2*n*max(d,0)`.
3. `w = smoothstep(-soft, soft, d)`; `p_fold = mix(p, p', foldAmount * w)`.
4. If `repeatSpacing > 0`: wrap `d`, alternate fold direction by `floor(d/spacing) % 2`.
5. `out = mix(in, p_fold, blend)`.

**`parameterLayout`:** grid with **Angle** + **Offset** (`coords` only if center params exist), **Fold** / **Soft**, **Repeat** / **Count**, **Blend**.

**Tests:** `NodeShaderCompiler.test.ts` — `uv-coordinates` → `crease-fold` → compile WebGL + WebGPU.

**Presets:** defer to **06** (stub OK).

### Out

- Crease shear along tangent (v1.1).
- Seam Teleport node.

## Dependencies

### Provides

- `crease-fold` on both backends.

### Blocks

- **06** (partial — preset in 06)

## Completion

✅ Done when node compiles both backends, appears in palette, test passes, **`npm run type-check && npm run test && npm run build`** green.

### Final steps

- Update `_OVERVIEW.md` row **01** → ✅ + date.
