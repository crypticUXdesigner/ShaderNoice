# 02 — Cellular Slip — distortion-expansion-v1

## Agent instructions (START HERE)

Follow sections in order. **Depends on task 00.** Read **`_OVERVIEW.md`**.

## Overview

Ship **`cellular-slip`** — Voronoi-addressed per-cell slide / rotate with edge softness; distinct from **Block Glitch** rectangles and **Cells** float pattern.

## Scope

### In

- **Files:** `src/shaders/nodes/cellular-slip.ts`; registry + WGSL case.
- Import **`emitVoronoiCellGlsl/Wgsl`** and **`hashCell`** from **00**.

| Field | Value |
| --- | --- |
| `id` | `cellular-slip` |
| `displayName` | `Cellular Slip` |
| `category` | `Distort` |
| `icon` | `cell` or `grid-four` (distinct from **Cells** if possible) |

**Parameters:**

| Param | Type | Default | Label |
| --- | --- | --- | --- |
| `cellScale` | float | `4` | **Scale** |
| `jitter` | float | `1` | **Jitter** |
| `slipAmount` | float | `0.15` | **Slip** |
| `rotationAmount` | float | `0` | **Rotate** |
| `edgeSoftness` | float | `0.05` | **Edge** |
| `edgeLock` | int | `0` | **Lock edges** (0/1 toggle) |
| `seed` | float | `0` | **Seed** |
| `stepHz` | float | `0` | **Step Hz** (quantize time like Block Glitch) |
| `blend` | float | `1` | **Blend** |

**Logic:**

1. Voronoi lookup → cell seed `s`, `f1`, `f2`.
2. `hash(cellId + seed)` → slip `vec2`, angle.
3. Local `q = p - s`; rotate `q`; `p_cell = s + q + slip * slipAmount`.
4. Edge weight `w = smoothstep(0, edgeSoftness, f2 - f1)`; if **Lock edges**, reduce displacement near edges (`mix` toward `p`).
5. `out = mix(in, p_cell, blend)`.

**Performance:** 3×3 search only; document cost in help.

**Tests:** compile smoke; fragment contains voronoi helper symbol from **00**.

### Out

- Multi-layer Voronoi / crack refractor (future).

## Dependencies

### Provides

- `cellular-slip`

### Blocks

- **06**

## Completion

✅ Done when **00** helpers used, both backends compile, test green, full verify command passes.

### Final steps

- Update `_OVERVIEW.md` row **02** → ✅ + date.
