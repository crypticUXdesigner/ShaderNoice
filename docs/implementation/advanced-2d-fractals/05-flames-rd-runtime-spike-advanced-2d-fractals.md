# 05 — Flames & reaction–diffusion runtime spike — advanced-2d-fractals

## Agent instructions (START HERE)

This task is a **design/feasibility spike**, not a Fractal mode. Do **not** implement Electric Sheep or Gray–Scott in `fractal.ts`. Produce a short architecture note and update **`_OVERVIEW`** Notes with a go/no-go recommendation.

## Overview

Priorities **1–4** stay single-pass fragment fields. Fractal **flames** (Draves density IFS) and **Gray–Scott** reaction–diffusion need **accumulation or feedback textures**. Spike the fit against ShaderNoice runtime (WebGL/WebGPU preview + export) and record a follow-up package boundary.

## Scope

### In

- New doc: `docs/architecture/fractal-flames-and-reaction-diffusion.md` (or under this folder `SPIKE-flames-rd.md` if architecture folder is wrong—prefer **architecture** for long-lived seams).
  - Flames: chaos game vs deterministic IFS; density buffer; log tone map; why not a Patterns float node.
  - RD: ping-pong simulation; seed UI; export/time coupling risks.
  - Touchpoints: `RuntimeManager`, compile graph, export raster backend exclusivity, WebGPU compute opportunity.
  - Recommendation: **defer** | **prototype compute pass** | **separate node type + sim subsystem**; estimate rough effort.
- Update **`_OVERVIEW.md`** Notes with the recommendation + link.
- Optional: 5–10 line comment in `fractal.ts` file header pointing “no flames here—see architecture note.”

### Out

- Shipping flames or RD UI/nodes.
- Changing compile or runtime code beyond a comment pointer.
- Deep-zoom / perturbation research.

## Dependencies

### Prerequisites

- **01** recommended (context on what Fractal already covers); **04** optional.

### Provides

- Decision record for a future package (e.g. `fractal-flames-v1` / `reaction-diffusion-v1`).

### Blocks

- None inside this package.

## Implementation tasks

1. Read current preview/export seams (`RuntimeManager`, export flows) enough to speak accurately.
2. Write the architecture spike doc (keep ≤~100 lines).
3. Record go/no-go + suggested next slug in **`_OVERVIEW`** Notes.
4. Optional comment pointer on `fractal.ts`.

## Technical notes

- Refs: Draves & Reckase *The Fractal Flame Algorithm*; Gray–Scott shader writeups; Lawlor IFS GPU paper (deterministic density).
- Honor AGENTS.md: export backend exclusivity—any sim must declare which raster API it uses.

## Completion

✅ Done when the architecture note exists, `_OVERVIEW` Notes state an explicit recommendation and proposed follow-up slug, and no unfinished Fractal-mode claims remain for flames/RD. No code behavior change required (comment-only OK).

### Final steps

- Mark **05** ✅ and set package progress in **`_OVERVIEW.md`** (feature tasks 01–04 may still be in progress if this ran early—only mark overall complete when **01–05** are all ✅).
