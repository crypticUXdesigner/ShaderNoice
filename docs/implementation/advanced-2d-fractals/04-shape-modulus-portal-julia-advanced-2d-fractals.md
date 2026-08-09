# 04 — Shape-modulus / portal Julia — advanced-2d-fractals

## Agent instructions (START HERE)

Follow sections in order. Prefer **shape-modulus Julia** as the primary deliverable; treat a **single portal** as stretch if time remains. Do not start flames/RD work (**05**). Preserve modes **0–7** from prior tasks.

## Overview

Add an artist-directable Julia-style field: **shape-modulus** (coarse shape from a parametric modulus, fine fractal detail retained), optionally plus one **portal** (iteration-space remap) for localized self-similarity—aligned with Schor & Kim research but simplified for a realtime UV→float node.

## Scope

### In

- `src/shaders/nodes/fractal.ts`
  - New mode **8** **Shape Julia** (or escape-family entry—**prefer new mode 8** to avoid overloading mode 3 further).
  - Shape-modulus: replace/modulate \(|z|\) (or bailout radius) using a **parametric shape** (circle / ellipse / soft blob via Center + Scale + `fractalShapeRadius` / aspect)—no SDF port required in this task.
  - Thinness/offset-style artistic controls mapped to short labels (e.g. **Thin**, **Shell**) with sane defaults.
  - **Stretch:** one portal disk (`Center`, `Radius`) that remaps `z` when inside the disk (Into-the-Portal-inspired, 2D only).
  - Coloring: reuse **01** Iteration/Smooth/Distance when applicable, or document a fixed coloring for mode 8.
- Enums + docs citing the idea at a high level (no paper dump in UI).
- Example graph blurb in documentation.

### Out

- Full mesh/SDF painting pipeline; 3D quaternion Julia; offline optimization (Kim 2015).
- Multi-portal editor UX; flames/RD.

## Dependencies

### Prerequisites

- **01** (escape/DE helpers); **02–03** preferred so mode ints and layout patterns are final.

### Provides

- Differentiating Fractal mode for demos/presets.

### Blocks

- None (package feature-complete aside from **05** spike).

## Implementation tasks

1. Add mode **8** + shape-modulus iteration with parametric shape; defaults produce a clear circular “shell of detail.”
2. Wire Thin/Shell (or equivalent) + `visibleWhen`; Intensity/Contrast apply.
3. Stretch: single portal remap; hide portal params unless enabled.
4. Enums + `node-documentation.json` (tagline: shape-conforming Julia detail).
5. Smoke mode 8; confirm modes 0–7 unchanged.

## Technical notes

- Reference: Shape Modulus (Schor & Kim)—implement a **simplified 2D realtime approximation**, not a full port of their C++ field library.
- Keep math in `functions` block; comment the modulus formula once.
- If mode 8 proves too costly, lower default iterations for that mode only.

## Completion

✅ Done when mode 8 produces a shape-biased Julia-like float field with documented controls, enums/docs updated, legacy modes stable, and `npm run type-check && npm test && npm run lint && npm run build` pass. Portal stretch is optional—if skipped, note explicitly in **`_OVERVIEW`** Notes.

### Final steps

- Mark **04** ✅ in **`_OVERVIEW.md`**; proceed to **05**.
