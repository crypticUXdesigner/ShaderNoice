# Implementation specs

Focused engineering notes for behavior that is **partially implemented**, **not yet wired to UX**, or **easy to drift** across files. They complement **`docs/user-goals/`** (what users should get). Multi-step work lives here too: optional **`docs/implementation/<slug>/_OVERVIEW.md`** plus numbered task markdown files in the same folder (see **`workpkg-hygiene.mdc`**, **`define-project` / `define-tasks`** skills).

| Document | Topic |
|----------|--------|
| [node-panel-category-order.md](./node-panel-category-order.md) | Keep browse category order consistent between node panel and add picker |
| [a11y-baseline.md](./a11y-baseline.md) | Accessibility baseline / scripted checks |
| [node-port-labels-in-out-analysis.md](./node-port-labels-in-out-analysis.md) | Port labels: extended reference + audit tables (**canonical rules:** `shaders/node-standards.mdc` § port labels) |
| [`expression-node/_OVERVIEW.md`](./expression-node/_OVERVIEW.md) | **Active:** **Expression** node — sandboxed math DSL (`a`–`d`), dual GLSL/WGSL emit, CodeMirror UI, demo preset |
| [`sticky-notes-v1/_OVERVIEW.md`](./sticky-notes-v1/_OVERVIEW.md) | **Active:** Canvas **Stickies** — graph-level annotations, optional node attachment, show/hide toggle |

**Shipped (not indexed here):** Node category contrast — `npm run contrast:node-categories` / `scripts/node-category-contrast.ts`. Audiotool **arrangement snapshot** (import, notes/regions/pattern nodes, MIDI drivers) — `src/audiotool/arrangement/`, **`docs/user-goals/06-audio.md`**. **Driver remap In/Out unify (2026-06-04)** — shared `DriverRemapSection`, `src/utils/driverRemap.ts`, export/preview parity — **`docs/user-goals/12-parameter-drivers.md`**, **`docs/user-goals/06-audio.md`**, **`docs/user-goals/09-export.md`**. **Per-target Out (2026-06-07)** — gate on remapper, Out min/max per connection/binding; panel + node-body knob arc — **`docs/user-goals/12-parameter-drivers.md`**, `src/utils/driverRemap.ts`. **Pixelize** Distort node — `src/shaders/nodes/pixelize.ts`, preset `src/presets/pixelize.json`. **Node guides quality** — `npm run audit:node-docs:strict`, rubric in **`docs/node-documentation-content-guide.md`**. **Connection drag UX** — larger port hit targets, screen-space snap, magnetic drop, drag-time validation — **`docs/user-goals/02-node-graph-canvas.md`**, **`docs/user-goals/05-connections.md`**, `src/ui/interactions/`. DAW **automation → shader parameters** is **not** planned.

New multi-step packages: add `docs/implementation/<slug>/_OVERVIEW.md` first, then link it here (see **`workpkg-hygiene.mdc`**).

When a spec is fully delivered, update **`docs/user-goals/`** if behavior changed, then delete the package when inbound links are clear (see **`docs-implementation-done-cleanup.mdc`**).
