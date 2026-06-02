# 00 — Shared UV warp helpers — distortion-expansion-v1

## Agent instructions (START HERE)

Follow sections in order. **No dependencies.** Blocks **02** (Cellular Slip) and **05** (Circle Inversion). Read **`_OVERVIEW.md`** for safety conventions.

## Overview

Extract small, testable **GLSL + WGSL emitters** for circle inversion and 2D Voronoi cell lookup so **Cellular Slip** and **Circle Inversion** do not fork a third copy of **Cells** logic.

## Scope

### In

- **New module:** `src/shaders/uvWarp/` (name may be `uvWarp` or `uv-warp` — match repo import style).

**API (TypeScript, documented in module JSDoc):**

| Export | Purpose |
| --- | --- |
| `emitCircleInversionGlsl()` / `emitCircleInversionWgsl()` | `vec2 circleInversionUv(vec2 z, vec2 center, float radius, float strength)` — standard `center + p * (r² / max(dot(p,p), eps))` with strength blend toward identity |
| `emitVoronoiCellGlsl()` / `emitVoronoiCellWgsl()` | `vec3 voronoiCellLookup(vec2 p, float scale, float jitter)` → cell id hash seed, `f1`, `f2`, winner seed position (match **Cells** metric default: Euclidean unless param passed later) |
| `hashCell(vec2 cellId)` | Stable `vec2` / angle for per-cell motion (shared by Cellular Slip) |

**Behavior:**

- Voronoi: **3×3 neighborhood** only (same as `voronoi-noise` / `WgslMvpCompiler` `voronoiFull`).
- Inversion: `eps = 1e-4` minimum squared radius; `strength` in `[0,1]` mixes `z` vs inverted.

**Tests:** `src/shaders/uvWarp/uvWarp.test.ts` (Vitest):

- Inversion: point at `2r` from center maps predictably (golden scalar checks in TS, or compile-only if GPU-less).
- Voronoi: same cell id at interior of a cell for two nearby UV samples (optional property test).

**Do not** wire nodes in this task — only helpers + tests.

### Out

- Node specs, `WgslMvpCompiler` cases, presets.

## Dependencies

### Provides

- Emitted function strings consumed by **02**, **05** node `functions` blocks (import and splice) and WGSL cases.

### Blocks

- **02**, **05**

## Technical notes

- Prefer **one** Voronoi implementation source; if full extraction from `voronoi-noise.ts` is risky in one session, duplicate once in `uvWarp` and add a comment linking **Cells** for future dedupe.
- WGSL names must avoid collisions (`uvWarp_circleInversion`, etc.) when inlined in `WgslMvpCompiler`.

## Completion

✅ Done when Vitest passes, helpers export GLSL/WGSL snippets, and **`npm run type-check && npm run test && npm run build`** green.

### Final steps

- Update `_OVERVIEW.md` row **00** → ✅ + date.
