# 08 — Ownership closeout + arch docs — arch-perf-remediation

## Agent instructions (START HERE)

Last task. Sync docs with landed seams; do a **small** ownership hygiene slice only (not full App split or export dialog inversion).

## Overview

Close the package: relocate or clearly document one graph-domain utils leak, remove compile-contract re-export shims if safe, and update architecture docs so the new boundaries are discoverable.

## Scope

### In

- **Ownership slice (pick one, ship it):**
  - Move `virtualNodes` (and/or `paramDriverBypass`) into `src/data-model/` with re-exports from old paths **or**
  - Document “approved utils residuals” + delete any remaining dead duplicates.
- Remove `runtime/types` re-export shim from **02** if all call sites updated.
- Update:
  - `docs/architecture/graph-and-platform-boundaries.md` (compile-contract, utils note, graphComparison gone)
  - `docs/architecture/compilation-worker.md` (slim payload)
  - `docs/architecture/preview-and-recompilation.md` if **05** changed defaults
  - `docs/architecture/webgl-webgpu-preview-export.md` if **04B** shared executor
- `docs/implementation/README.md` — package stays **Active** until ✅; then note shipped on close.
- Package closeout checks: `npm run type-check && npm test && npm run lint && npm run build`.

### Out

- Full `App.svelte` decomposition (**deferred A2**).
- Unmounting export dialogs from orchestrators (**deferred A4**).
- WebGPU validation allowlist injection (**deferred A6**) beyond a doc pointer to GAP-INVENTORY.

## Dependencies

### Prerequisites

- **01–07** as applicable (at least **01**, **02**, **04B** if those landed; skip doc sections for skipped tasks).

### Provides

- Documented end state; package ready to mark complete.

### Blocks

- Nothing.

## Implementation tasks

1. Land ownership slice; fix imports.
2. Drop obsolete re-exports / dead files.
3. Patch architecture docs (dated “Last updated”).
4. Full verify: type-check, test, lint, build.
5. Set `_OVERVIEW` progress to 100% / Done when all prior tasks ✅.

## Technical notes

- Prefer pointers over essays in architecture docs.
- List deferred items (A2, A4, A6, P3, P5) once under Notes so they are not lost.

## Completion

✅ Done when docs match code, ownership slice is merged, full verify is green, and `_OVERVIEW` marks the package complete (or lists only explicitly deferred leftovers).

### Final steps

- Mark task **08** ✅; set **Overall** progress in **`_OVERVIEW.md`**; update **`docs/implementation/README.md`** status line.
