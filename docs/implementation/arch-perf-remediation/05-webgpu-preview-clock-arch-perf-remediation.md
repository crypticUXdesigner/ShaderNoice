# 05 — WebGPU preview dependency clock — arch-perf-remediation

## Agent instructions (START HERE)

Follow sections in order. Safety over FPS: do **not** enable a mask that can freeze motion. Prefer a **conservative subset** or stronger validation before flipping the URL default.

## Overview

Address review **P1**: WebGPU sessions default to full-rate `TimeManager` work because `webgpuPreviewDependencyClock` is opt-in and fail-open. Harden mask inference/validation and document (or cautiously default) a safe path for paused/static graphs.

## Scope

### In

- Audit `previewDependencyMask` emission (GLSL vs WGSL) and `resolveWebGpuPreviewDependencyMaskForClock`.
- Either:
  - **(A)** Ship a conservative always-safe subset (e.g. only skip when mask proves no wall/timeline/audio/spawn/frame drivers), or
  - **(B)** Keep URL opt-in but expand tests + architecture doc so contributors can enable confidently; add golden/harness notes if needed.
- Extend `webGpuPreviewDependencyClock.test.ts` for fail-open cases.
- Update `docs/architecture/preview-and-recompilation.md` URL-flag section if behavior changes.

### Out

- Adaptive DPR productization.
- Changing WebGL mask behavior (already used).

## Dependencies

### Prerequisites

- **`_OVERVIEW.md`**; **01** optional.

### Provides

- Clear WebGPU clock policy + tests.

### Blocks

- Nothing.

## Implementation tasks

1. Catalog false-negative risk cases (missed motion) from code comments + tests.
2. Implement A or B; record choice in `_OVERVIEW` Notes when done.
3. Add unit tests for resolve helper edge cases.
4. Doc touch for URL flag / default.

## Technical notes

- `RuntimeManager.setTime` is the injection point — keep fail-open to `null` unless tests prove safety.
- Prefer matching WebGL’s `previewDependencies` semantics where WGSL already emits the mask.

## Completion

✅ Done when policy is explicit (A or B), tests cover fail-open, docs match code, and no known static→stuck-preview regression is introduced.

### Final steps

- Mark task **05** ✅ in **`_OVERVIEW.md`**; note A vs B in Notes.
