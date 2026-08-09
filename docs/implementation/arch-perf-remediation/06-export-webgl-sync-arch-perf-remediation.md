# 06 — Export WebGL sync — arch-perf-remediation

## Agent instructions (START HERE)

Follow sections in order. Black frames are worse than slow exports — any sync change needs a clear correctness story and a test or documented manual check.

## Overview

Mitigate review **P4**: `ExportRenderPath.renderFrame` calls `gl.flush()` + `gl.finish()` every frame. Replace or gate with a safer async-friendly sync (fence / client-wait) or capture-previous-frame pattern **without** regressing encoder sampling.

## Scope

### In

- **`src/video-export/ExportRenderPath.ts`** (and image path if it shares the same finish).
- Investigate `WebGLSync` / `fenceSync` + `clientWaitSync` with timeout; or finish only when the capture API requires it.
- WebGPU export already uses submit/`onSubmittedWorkDone` patterns — do not weaken those.
- Add a short comment + optional unit/integration hook documenting the chosen sync contract.
- Manual checklist note: short WebGL video export, verify no black frames.

### Out

- Offline FFT hop rate (**deferred P5**).
- Changing bitrate / WebCodecs settings.

## Dependencies

### Prerequisites

- **`_OVERVIEW.md`**

### Provides

- Lower export wall time on WebGL when safe.

### Blocks

- Nothing.

## Implementation tasks

1. Confirm why `finish` was added (blame/comments/`DRAWING-BUFFER-AUDIT` / preserveDrawingBuffer).
2. Prototype fence wait; fall back to `finish` on failure or unsupported.
3. Verify image + video WebGL export still capture non-black frames.
4. Document decision in code comment; point **08** at architecture if needed.

## Technical notes

- `preserveDrawingBuffer: true` remains until an explicit resolve path exists (architecture audit).
- Prefer one sync helper shared by image/video WebGL export if duplicated.

## Completion

✅ Done when WebGL export no longer unconditionally `finish()` every frame **or** a measured/documented reason keeps it with a tracked follow-up; no black-frame regression on a short export smoke.

### Final steps

- Mark task **06** ✅ in **`_OVERVIEW.md`**.
