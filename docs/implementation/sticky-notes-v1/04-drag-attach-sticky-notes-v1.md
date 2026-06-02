# 04 — Drag + attach interaction — sticky-notes-v1

## Agent instructions (START HERE)

Follow sections in order. Depends on **01–03**.

Focus on pointer model and motion—not new menus unless needed for **Detach**.

## Overview

Free stickies can be **dragged** on the canvas. Users can **attach** a sticky to a node (from editor or gesture) and **detach** (freezes world position). Attached stickies **follow node drag** without extra store writes. Pointer handling must not break port wiring, node drag, or marquee select.

## Scope

### In

- **Drag free sticky:** pointerdown on sticky drag handle → update `position` with `recordUndo: false` during move, `recordUndoSnapshot` on pointerup (same gesture pattern as parameters per `undo-history-gestures`).
- **Attach:**
  - Editor/menu action: **Attach to node** when exactly one node selected → set `attachedNodeId` + compute `offset` from current world position minus node.position
  - Optional v1: drop sticky onto node body (hit test node id under cursor on pointerup)—if too heavy, menu-only attach is enough if documented in Completion
- **Detach:** editor/menu **Detach** → `detachStickyNote` helper (world `position` frozen)
- **Attached follow:** no per-frame graph mutation; `DomStickyLayer` uses derived position from live `node.position` during node drag in `DomNodeLayer`
- **Pointer-events:** sticky layer `none` by default; `auto` on drag handle + edit button; clicks on sticky body do not start connection drag
- **Selection:** clicking sticky selects sticky (store selected sticky id in wrapper state); does not clear node selection policy—define: sticky click does not change `selectedNodeIds` unless shift policy added (default: independent sticky selection for edit only)

### Out

- Copy/paste (**05**).
- Visual groups.

## Dependencies

### Prerequisites

- Tasks **01**, **02**, **03**.

### Provides

- Complete motion/attachment UX for **05**.

### Blocks

- **05** recommended after attach/detach stable.

## Implementation tasks

1. Implement sticky drag with undo gesture policy.
2. Implement attach (menu and/or drop-on-node) + detach.
3. Verify attached stickies track node multi-drag without graph updates.
4. Audit pointer capture vs `Node.svelte` / port handlers; fix regressions on port click and node header drag.
5. Manual test matrix: drag node with attached sticky; drag free sticky; attach/detach; toggle hidden layer disables drag.

## Technical notes

- Register `isNodeInteractiveTarget` equivalents for sticky controls if double-click patch tool must ignore stickies.
- `nodeInteractiveTarget.ts` may need sticky class selectors.

## Completion

✅ Done when free stickies drag with one undo step per gesture, attach/detach preserve visual position, attached stickies move with node drag, and port/connect/marquee behaviors remain acceptable (no stuck captures).

### Final steps

- Mark task **04** ✅ in **`_OVERVIEW.md`**; unblock **05**.
