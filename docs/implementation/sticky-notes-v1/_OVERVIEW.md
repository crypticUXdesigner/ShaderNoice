# Sticky notes v1 — canvas annotations with optional node attachment

## Mission

Ship **Stickies**: short, colored text on the node editor canvas so users can document regions and node roles in complex graphs. Stickies are **first-class graph data** (not nested on `NodeInstance`), with optional **attachment** so they move when a node moves. A **show/hide** toggle reveals all stickies at once. Compiler and runtime are unchanged. Sets foundation for later **visual groups** (rect + member nodes — out of v1).

## Goals

- **Primary:** Add, edit (short text + color), and delete stickies on the canvas; persist in graph JSON / presets / local projects.
- **Attachment:** Optional `attachedNodeId` + offset; world position derived while attached; **delete node → delete** attached stickies.
- **Visibility:** Toggle (**Show Stickies**) shows or hides the sticky layer; when hidden, optional subtle **indicator** on nodes that still have attached stickies (discoverability).
- **Entry points (v1):** Canvas context menu (empty area), node context menu, and create-attached-from-node with default offset above the node box.
- **Secondary:** Copy / paste / duplicate selection includes stickies attached to copied nodes (remapped ids).

## Success & constraints

| Must-have | Detail |
| --- | --- |
| Data | `NodeGraph.stickyNotes?: StickyNote[]` serialized in `SerializedGraphFile.graph`; validated on load. |
| Immutability | All mutations via `immutableUpdates` + `graphStore`; undo records semantic edits. |
| No compile impact | `GraphChangeDetector` / `RuntimeManager` / `CompilationManager` unchanged for sticky-only edits (same class as `label`). |
| UX label | Product copy: **Sticky** / **Stickies** only (avoid “Notes” — MIDI collision). |
| Checks | `npm run type-check && npm test && npm run lint && npm run build` green per completed task. |
| User-goals | New `docs/user-goals/13-sticky-notes.md`; update `02-node-graph-canvas.md` when shipped. |

**Invariants:** Immutable graph; stickies never affect shader output or `node.parameters`.

**Out of scope (v1):** Visual group frames; sticky-to-group attachment; stickies in WebGL connection layer; export to image/video; audio-setup stickies; full marquee-select of stickies; free-form markdown.

**Allowable v1 simplifications:** Fixed color palette (no OKLCH popover); max text length (e.g. 200 chars); viewport-based sticky mount (same culling idea as nodes) when layer visible.

## Architecture & design

```
NodeGraph.stickyNotes[]          (document)
        │
        ├── position            (authoritative when unattached)
        └── attachedNodeId?     + offset? → render at node.position + offset
        │
        ▼
DomStickyLayer (Svelte, same pan/zoom as DomNodeLayer)
        │
        ▼
viewState.showStickies?         (persisted UI pref on graph, like selection)
```

**Anti-patterns:** Storing stickies on `NodeInstance`; dual absolute position while attached; leaving orphan `attachedNodeId` after node delete; putting stickies in `audioSetup`; using “Notes” in UI strings.

**High-touch areas:** `types.ts`, `immutableUpdates.ts` (+ dedicated sticky helpers), `validation.ts`, `serialization.ts`, `removeNode`, `graphStore.svelte.ts`, `DomNodeLayer` / new `DomStickyLayer`, `NodeEditorCanvasWrapper.svelte`, `NodeRightClickMenu.svelte`, `App.svelte`, `CopyPasteManager.ts`, `GraphViewState`, top-bar or bottom-bar toggle.

**Future (not v1):** `VisualGroup` entity; `attachedGroupId`; group move transforms all members + anchored stickies.

## Work items

| ID | Task | Status | Provides | Blocks |
| --- | --- | --- | --- | --- |
| 01 | [Data model + lifecycle](./01-data-model-sticky-notes-v1.md) | ⬜ | Types, CRUD helpers, serialize/validate, delete-node cascade | 02, 03, 04, 05 |
| 02 | [Canvas layer + visibility toggle](./02-canvas-layer-visibility-sticky-notes-v1.md) | ⬜ | Dom render, showStickies, indicators | 03, 04 |
| 03 | [Authoring UI + menus](./03-authoring-ui-menus-sticky-notes-v1.md) | ⬜ | Create/edit/delete, canvas + node menus | 04 |
| 04 | [Drag + attach interaction](./04-drag-attach-sticky-notes-v1.md) | ⬜ | Move free stickies, attach/detach UX | 05 |
| 05 | [Clipboard + closeout](./05-clipboard-docs-closeout-sticky-notes-v1.md) | ⬜ | Copy/paste/duplicate stickies; user-goals | — |

**Execution order:** `01` → `02` → `03` → `04` → `05` (03 and 04 may overlap files—land 03 before 04 if splitting PRs).

## Progress tracker

- **Overall:** 0% — package defined; implementation not started.
- **Milestone A (data + render):** tasks 01–02.
- **Milestone B (UX + clipboard):** tasks 03–05.

## Notes & risks

| Topic | Decision |
| --- | --- |
| Storage | `NodeGraph.stickyNotes[]`, not on `NodeInstance`. |
| Attachment | `attachedNodeId` + `offset`; while attached, **do not** treat `position` as authoritative (freeze into `position` on detach). |
| Node delete | **Delete** stickies with matching `attachedNodeId` (locked). |
| Toggle | `GraphViewState.showStickies` (default **true** when undefined); persisted with graph. |
| Pointer model | Sticky chrome uses minimal capture (e.g. drag handle / edit affordance) so ports and marquee stay usable when layer visible—task 04 owns detail. |
| Culling | Stickies use derived bbox + same viewport predicate as nodes when possible; always mount selected/editing sticky. |
| Naming | UI: **Sticky**; code: `StickyNote`, `stickyNotes`. |

**Risks:** Dense graphs — stacked stickies overlap neighbors (accept v1); canvas context menu may require new TS handler on empty canvas; copy/paste must remap sticky ids and `attachedNodeId`.
