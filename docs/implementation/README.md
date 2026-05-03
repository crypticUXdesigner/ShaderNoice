# Implementation specs

Focused engineering notes for behavior that is **partially implemented**, **not yet wired to UX**, or **easy to drift** across files. They complement **`docs/user-goals/`** (what users should get). Multi-step work lives here too: optional **`docs/implementation/<slug>/_OVERVIEW.md`** plus numbered task markdown files in the same folder (see **`workpkg-hygiene.mdc`**, **`define-project` / `define-tasks`** skills).

| Document | Topic |
|----------|--------|
| [graph-undo-redo.md](./graph-undo-redo.md) | Wire `UndoRedoManager` to keyboard/UI so undo/redo matches user goals |
| [node-panel-category-order.md](./node-panel-category-order.md) | Keep browse category order consistent between node panel and add picker |
| [`parameter-range-clamp/_OVERVIEW.md`](./parameter-range-clamp/_OVERVIEW.md) | Hard-enforce float parameter ranges so shader + live UI values stay in spec |
| [`preview-responsiveness/_OVERVIEW.md`](./preview-responsiveness/_OVERVIEW.md) | Keep editor responsive by skipping idle recompiles, coalescing, and caching programs |

When a spec is fully delivered, update or archive it and align **`docs/user-goals/`** if behavior changed.
