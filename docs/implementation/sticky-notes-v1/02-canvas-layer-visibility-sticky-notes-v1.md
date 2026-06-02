# 02 — Canvas layer + visibility toggle — sticky-notes-v1

## Agent instructions (START HERE)

Follow sections in order. Depends on **01** (types + `resolveStickyWorldPosition` + store).

Do **not** implement full edit popover (**03**) or drag/attach gestures (**04**)—read-only render + toggle + placeholder click targets OK.

## Overview

Render stickies in canvas space (same pan/zoom transform as nodes). Add **Show Stickies** toggle that drives `viewState.showStickies`. When hidden, show a small **attached-sticky indicator** on nodes that still have stickies (header dot or corner mark).

## Scope

### In

- **`src/lib/components/editor/StickyNoteCard.svelte`** (name flexible): compact card—background from `color`, truncated `text`, minimal chrome for v1 read-only.
- **`DomStickyLayer.svelte`** (or extend `DomNodeLayer.svelte` with sibling layer):
  - Iterate `graph.stickyNotes ?? []`
  - World position via `resolveStickyWorldPosition` + node metrics from `canvasApi.getNodeMetrics`
  - Same `transform: translate(pan) scale(zoom)` as nodes
  - Viewport culling: skip off-screen stickies unless editing/selected (flag from parent; selection model can be sticky `id` in wrapper state)
  - Layer hidden when `viewState.showStickies === false`
- Wire layer in **`NodeEditorCanvasWrapper.svelte`** above/beside node layer; pass `graph`, `viewState`, `canvasApi`
- **Toggle UI:** top-bar control (e.g. near view mode) or bottom-bar—**Show Stickies** with `aria-pressed`; calls `graphStore.updateViewState({ showStickies })` with `recordUndo: false`
- **Indicator when hidden:** in `Node.svelte` or `NodeHeader`—if any sticky has `attachedNodeId === nodeId`, render subtle marker (no sticky text)

### Out

- Create/edit/delete flows (**03**).
- Drag reposition and attach drop (**04**).
- Canvas WebGL drawing.

## Dependencies

### Prerequisites

- Task **01** merged.

### Provides

- Visible stickies + toggle for **03–04**.

### Blocks

- **03**, **04** (authoring needs surface).

## Implementation tasks

1. Implement `StickyNoteCard` with design tokens (sticky-specific CSS vars or reuse ghost/tag surfaces).
2. Add `DomStickyLayer` with pan/zoom parity and culling hook via `canvasApi.isNodeVisible` adapted for sticky bbox (width/height constants ~160×72 until edit UI sizes).
3. Mount layer in canvas wrapper; re-render on graph/viewState changes.
4. Add top-bar (or bottom-bar) toggle bound to `showStickies`; default visible when field undefined.
5. Node indicator when `showStickies === false` and node has attached stickies.
6. Storybook story optional: 2–3 stickies at mock positions; manual: toggle hides/shows layer.

## Technical notes

- Parent `.layer` uses `pointer-events: none`; sticky cards need explicit `pointer-events: auto` only on interactive subregions in **04**—v1 cards can be `none` until task 04.
- Use `prefers-reduced-motion` for any entrance opacity transition.
- Do not block `DomNodeLayer` mount predicate for nodes.

## Completion

✅ Done when stickies render at correct canvas coordinates (free + attached), toggle persists via `viewState` and survives preset round-trip, hidden mode shows node indicators, and `npm run type-check && npm run build` pass.

### Final steps

- Mark task **02** ✅ in **`_OVERVIEW.md`**; unblock **03**.
