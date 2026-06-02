# Nodes & Parameters — User Goals

## 1. Purpose

Nodes are graph building blocks; each exposes parameters the user can set, connect, or drive over time. UX must make static values, **parameter drivers**, graph connections, input modes, and live values clear and editable.

## 2. User & Context

- **Who:** User editing the shader graph.
- **When:** When selecting a node, editing a parameter, attaching a driver, or connecting to a parameter port.

## 3. User Goals

- **See and edit each parameter with the right control** — Type-appropriate controls per spec (slider, color, dropdown, text, bezier, grid, etc.); correct defaults; values in `node.parameters`. Preview updates in real time except when: parameter has no effect, overridden by a driver/connection, resource loading (e.g. audio), or preview paused.
- **Choose fixed value vs graph connection** — Connectable parameters have **input mode** when wired: override (=), add (+), subtract (−), multiply (×); effective value respects mode. Node outputs connect by dragging to the parameter port (not via the driver panel).
- **Attach and edit parameter drivers from the port** — Float parameters that support drivers use one flow for **audio**, **animation**, and (planned) **MIDI envelope** drivers: open the **parameter driver panel** from the port to add, edit, or remove the attached driver. See [12-parameter-drivers.md](./12-parameter-drivers.md). **Current:** double-click opens the **audio signal picker** only; animation is added via the timeline panel. **Target:** one panel for all driver kinds.
- **See live values when connected or driven** — Effective (live) value visible on the port or control when a graph wire, audio driver, or evaluable animation lane is active. When animation is evaluable, it follows transport for the **entire** timeline (lead-in, regions, gaps, tail—not only inside region rectangles) unless a connection applies on top per input mode; a timeline cue on the parameter row indicates animation is authoritative for the base value.
- **Edit color and enum on canvas** — Color: picker; on canvas, popover/overlay (e.g. LCH); apply on confirm or live. Enum: dropdown; on canvas, overlay dropdown. Overlays bridged to DOM so they render above canvas and receive focus.
- **Choose file for file parameters** — e.g. audio: “choose file” opens file picker; chosen file loads and parameter/audio setup updates; preview may pause during dialog.
- **Rely on clear effective-value rules** — Stored slider values in `node.parameters`; effective value = static/config + **animation base** (when lane evaluable) + **connection/audio** per input mode at runtime. Parameter UI from spec; custom layout elements for specific types (e.g. bezier row, color map preview). **Across GPU modes:** same graph and wiring drive parameters the same way **where both WebGL2 and WebGPU support that node chain**; wire-time feedback in WebGPU sessions (see [05-connections.md](./05-connections.md)).
- **Copy and paste parameter settings** — Right-click a node → **Copy parameter settings** copies stored parameter values and input modes to the in-app clipboard and system clipboard (JSON). **Paste parameter settings** applies only keys from that snapshot to other nodes of the **same type** (including all selected nodes of that type). Driven parameters copy the **stored slider values**, not live automation/audio/MIDI output.
- **Power off a node to A/B its effect** — Eligible nodes show a **Power** control in the header. When “off,” the node is skipped in compilation: pass-through where possible, else downstream defaults. Math, utility, masking-control, and output nodes do not offer Power. Saved with the graph.
- **Use arrangement pattern nodes for MIDI-driven abstract visuals** — Nine **MIDI** nodes (**Note Ripple Field**, **Pitch Wheel**, **Rhythm Wavefield**, **Flashgrid**, **Track Halo Lattice**, **Boundary Shutter Rays**, **Duration Comet Trails**, **Chord Voronoi Bloom**, **Note Gravity Warp**) consume the imported arrangement snapshot at compile time and follow transport via the **Time** port. They complement **Notes** / **Regions** (literal DAW layout) with fullscreen ripples, sectors, stripes, Voronoi, and warps. See [06-audio.md](./06-audio.md) for snapshot import; demo presets: `note-ripple-field-demo`, `arrangement-patterns-showcase`.

## 4. Key Flows

- **Edit:** Select node → change slider/color/enum → value and preview update.
- **Connect graph to parameter:** Drag output to parameter port → connection created → cycle input mode if needed.
- **Driver (target):** Port → parameter driver panel → add/edit/remove audio, animation, or MIDI envelope driver.
- **Driver (current, audio):** Double-click port → audio signal picker → connect remapper or disconnect.
- **Driver (current, animation):** Timeline panel → lane/region/curve editor (see [07-timeline-and-automation.md](./07-timeline-and-automation.md)).

## 5. Constraints

- Canvas overlays (color, enum) bridged to DOM for focus and layering.
- Driver attach/edit UX is converging on [12-parameter-drivers.md](./12-parameter-drivers.md); until shipped, behavior follows current audio picker + timeline panel paths.

## 6. Related

- [02-node-graph-canvas.md](./02-node-graph-canvas.md) — Node rendering and selection.
- [05-connections.md](./05-connections.md) — Connections to parameter ports.
- [06-audio.md](./06-audio.md) — Audio bands, remappers, playback.
- [07-timeline-and-automation.md](./07-timeline-and-automation.md) — Transport and animation evaluation.
- [12-parameter-drivers.md](./12-parameter-drivers.md) — Unified driver model (product intent).
