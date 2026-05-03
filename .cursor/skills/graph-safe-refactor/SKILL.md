---
name: graph-safe-refactor
description: Safely refactor the graph data-model when changing node/connection structure or fields. Use when modifying graph shape, adding/removing fields, or altering node/connection structure so updates stay immutable, undo-safe, and runtime-compatible.
---

# Graph-safe refactor

Mutate **`NodeGraph` shape** exclusively through sanctioned helpers while undo + compiler contracts hold.

**Context:** **`graph-updates.mdc`**, **`undo-history.mdc`**, **`compilation.mdc`**, **`project-conventions.mdc`**.

---

## Flow

1. Touch **`src/data-model`** types + **`immutableUpdates`** (no rogue field writes elsewhere).
2. Thread defaults across factories/validation so old graphs remap predictably (**`data-model-migration`** when disk shape shifts).
3. Confirm store listener still snapshots undo slices for every mutation path.
4. Runtime/compiler files stay read-only consumers—stash derived caches as pure computations or graph-owned mirrors updated via helpers.
5. Extend **`validation`** + **`*.test.ts`** (structural edits, undo replay).
6. **`npm run check`** (+ smoke load representative presets if seismic change).

## Invariants

Immutable writes • undo parity • compiler RO • validations/tests synced
