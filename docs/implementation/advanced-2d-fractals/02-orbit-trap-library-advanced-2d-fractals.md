# 02 — Orbit trap library — advanced-2d-fractals

## Agent instructions (START HERE)

Follow sections in order. Build on **01** escape helpers if useful for hybrid trap+escape later, but **do not** change escape family defaults. Scope is mode **4** (orbit trap) only.

## Overview

Replace the single ring trap in Fractal mode **4** with a small **trap-shape library** (line, cross, ring, spiral) plus a **multi** mix, so trap coloring matches common fractal-art practice while staying a single float accumulation.

## Scope

### In

- `src/shaders/nodes/fractal.ts`
  - `fractalTrapShape` (int): **0** Ring (current look), **1** Line, **2** Cross, **3** Spiral, **4** Multi.
  - Default **0** preserves existing ring trap appearance at stock params.
  - Per-iteration: measure distance from orbit point `z` to trap; accumulate `exp(-dist * scaleAcc * k)` (same spirit as today).
  - Multi: blend ≥2 trap distances (e.g. min or weighted sum of ring+cross)—document formula in help.
  - Optional thin params only if needed (e.g. `fractalTrapRadius` for ring/spiral)—keep labels short; hide when unused via `visibleWhen`.
- Enum maps + `node-documentation.json` for mode 4 / trap shape.
- Layout: trap controls visible when `fractalMode === 4`.

### Out

- Escape family edits except shared pure helpers.
- Newton/Lyapunov; shape-modulus; flames.
- Arbitrary user SDF traps (no extra inputs in this task).

## Dependencies

### Prerequisites

- **01** merged (shared `fractal.ts` baseline).

### Provides

- Richer mode-4 trap field for presets and for **04** if portal/shape modes reuse trap distance.

### Blocks

- Soft: **04** may reuse trap helpers—coordinate if overlapping.

## Implementation tasks

1. Add `fractalTrapShape` (+ minimal radius/width if required) with Ring default.
2. Implement line, cross, spiral distance functions; keep ring path bit-identical at defaults.
3. Implement Multi mix; clamp accumulation for stability.
4. Enums, `visibleWhen`, docs/examples (snowflake-style cross traps).
5. Smoke mode 4 each shape; confirm modes 0–3/5 unchanged.

## Technical notes

- Spiral trap: polar distance to an Archimedean or log spiral arm is enough—avoid heavy loops inside the iteration beyond the existing iteration cap.
- IQ orbit-trap mental model: closest approach of the orbit to a geometric figure.

## Completion

✅ Done when mode 4 offers Ring/Line/Cross/Spiral/Multi with Ring default matching prior look, enums + docs updated, and `npm run type-check && npm test && npm run lint && npm run build` pass.

### Final steps

- Mark **02** ✅ in **`_OVERVIEW.md`**; proceed to **03**.
