# 02 — Export dialogs owned by lib — arch-perf-followups

## Agent instructions (START HERE)

Follow sections in order. Export packages must not `mount()` Svelte. Coordinate with **01** if touching `appExportSession`.

## Overview

Invert review **A4**: `image-export` / `video-export` orchestrators currently mount `ImageExportDialog` / `VideoExportDialog`. Move dialog ownership into `src/lib` (e.g. `appExportSession` or export UI helpers); orchestrators expose pure start/progress/complete APIs.

## Scope

### In

- Remove `mount`/`unmount` of dialogs from:
  - `src/image-export/imageExportOrchestrator.ts`
  - `src/video-export/videoExportOrchestrator.ts`
- Lib-side API that shows dialogs then calls orchestrator run functions with resolved config.
- Keep resolution limits, progress, cancel, exclusive raster messaging.
- Update any tests that assumed orchestrator-owned UI.

### Out

- Changing export codecs/bitrate defaults unless required by API split.
- WebGPU pass executor work (remediation **04\***).

## Dependencies

### Prerequisites

- **`_OVERVIEW.md`**; skim `docs/user-goals/09-export.md` for UX invariants.

### Provides

- Clean export package boundary (no Svelte).

### Blocks

- Soft conflict with **01**.

## Implementation tasks

1. Sketch target API: `resolveConfig via dialog` in lib → `runImageExport(config)` / `runVideoExport(config)`.
2. Move mount sites; delete Svelte imports from export packages.
3. Wire App / `appExportSession` to new flow.
4. Type-check + export-related tests; manual open dialog → cancel / short export smoke.

## Technical notes

- Skill **`export-pipeline-check`** / export rules if present—honor resolution + progress UX.
- `video-export` may still host `buildExportFrameState` (offline core); only UI mount moves.

## Completion

✅ Done when export packages have no `.svelte` mounts, lib owns dialogs, export UX still works, and checks pass.

### Final steps

- Mark task **02** ✅ in **`_OVERVIEW.md`**.
