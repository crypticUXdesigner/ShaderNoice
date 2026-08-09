# 04B — Wire preview + exports to shared executor — arch-perf-remediation

## Agent instructions (START HERE)

Requires **04A**. Replace duplicated pack/run in all three callers with the shared executor. Delete dead private copies. Preserve exclusive raster session + black-frame-free export.

## Overview

Point `WebGpuRenderBackend`, `WebGpuExportRenderPath`, and `WebGpuVideoExportRenderPath` at the **04A** executor so pass-plan execution has one maintenance surface.

## Scope

### In

- Refactor three callers to use shared API.
- Remove duplicated local `setParamSlot` / plan switchboards once unused.
- Smoke: existing WebGPU compile/export tests; extend if gaps.
- Note in task completion what manual QA remains (INTEGRATION-QA matrix rows for WebGPU image/video if applicable).

### Out

- Preview vs export driver-uniform collector unification (radial pulse / MIDI / arrangement) — optional follow-up, not required here.
- Dialog mounting inversion (**deferred A4**).

## Dependencies

### Prerequisites

- **04A**

### Provides

- Single WebGPU pass-plan execution path (review **A1**).

### Blocks

- Nothing; **08** may document the seam.

## Implementation tasks

1. Wire preview backend to shared executor.
2. Wire image + video export paths; keep frame-state merger callers intact.
3. Delete now-dead private helpers; grep for duplicate plan imports.
4. Run WebGPU-related tests; `npm run type-check && npm test`.

## Technical notes

- Export paths still own readback / encoder lifecycle; shared module only packs + encodes passes into the provided encoder.
- If preview and export disagree on a packing edge case, fix in **shared** code and add a regression test — do not re-fork.

## Completion

✅ Done when all three callers use the shared executor, duplicated packing is gone, WebGPU preview/export tests pass, and no behavior regressions on supported pass-plan graphs.

### Final steps

- Mark task **04B** ✅ in **`_OVERVIEW.md`**.
