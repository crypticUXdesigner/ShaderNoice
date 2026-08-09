# 04A — Shared WebGPU pass executor core — arch-perf-remediation

## Agent instructions (START HERE)

Follow sections in order. Extract **shared** pack + run logic only; do not delete the three callers yet (**04B**). Keep visual parity.

Conflict risk: coordinate with anyone touching `WebGpuRenderBackend` / export paths.

## Overview

Create a single module that owns WebGPU **param-slot packing** (runtime-only / connection-suppressed rules) and **pass-plan execution** for the four plan kinds (`blur`, `bokeh`, `glow-bloom`, `crepuscular-rays`), reusable by preview and both export paths.

## Scope

### In

- New module under e.g. `src/runtime/renderBackends/webgpuPassPlanExecutor.ts` (name flex).
- Factor shared logic from:
  - `WebGpuRenderBackend.ts`
  - `image-export` / `WebGpuExportRenderPath.ts`
  - `video-export` / `WebGpuVideoExportRenderPath.ts`
- Shared helpers must call existing pass-plan runtimes (`blurGaussian…`, `glowBloom…`, `bokeh…`, `crepuscularRays…`) — do not fork plan math.
- Unit tests for param packing parity (same slots as previous export path for a fixture graph).

### Out

- Switching callers to the new API (**04B**).
- Changing WGSL pass-plan generation in compilers.

## Dependencies

### Prerequisites

- **`_OVERVIEW.md`** (02 nice-to-have for types, not required).

### Provides

- Stable executor API for **04B**.

### Blocks

- **04B**.

## Implementation tasks

1. Diff the three callers’ pack + encode sequences; list duplicated blocks.
2. Extract `setParamSlot` / suppression packing + “run plan kind” into shared API with explicit host hooks (device, textures, encoder).
3. Add fixture tests for packing equality vs golden expectations from one existing path.
4. Leave callers on old code until **04B** (or optionally dual-call behind a flag — prefer no flag).

## Technical notes

- Host differences (preview vs offline size, readback) stay as injected callbacks — shared module must not import Svelte or orchestrators.
- Reuse `runtimeOnlyParams` / `resolveParameterInputMode` — do not invent a fourth policy.

## Completion

✅ Done when shared module exists with tests for packing, existing three paths still compile/run unchanged, and type-check + tests pass.

### Final steps

- Mark task **04A** ✅ in **`_OVERVIEW.md`**; unblock **04B**.
