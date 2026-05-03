# Node Panel — User Goals

## 1. Purpose

Discover and add node types to the graph: search, filter by category or port type, add at a canvas position.

## 2. User & Context

- **Who:** Anyone building a shader graph.
- **When:** When adding a node; panel toggled from app shell (e.g. top bar).

## 3. User Goals

- **Find node types by name or category** — Search by text; match on display name, description, or category; list updates as user types.
- **Filter by port type** — Filter by one or more port types (inputs/outputs); only nodes with matching type(s) shown.
- **Browse by category** — Types grouped by category; order: Distort, Patterns, Shapes, SDF, Blend, Mask, Effects, Audio, Inputs, Output, Math, Utilities (unknowns last); expand/collapse sections. Same order is used in the compact add picker; keep lists in sync (see [`../implementation/node-panel-category-order.md`](../implementation/node-panel-category-order.md)).
- **Switch list vs grid** — Both list and grid display supported.
- **Add a node at a chosen position** — Drag node type from panel, drop at canvas position; new node at drop; screen-to-canvas mapping from app; each type shows label (and optionally icon); same spec as canvas.

## 4. Key Flows

- **Search and add:** Open panel → search → drag result onto canvas → node at drop position.
- **Filter by type:** Select port-type filter(s) → list narrows → drag node onto canvas.
- **Category browse:** Expand category → drag type onto canvas.

## 5. Constraints

- Node types from node spec; panel does not modify specs. Panel visibility/toggle owned by app shell.

## 6. Related

- [01-overview-and-app-shell.md](./01-overview-and-app-shell.md) — Panel toggle and layout.
- [02-node-graph-canvas.md](./02-node-graph-canvas.md) — Add node at position.
