# Help & Discovery — User Goals

## 1. Purpose

Learn what a node does (contextual help) and perform quick actions (right-click menu). Reduces friction when exploring node types and operations.

## 2. User & Context

- **Who:** Any user; especially when learning or unsure about ports and parameters.
- **When:** When one node is selected (help) or when right-clicking a node (context menu).

## 3. User Goals

- **Read a guide for the selected node type** — When exactly one node is selected, “Help” control (e.g. top bar) available; click opens contextual help. Content in callout/popover: description, inputs, outputs, parameters, examples; user can close (button or click outside). Help content keyed by node type (e.g. `node:hexagonal-grid`); from static files (`node-documentation.json`, `contextual-help.json`) or node spec; missing content shows fallback or empty. Help enabled only when exactly one node selected; zero or multiple keeps Help disabled (or different message).
- **Use the node context menu** — Right-click node: “Read Guide,” “Copy node name,” “Remove”; menu at pointer or near node. “Read Guide” opens same help content as Help button. “Copy node name” copies node type id (e.g. `hexagonal-grid`) to clipboard. “Remove” removes node and all its connections; graph and runtime updated. Menu implemented as dropdown; does not block canvas after close.
- **Understand what can connect** — Port type pills or “compatible types” in help can guide connections; may link to signal picker where applicable.

## 4. Key Flows

- **Help from selection:** Select one node → Help in top bar → callout with node guide → close.
- **Help from menu:** Right-click node → “Read Guide” → same callout.
- **Remove:** Right-click node → “Remove” → node and connections removed.

## 5. Constraints

- Node documentation may be partial; degrade gracefully when content missing.

## 6. Related

- [01-overview-and-app-shell.md](./01-overview-and-app-shell.md) — Help button and layout.
- [02-node-graph-canvas.md](./02-node-graph-canvas.md) — Selection and right-click.
- [04-nodes-and-parameters.md](./04-nodes-and-parameters.md) — Port/parameter descriptions in help.
