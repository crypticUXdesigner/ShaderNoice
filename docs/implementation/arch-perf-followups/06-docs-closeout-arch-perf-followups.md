# 06 — Docs + package closeout — arch-perf-followups

## Agent instructions (START HERE)

Last task. Sync architecture (and user-goals only if UX changed). Full verify before marking package done.

## Overview

Document landed follow-ups and close the package: App module map, export API boundary, validation injection, incremental/hash-skip honesty, analysis rate policy.

## Scope

### In

- Update as applicable:
  - `docs/architecture/editor-ui-canvas-layout.md` or graph boundaries (App modules)
  - `docs/architecture/webgl-webgpu-preview-export.md` / export notes (dialog ownership)
  - `docs/architecture/WIRE-VALIDATION-DESIGN.md` or graph boundaries (injection)
  - `docs/architecture/preview-and-recompilation.md` / compilation-worker (incremental truth)
  - `docs/architecture/audio-reactivity.md` (analysis hop/cache)
- Point remediation `_OVERVIEW` deferred row at this package (if not already).
- `docs/implementation/README.md` status.
- `npm run type-check && npm test && npm run lint && npm run build`.

### Out

- New product features; adaptive DPR shipping.

## Dependencies

### Prerequisites

- Prior tasks in this package that landed (skip doc sections for skipped work).

### Provides

- Discoverable end state.

### Blocks

- Nothing.

## Implementation tasks

1. Patch architecture docs with “Last updated” and short seam descriptions.
2. Cross-link remediation ↔ follow-ups.
3. Full verify green.
4. Set progress 100% / Done when all intended tasks ✅.

## Completion

✅ Done when docs match code, README reflects status, verify is green, and `_OVERVIEW` marks the package complete.

### Final steps

- Mark task **06** ✅; update **Overall** progress in **`_OVERVIEW.md`**.
