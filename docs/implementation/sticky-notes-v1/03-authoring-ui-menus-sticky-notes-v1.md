# 03 — Authoring UI + menus — sticky-notes-v1

## Agent instructions (START HERE)

Follow sections in order. Depends on **01** (store) and **02** (card render).

Implement CRUD and menus only—no drag-to-move or drag-to-attach (**04**).

## Overview

Users can **add**, **edit** (text + color), and **delete** stickies via a small editor surface and context menus. Product strings use **Sticky** only.

## Scope

### In

- **`StickyEditor.svelte`** (popover or compact floating panel):
  - Text field (single-line or short textarea, max 200 chars with counter)
  - Color: fixed palette (~8 hex swatches, reuse row pattern from `ColorPickerRow` or simple buttons)
  - Actions: Save / Cancel, Delete sticky
  - Open from sticky click (when layer visible) or immediately after create
- **Canvas context menu** (empty canvas right-click):
  - New handler in `NodeEditorCanvas.ts` / wrapper when hit test finds no node: callback `onCanvasContextMenu(screenX, screenY)`
  - Item: **Add Sticky** → create free sticky at canvas coords under cursor (via `screenToCanvas`)
- **Node context menu** (`NodeRightClickMenu.svelte`):
  - **Add Sticky** → create sticky with `attachedNodeId` + default offset above node (use metrics height + margin)
- **Delete:** editor Delete button + optional menu item **Delete Sticky** when editor open for that id
- **`App.svelte` / `NodeEditorCanvasWrapper`:** wire callbacks → `graphStore` sticky actions; `notifyGraphChanged` / undo
- Empty text: disallow save or delete sticky on cancel—pick one behavior and test

### Out

- Drag to move (**04**).
- Attach/detach gestures (**04**).
- Copy/paste (**05**).

## Dependencies

### Prerequisites

- Tasks **01**, **02**.

### Provides

- Full CRUD entry points for **04–05**.

### Blocks

- **04** (interaction builds on editor + menus).

## Implementation tasks

1. Add `StickyEditor` + state in wrapper/App (`editingStickyId`, screen anchor).
2. Implement canvas context menu path for empty canvas → **Add Sticky**.
3. Extend node menu → **Add Sticky** (attached).
4. Click sticky card (layer visible) → open editor for that id.
5. Wire create/update/delete to `graphStore`; undo on save/delete.
6. Keyboard: shortcuts guarded when editor open (`isDialogVisible` or local open flag).
7. `npm run type-check && npm run build`; manual: add free + attached, edit color/text, delete.

## Technical notes

- Reuse `DropdownMenu` / `Popover` patterns from node menu and `ParameterDriverPanel` positioning (`floatingPanelPosition.ts` clamp).
- New stickies: `generateUUID()` for id; default color from palette[0].
- Creating attached sticky does not open node label edit.

## Completion

✅ Done when all three create paths work, editor saves text/color to graph, delete removes sticky, menus use **Sticky** labeling, and build passes.

### Final steps

- Mark task **03** ✅ in **`_OVERVIEW.md`**; unblock **04**.
