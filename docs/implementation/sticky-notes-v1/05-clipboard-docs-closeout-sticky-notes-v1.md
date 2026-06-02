# 05 — Clipboard + docs closeout — sticky-notes-v1

## Agent instructions (START HERE)

Follow sections in order. Depends on **01–04**.

Finish clipboard integration and align user-goals / implementation index.

## Overview

When users copy, paste, or duplicate nodes, **attached stickies** copy with remapped node ids. Add user-facing goals doc and mark package ready for review.

## Scope

### In

- **`CopyPasteManager.ts`** (or wrapper-only extension):
  - Extend `ClipboardData` with `stickyNotes?: StickyNote[]`
  - On `copy(nodes, connections, graph?)`: include stickies where `attachedNodeId` is in copied node id set; copy with new sticky ids but preserve offset; for paste positioning, re-attach to remapped node ids
  - `paste`: return stickies alongside nodes/connections
- **`NodeEditorCanvasWrapper.svelte`:** `onCopySelected`, `onPaste`, `duplicateNodesByIds` → merge stickies into graph via `addStickyNote` helpers after id remap
- **Duplicate (Ctrl+D):** same as copy+paste offset path includes stickies
- **Preset / download JSON:** spot-check one preset with stickies in `src/presets/` optional demo `sticky-notes-demo.json` (minimal graph + 2 stickies)—only if maintainers want demo; otherwise skip preset
- **`docs/user-goals/13-sticky-notes.md`:** purpose, goals, flows, constraints per other user-goal files
- Update **`docs/user-goals/02-node-graph-canvas.md`** (context menu + toggle mention)
- Update **`docs/user-goals/README.md`** index row
- Update **`docs/implementation/README.md`** table row for `sticky-notes-v1`
- **`_OVERVIEW.md`:** progress 100%, tasks ✅, short shipped note

### Out

- Visual groups implementation.
- Sticky marquee selection.

## Dependencies

### Prerequisites

- Tasks **01–04**.

### Provides

- Shipped package documentation.

### Blocks

- None (package complete).

## Implementation tasks

1. Extend clipboard structure + copy filter for attached stickies.
2. Paste/duplicate: remap `attachedNodeId` and sticky `id`; append to `graph.stickyNotes`.
3. Tests: copy one node with attached sticky → paste → sticky points at new node id.
4. Author `13-sticky-notes.md` and cross-links.
5. Run full check suite: `npm run type-check && npm test && npm run lint && npm run build`.

## Technical notes

- Free stickies not attached to copied nodes are **not** copied on node-only clipboard (document in user-goals).
- Pasting nodes without stickies in clipboard unchanged.

## Completion

✅ Done when copy/paste/duplicate preserves attached stickies with correct ids, user-goals doc exists and matches behavior, implementation README lists package, and full npm checks pass.

### Final steps

- Mark task **05** ✅ and **Overall 100%** in **`_OVERVIEW.md`**.
