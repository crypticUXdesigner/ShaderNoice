# 01 — Data model + lifecycle — sticky-notes-v1

## Agent instructions (START HERE)

Follow sections in order. Use **immutable** graph updates only. Do **not** add UI in this task.

Respect locked decisions in **`_OVERVIEW.md`**: graph-level `stickyNotes`, delete attached stickies when node is removed.

## Overview

Introduce `StickyNote` on `NodeGraph`, pure update helpers, validation, serialization sanitization, `deepCopyGraph` / `copyNode` parity, `graphStore` actions, and tests. Wire **`removeNode`** to delete stickies whose `attachedNodeId` matches the removed node.

## Scope

### In

- **`src/data-model/types.ts`**
  - `StickyNote`: `id`, `text`, `color` (hex `#RRGGBB`), `position: NodePosition`
  - Optional `attachedNodeId?: string`, `offset?: NodePosition` (integer pixels relative to node top-left)
  - `NodeGraph.stickyNotes?: StickyNote[]`
  - `GraphViewState.showStickies?: boolean` (default true when undefined in consumers)
- **`src/data-model/immutableUpdatesSticky.ts`** (or colocated in `immutableUpdates.ts` if small):
  - `addStickyNote`, `updateStickyNote`, `removeStickyNote`, `updateStickyPosition`, `attachStickyToNode`, `detachStickyNote` (detach copies derived world position into `position`, clears attachment)
  - Helper: `resolveStickyWorldPosition(sticky, graph, nodeMetrics?)` for tests/render contract
- **`removeNode`** (`immutableUpdates.ts`): after strip, filter `stickyNotes` where `attachedNodeId === nodeId`
- **`deepCopyGraph`**: copy `stickyNotes` array (shallow per entry + position/offset objects)
- **`validation.ts` / `validationNode.ts` or new `validationSticky.ts`**
  - Valid hex color; text length ≤ 200 (trimmed); `attachedNodeId` references existing node when set
  - Warn or error on orphan `attachedNodeId` at validate time (deserialize path)
- **`serialization.ts`**: sanitize unknown fields; omit empty `stickyNotes` array
- **`graphStore.svelte.ts`**: actions wrapping helpers; `graphChangedListener` with default `recordUndo: true`
- **`src/data-model/index.ts`**: exports
- Tests: round-trip serialize, validate failures, `removeNode` deletes attached stickies, attach/detach position freeze

### Out

- Svelte components, canvas handlers, clipboard (**05**).
- Visual groups.

## Dependencies

### Prerequisites

- **`sticky-notes-v1/_OVERVIEW.md`** (locked decisions).

### Provides

- Stable types and store API for **02–05**.

### Blocks

- **02**, **03**, **04**, **05** until merged.

## Implementation tasks

1. Add `StickyNote` + `NodeGraph.stickyNotes` + `GraphViewState.showStickies` types.
2. Implement immutable CRUD + attach/detach + `resolveStickyWorldPosition`.
3. Extend `removeNode` to remove stickies attached to deleted node.
4. Validation + serialization sanitize; export from data-model index.
5. `graphStore` actions: add/update/remove/attach/detach/move sticky; `updateViewState` for `showStickies`.
6. Colocated tests (`stickyNotes.test.ts` or extend `data-model.test.ts`).

## Technical notes

- Reuse hex regex from `validationNode.ts` for `node.color`.
- While **attached**, treat world position as `node.position + offset` only; `position` field may be stale until detach—document in helper JSDoc.
- Sticky-only graph edits must **not** require `CompilationManager` changes; no new fields on `NodeInstance`.

## Completion

✅ Done when types and helpers are exported, `removeNode` cascades sticky deletion, serialize/load round-trips, validation covers orphans and text/color limits, store actions mutate graph immutably, and `npm run type-check && npm test` pass for new tests.

### Final steps

- Mark task **01** ✅ in **`_OVERVIEW.md`**; unblock **02**.
