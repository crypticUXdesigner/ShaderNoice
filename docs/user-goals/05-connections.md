# Connections — User Goals

## 1. Purpose

Connections carry data (float, vec2, color, etc.) from **node output ports** to input or parameter ports. **Parameter drivers** (audio, animation, MIDI envelope) are attached separately via the driver panel; graph wires and drivers can stack on one parameter using **input modes**. UX must keep create, remove, and validation clear.

## 2. User & Context

- **Who:** User building or editing the graph.
- **When:** When linking nodes or wiring outputs to parameter inputs.

## 3. User Goals

- **Create a connection** — Drag from output port; wire follows pointer; release on valid input or parameter port; invalid targets rejected with clear feedback during drag where supported.
- **Remove a connection** — Select connection and Delete, or disconnect action; deleting a node removes its connections.
- **Rely on one connection per port** — Each input or parameter port has at most one incoming **graph** connection; a new wire replaces the previous one.
- **Combine wire with drivers via input mode** — On parameter ports, when a graph wire or **audio driver** is active, cycle **override (=)**, **add (+)**, **subtract (−)**, **multiply (×)**. **Animation** (when evaluable) typically supplies the **base**; the wire or audio input modifies it per mode. See [12-parameter-drivers.md](./12-parameter-drivers.md).
- **See connections and topology** — Wires drawn source→target; paths update when nodes move; topology preserved in serialization.

## 4. Key Flows

- **Create:** Drag output A → release on input/parameter B → connection created → set input mode if needed.
- **Remove:** Select connection → Delete.
- **Replace wire:** New connection to occupied port replaces previous wire.

## 5. Constraints

- Validation (types, multiplicity) from node system and compiler. Parameter ports: graph drag + driver panel ([04](./04-nodes-and-parameters.md), [12](./12-parameter-drivers.md), [06](./06-audio.md)).

### Two layers of validity

1. **Graph rules** — Port types, one wire per target, editor-enforced consistency.
2. **Session GPU** — WebGL2 vs WebGPU ([01-overview-and-app-shell.md](./01-overview-and-app-shell.md)); some wires valid in data model but not yet compilable on WebGPU—prefer wire-time explanation in WebGPU sessions.

**Behavior bar:** Previews need not match pixel-for-pixel across APIs; topology and drivers (audio, animation, chains) should match in spirit where both paths support them.

## 6. Related

- [02-node-graph-canvas.md](./02-node-graph-canvas.md) — Connection drag and hit-testing.
- [04-nodes-and-parameters.md](./04-nodes-and-parameters.md) — Parameter ports and effective values.
- [12-parameter-drivers.md](./12-parameter-drivers.md) — Drivers vs graph wires.
- [09-export.md](./09-export.md) — Export uses session GPU mode.
