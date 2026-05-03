## Agent instructions (START HERE)

- Implement minimal scheduling logic; avoid UI work unless required for correctness.
- Preserve current correctness semantics: latest graph state wins; stale worker replies are ignored.

## Overview

Coalesce bursts of structural graph edits into a **single** preview compile/apply (instead of compiling intermediate transient states).

## Scope

### In
- A single coalescing strategy for compile scheduling (worker and non-worker paths).
- Ensure only the latest compile result applies (already partially true via ids; make it systematic).
- Dev-only measures: compile requested → apply start → apply end.

### Out
- Major architecture changes (OffscreenCanvas, renderer rewrite)

## Dependencies

### Depends on
- `preview-responsiveness-01-preview-slice-invalidation.md`

### Provides
- Fewer compiles per user action burst (add+connect, multi-select connect, paste graphs).

## Implementation tasks

1. **Define a compile “epoch”**
   - Each scheduled compile increments an epoch.
   - Worker results apply only if epoch matches the latest scheduled epoch.

2. **Coalesce strategy**
   - Replace fixed debounce with a “compile on next frame unless superseded” approach.
   - Keep the existing two-rAF “toast paint” behavior when needed.

3. **Tests**
   - Simulate multiple rapid `onGraphStructureChange()` calls and verify only one compile is executed/applied.

## Completion

✅ Done when:
- Rapid structural updates trigger at most one compile/apply for the final graph state.
- Tests pass.

### Final steps
- Run runtime compilation manager tests.

