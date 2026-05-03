# Connections — User Goals

## 1. Purpose

Connections carry data (float, vec2, color, etc.) from output ports to input or parameter ports. UX must make creating, removing, and validation clear and predictable.

## 2. User & Context

- **Who:** User building or editing the graph.
- **When:** When linking two nodes or an output to a parameter input.

## 3. User Goals

- **Create a connection** — Drag from output port; wire/preview follows pointer; release on valid input or parameter port to create; invalid targets do not accept (type/spec rules); preview may show invalid state during drag.
- **Remove a connection** — Select connection and Delete, or disconnect action; graph and shader updated. Deleting a node removes all its connections.
- **Rely on one connection per port** — Each input or parameter port has at most one incoming connection; new connection to same port replaces the previous one; behavior unambiguous.
- **See connections and topology** — Connections drawn between source and target; path (e.g. bezier) updates when nodes move; id and source/target (node id + port or parameter name) stored; serialization and reload preserve topology.

## 4. Key Flows

- **Create:** Drag from output A → release on input/parameter B → connection A→B created.
- **Remove:** Select connection (or node) → Delete → connection(s) removed.
- **Replace:** New connection to port that already has one → previous connection replaced; wiring updated.

## 5. Constraints

- Validation (types, multiplicity) defined by node system and compiler. Parameter ports may have special rules (e.g. signal picker); see [04](./04-nodes-and-parameters.md) and [06](./06-audio.md).

## 6. Related

- [02-node-graph-canvas.md](./02-node-graph-canvas.md) — Connection drag and hit-testing.
- [04-nodes-and-parameters.md](./04-nodes-and-parameters.md) — Parameter ports and effective values.
