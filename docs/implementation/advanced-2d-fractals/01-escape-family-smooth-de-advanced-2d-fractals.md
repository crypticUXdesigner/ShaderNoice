# 01 — Escape family + smooth/DE — advanced-2d-fractals

## Agent instructions (START HERE)

Follow sections in order. Respect **`_OVERVIEW.md`** locked decisions: modes **0–5** semantics unchanged; escape upgrades live under mode **3** via new params. Do **not** implement traps, Newton, Lyapunov, portals, or flames here.

## Overview

Extend Fractal mode **3** with an escape **family** (Julia / Mandelbrot / Burning Ship) and **coloring** (raw iteration / smooth continuous / exterior distance estimate). Reuse complex multiply and DE ideas from `julia-slab-sdf` where practical; keep output a normalized **float** field.

## Scope

### In

- `src/shaders/nodes/fractal.ts`
  - Params: `fractalEscapeFamily` (int 0–2), `fractalColoring` (int 0–2); defaults **0 / 0** so legacy Julia + raw escape match today’s look.
  - Mandelbrot: \(z_0=0\), \(c=p\); Julia: current \(z=p\), \(c=\) Julia X/Y (+ existing c drift).
  - Burning Ship: abs on components before square (document Y orientation in help).
  - Smooth: continuous iteration index; DE: exterior estimate clamped/normalized into ~0–1 × Intensity/Contrast.
  - `parameterLayout` / `visibleWhen`: family + coloring only when `fractalMode === 3`.
- `src/utils/parameterEnumMappings.ts` — labels for both new enums; keep mode 3 label **Julia** or rename to **Escape** only if docs + enum stay consistent (prefer rename mode 3 display to **Escape** once family exists).
- `src/data/node-documentation.json` — `node:fractal` Mode / new params / examples / advanced.

### Out

- Trap shapes (**02**), Newton/Lyapunov (**03**), shape-modulus/portal (**04**), flames/RD (**05**).
- Raising `FRACTAL_MAX_ITERATIONS` above 32 (unless required for DE stability—justify in notes).

## Dependencies

### Prerequisites

- **`advanced-2d-fractals/_OVERVIEW.md`**

### Provides

- Stable escape helpers + coloring contract for **02–04**.

### Blocks

- **02**, **03**, **04** (same file / shared helpers).

## Implementation tasks

1. Add family + coloring params with safe defaults; wire `visibleWhen` + layout.
2. Implement Mandelbrot and Burning Ship branches; preserve Julia path at defaults.
3. Implement smooth and DE coloring; Intensity/Contrast still apply.
4. Update enum mappings + node documentation (examples for Mandelbrot + DE).
5. Manual smoke: UV → Fractal (mode Escape) → Output for each family × coloring; confirm mode 0–2/4–5 unchanged.

## Technical notes

- Mirror DE safeguards from `julia-slab-sdf` (log/ε, `|dz|` clamp).
- Prefer renaming mode **3** UI label to **Escape** in `parameterEnumMappings` when family ships.
- Conflicting file: `fractal.ts` — land before **02**.

## Completion

✅ Done when mode 3 exposes Julia/Mandelbrot/Burning Ship and Iteration/Smooth/Distance coloring, defaults match pre-change Julia look, enums + docs updated, and `npm run type-check && npm test && npm run lint && npm run build` pass.

### Final steps

- Mark **01** ✅ in **`_OVERVIEW.md`**; unblock **02**.
