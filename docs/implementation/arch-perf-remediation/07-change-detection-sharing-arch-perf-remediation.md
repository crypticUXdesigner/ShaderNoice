# 07 — Change-detection sharing — arch-perf-remediation

## Agent instructions (START HERE)

Follow sections in order. Preserve layout-only skip and incremental thresholds. Do not mutate the graph.

## Overview

Cut redundant `GraphChangeDetector` work on structure edits (**P10**) and stop marking **all** nodes affected on connection-only changes (**P11**), which forces full compiles more often than necessary.

## Scope

### In

- **`RuntimeManager.setGraph` / `CompilationManager.recompile`:** pass or cache a single `detectChanges` result where both layers currently re-walk the same pair.
- **`GraphChangeDetector.compareGraphs`:** on connection-only deltas, compute affected set from connection endpoints + dependents (BFS), **not** `nodes.forEach` add-all.
- Remove duplicate `findAffectedNodes` call inside one compare if still present.
- Tests: connection add/remove affected set size; position-only still short-circuits; automation-only flags unchanged.

### Out

- True incremental codegen (**deferred P3**).
- Canvas `graphUpdate` UI invalidation redesign (may keep its own detectChanges call).

## Dependencies

### Prerequisites

- **`_OVERVIEW.md`**; **01** already removed `graphComparison`.

### Provides

- Fewer CPU walks on edit; better incremental eligibility on wire edits.

### Blocks

- Nothing.

## Implementation tasks

1. Trace current call sites (`setGraph`, `detectGraphChanges`, `graphUpdate`).
2. Introduce a shared result type or `CompilationManager` consuming runtime-provided diff when present.
3. Fix connection-only affected-node computation + tests.
4. Ensure idle-skip / compile-identity revision pairing still correct.

## Technical notes

- Connection changes may still force **full** compile in CompilationManager policy — even then, avoid O(all nodes) affected marking if it only exists to trip the 50% threshold.
- Keep `oldGraph === newGraph` fast path.

## Completion

✅ Done when structure edits do not double-walk without need, connection-only affected sets are endpoint-based, tests cover both, and compile scheduling behavior remains correct.

### Final steps

- Mark task **07** ✅ in **`_OVERVIEW.md`**.
