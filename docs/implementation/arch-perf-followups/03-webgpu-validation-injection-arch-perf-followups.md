# 03 — WebGPU validation injection — arch-perf-followups

## Agent instructions (START HERE)

Follow sections in order. Align with `docs/architecture/WIRE-VALIDATION-DESIGN.md` and `GAP-INVENTORY.md`. Do not expand WGSL MVP coverage except to wire existing allowlists cleanly.

## Overview

Fix review **A6**: `data-model/webGpuExclusiveConnectionValidation.ts` importing shader MVP allowlists inverts layers. Introduce a **platform-validation / policy** module (or injected allowlist) that both editor validation and compilers consume—data-model no longer imports `src/shaders/compilation/*` allowlists.

## Scope

### In

- New home for WebGPU wire rules / allowlist data (e.g. `src/platform-validation/` or `src/data-model/platform/` fed by a shaders-owned constant re-exported once).
- Refactor `webGpuExclusiveConnectionValidation` to depend on the neutral policy, not deep shader paths.
- Keep existing Phase 1 behaviors (raymarcher SDF allowlist, displacement rules, etc.).
- Tests for wire reject/accept cases unchanged in outcome.

### Out

- Full pass-subgraph wire-time compile simulation (**GAP P1** later).
- Changing product copy for unsupported nodes beyond what validation already does.

## Dependencies

### Prerequisites

- **`_OVERVIEW.md`**; read WIRE-VALIDATION-DESIGN + GAP-INVENTORY.

### Provides

- Clean validation dependency direction.

### Blocks

- Nothing hard.

## Implementation tasks

1. Choose module location; move or dual-export allowlist constants.
2. Update data-model validation imports; ensure shaders still use same source of truth.
3. Extend/adjust tests; grep for forbidden `data-model` → `shaders/compilation` imports.
4. Brief architecture note (full doc sync in **06**).

## Technical notes

- Single source of truth for `GENERIC_RAYMARCHER_WEBGPU_MVP_SDF_TYPES` (and kin)—no divergent copies.
- Editor session still gates on WebGPU-exclusive mode when applying rules.

## Completion

✅ Done when data-model does not import shader compilation allowlist modules directly, wire behavior matches prior tests, and type-check + validation tests pass.

### Final steps

- Mark task **03** ✅ in **`_OVERVIEW.md`**.
