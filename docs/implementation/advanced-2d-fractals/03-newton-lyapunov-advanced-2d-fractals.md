# 03 — Newton + Lyapunov modes — advanced-2d-fractals

## Agent instructions (START HERE)

Follow sections in order. Add **new top-level modes** only (**6**, **7**). Do not break modes **0–5**. Do not implement shape-modulus/portal or flames here.

## Overview

Add two distinct dynamical fields to Fractal: **Newton** (root-basin / convergence) and **Lyapunov** (logistic-map sequence stripes), each as a new `fractalMode` with a small, focused parameter set and float output suitable for Color Map.

## Scope

### In

- `src/shaders/nodes/fractal.ts`
  - Extend `fractalMode` **max** to **7**.
  - **Mode 6 Newton:** iterate Newton for a fixed low-degree polynomial (default \(z^3 - 1\) or \(z^n - 1\) with small `fractalNewtonPower` 2–5). Output from convergence speed and/or root id hashed to float (document which).
  - **Mode 7 Lyapunov:** sequence driven by params (e.g. two-symbol string ABAB via `fractalLyapunovA` / `B` growth rates, or simplified a/b pair); accumulate Lyapunov exponent estimate; map to 0–1 via Contrast/Intensity.
  - Reuse Center/Scale/Iterations/animation where they make sense; hide Julia/fold-only params via `visibleWhen`.
- `parameterEnumMappings.ts` — mode labels **Newton**, **Lyapunov**.
- `node-documentation.json` — jargon parentheticals; examples.

### Out

- General polynomial editor UI; arbitrary Lyapunov strings longer than a fixed compile-time length.
- Shape-modulus/portal (**04**); flames/RD (**05**).

## Dependencies

### Prerequisites

- **01** (iteration/coloring patterns); **02** preferred so trap layout/`visibleWhen` patterns are settled.

### Provides

- Modes 6–7 for presets and demos.

### Blocks

- None hard; **04** should not reuse mode ints 6–7.

## Implementation tasks

1. Raise mode max; add Newton params + GLSL loop; float encoding documented in help.
2. Add Lyapunov params + bounded iteration; stable normalize to ~0–1.
3. `visibleWhen` / layout so fold/Julia/trap params don’t clutter Newton/Lyapunov.
4. Enums + documentation (including “not Mandelbrot” clarification).
5. Smoke modes 6–7; regression spot-check modes 0–5.

## Technical notes

- Newton: track `z - p(z)/p'(z)`; bail when `|Δz|` small or `|z|` huge; root id via `atan` sector or nearest root.
- Lyapunov: keep sequence length ≤ iterations cap; avoid NaNs (clamp r, x in (0,1)).
- Performance: same `FRACTAL_MAX_ITERATIONS` bound.

## Completion

✅ Done when modes 6 and 7 render distinct useful fields, enums/docs/`visibleWhen` are correct, legacy modes unaffected at defaults, and `npm run type-check && npm test && npm run lint && npm run build` pass.

### Final steps

- Mark **03** ✅ in **`_OVERVIEW.md`**; proceed to **04**.
