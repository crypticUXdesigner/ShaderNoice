# Parameter Drivers — User Goals

## 1. Purpose

**Parameter drivers** are the ways a float parameter moves over time without hand-keying every frame: audio-reactive signals, transport curves (animation), and arrangement note hits (MIDI). They share one **port-centric** interaction model—add, edit, and remove from the parameter port—distinct from dragging a **graph wire** onto that port.

## 2. User & Context

- **Who:** User animating or reacting parameters (audio-reactive visuals, timed sweeps, arrangement-synced hits).
- **When:** While editing a node on the canvas, during playback/scrub, and when tuning driver settings.

## 3. User Goals

- **Use one interaction model for all drivers** — From a connectable float parameter port: **add** a driver, **edit** the attached driver, or **remove** it entirely. The same panel shell applies to every driver kind; no separate “go to timeline” vs “go to audio panel” path required to attach a driver to a parameter.
- **Pick a driver type when adding** — Supported kinds:
  - **Audio** — FFT band → remap → parameter (continuous, real-time).
  - **Animation** — Keyframe curve vs transport time (song-shaped motion).
  - **MIDI** — Arrangement note hits on selected **tracks** → response shape (ADSR) → **remap** → parameter; requires an imported arrangement snapshot on the playlist primary.
  - **Graph signal** — Not a driver panel kind: wire a node output to the port by dragging (e.g. procedural motion nodes). Stays on the graph.
- **Combine drivers and wires with input modes** — **Input modes** (**override (=)**, **add (+)**, **subtract (−)**, **multiply (×)**) are primarily for **graph wires** on a parameter port (see [05-connections.md](./05-connections.md)). **Animation** (when active) supplies the **base** value along transport; a graph wire or audio driver input applies on top per mode. When only an **audio driver** virtual wire is attached (no graph wire), the port defaults to **override (=)** on connect; the mode cycle is de-emphasized in the port UI so remapped audio replaces the slider rather than multiplying it. Existing graphs keep their stored mode until reconnect or an explicit change.
- **Edit the attached driver in one panel** — **Overview** mode (`Browse` from the focused footer): left column **filters/selects** one **audio band** or **MIDI track set**; the main column edits **only that selection** (one band section with remap cards, or one track set with **tracks** first, **response** (ADSR), then **remap** cards)—not a scroll of duplicate full editors. Overview toolbar: **New band** / **New track set** only (no overview **Connect**). **Focused** mode tunes the driver attached to this port (compact curve editor for animation). **Animation** has no shared preset library — overview explains that honestly; curves are 1:1 with the parameter. Changing driver **type** uses the type tabs in overview, not a separate wizard.
- **Connect from the remap card** — **Audio:** primary **Connect** on each **remap** card header (with **Disconnect**, **Duplicate** when applicable, **Delete**). **MIDI:** **Connect** only on **remap** cards (not on the track-set section). **Animation:** no library—use **Add animation driver** / **Edit curve** on the empty state or focused editor instead of card Connect.
- **Configure audio drivers** — Bands define analysis; **remaps** gate band level then map to each target’s range: **In** (**inMin** / **inMax**, ~0–1 gate on band level) lives on the **remapper**; **Out** (**outMin** / **outMax** in **parameter units**, including negative and asymmetric spans, not capped to 0–1) lives on each **virtual wire** to a parameter. Eval order: band level → **In** gate → **Out** map. On connect from a parameter port, **Out** defaults from that parameter’s spec min/max on the connection and **In** defaults to 0–1 on the remapper; later connects to the same remapper preserve existing gate and peer Out ranges. In the focused driver panel, **Match parameter** applies to the **focused port** only when several targets share one remapper. **Target range** Out min/max edits are clamped to the focused parameter’s spec min/max when finite (step/decimals follow the parameter spec); **Match parameter** sets the full spec range. **Out min/max** are also editable **inline on the node body**: **knob** parameters show an **outer arc** around the knob with draggable endpoints; other float controls use a compact **Target range** row. Node edits use the same bounds, step, and decimals as the panel **Target range**; the panel remains available and unchanged. Gate and **Target range** live on the same remapper card when that card is connected to the focused port. Only remaps attach to ports (not raw band output). Remaps can be created/edited in the driver panel or in the audio panel browse view. Overview defaults to **one band** at a time (optional **All bands** in the nav footer). **Band analysis** (spectrum / FFT / attack–release tuning) lives in a collapsible section so remaps stay primary; smoothing is not duplicated above the spectrum.
- **See where presets are used** — The focused parameter header names the port under edit; open another driven parameter from the canvas to tune its **Target range** on that port’s remapper card.
- **Configure animation drivers** — Adding an animation driver from the parameter port creates a lane for that parameter with a **default full-length curve** over the transport duration; curve editor lives in the driver panel (zoom/pan in editor as needed). **Advanced (optional):** multiple regions, loop segments, split at playhead—same evaluation rules as today (lane owns the parameter for the whole transport once evaluable). Lanes/regions remain editable from the timeline panel as an optional overview (see [07-timeline-and-automation.md](./07-timeline-and-automation.md)).
- **Configure MIDI drivers** — Same two-layer model as audio bands/remaps. **Track sets** select one or more **arrangement tracks** (note hits) and define **response** (ADSR + optional velocity-to-peak); they do **not** store remap ranges. **Remaps** on that track set use the same gate / per-target **Out** model as audio: **In** on the remapper gates the ADSR-shaped level (~0–1); **Out** on each **binding** maps to **outMin** / **outMax** in parameter units. **Target range** Out edits use the same parameter-spec bounds and step/decimals as audio when the focused parameter has a finite min/max. **Out min/max** are also editable **inline on the node body** (knob outer arc or compact row for other float controls), with the same bounds as the panel **Target range**. Eval order: envelope shape → **In** gate → **Out** map (preview and export share this path). On connect from a parameter port, **Out** defaults from the parameter spec on the binding and **In** defaults to 0–1 on the remapper; later binds to the same remapper preserve existing gate and peer Out ranges. Parameters attach to a remap, not directly to the track set. One track set can host several remaps; one remap can drive several parameters, each with its own **Out** range. Optional **per-phase curve presets** (linear, exponential, logarithmic, smooth) shape attack, decay, and release without changing stored times. **Sustain hold** may follow note length in the arrangement (default) or release may start right after decay (ignore remaining note length). Velocity may scale response depth. **Note overlap (retrigger policy)** on each track set (default **Last note** — new note-ons restart the envelope): optional **Hold if higher** (overlapping notes won’t dip below the current level) or **Legato** (skip attack when the previous note is already past attack). All policies remain **monophonic** — one shared contour per track set; dense arpeggios still retrigger that single envelope.
- **See driver state on the parameter** — Port and parameter row show which driver type is active (icons/cues for audio, animation, MIDI). For **audio** and **MIDI** drivers, **Out min/max** appear on the node body (knob **outer arc** or compact target-range row on other float controls); see [04-nodes-and-parameters.md](./04-nodes-and-parameters.md). Live/effective value visible during playback; animation cue explains full-timeline ownership when a lane is evaluable.
- **Respect availability gates** — The **MIDI tab stays selectable** without project data; **Fetch project** is the first action when no arrangement snapshot is loaded. Track-set creation needs imported note tracks. Audio drivers need analysis setup; animation and MIDI apply to float parameters only.
- **Persist drivers with the composition** — Audio remaps and session media persist with presets/clipboard; animation lanes/regions/curves persist on the graph; MIDI track sets, remaps, and bindings persist on the graph (see [08-presets-and-data.md](./08-presets-and-data.md)).

## 4. Key Flows

- **Add driver:** Double-click (or equivalent) parameter port → choose type in driver panel → configure → attach → preview updates.
- **Edit driver:** Same port action opens panel on the attached driver; tune remap or curve; remove or disconnect using the actions below.

### Disconnect vs delete (driver panel)

| Action | Meaning |
| --- | --- |
| **Disconnect** | Remove the driver from **this parameter port** only. Preset library data may remain (audio remap, MIDI track set, remaps). |
| **Delete** | Remove the **preset asset** from the project (audio remap, MIDI track set, or MIDI remap). Confirm when other parameters still use it. |

**Animation exception:** Curves have no shared preset library — removing the driver **is** deleting the curve. The panel uses **Remove curve** (not “Disconnect”).

| Kind | Disconnect | Delete preset |
| --- | --- | --- |
| Audio | Card or footer **Disconnect** — removes virtual wire and its per-target **Out**; remap gate stays in audio setup | Card **Delete** — removes remap from audio setup (confirm if other targets use it) |
| MIDI remap | Card or footer **Disconnect** — unbinds this parameter and its binding **Out**; track set, remapper gate, and other bindings stay | Card **Delete** — removes remap (confirm if other parameters use it) |
| MIDI track set | — (no Connect on track-set section) | Section **Delete** — removes track set and its remaps (confirm if any remap still has targets) |
| Animation | — | Footer **Remove curve** — deletes lane and curve data |
- **Audio setup (unchanged entry):** Audio toggle in bottom bar → manage files, bands, remaps in browse mode (no target parameter required).
- **Graph wire:** Drag output → parameter port → set input mode if needed; independent of driver panel except base+mode stacking with animation.
- **Timeline overview (optional):** Timeline panel → add lane → add region → curve editor for multi-lane editing (see [07](./07-timeline-and-automation.md)).

## 5. Constraints

- **One graph connection per parameter port** — New wire replaces the previous one ([05-connections.md](./05-connections.md)).
- **One primary driver type per port (product intent)** — Audio, animation, and MIDI are mutually exclusive on a port; attaching one type replaces the other automatically. Graph wiring uses input modes alongside animation base and/or audio input as today.
- **Shipped UX** — Unified **parameter driver panel** for attach/edit/remove of **audio**, **animation**, and **MIDI** drivers from the parameter port; **Browse** opens overview (preset library for audio/MIDI, connect-on-card); shared empty states with primary CTAs; timeline panel remains optional multi-lane overview.
- **MIDI vs arrangement visuals** — Arrangement **visualization** nodes (notes/lanes) are separate from MIDI **control** drivers.
- **MIDI drivers in export** — Video and image export push MIDI envelope driver uniforms at transport time (JS-side, same evaluator as preview) when an arrangement snapshot is present. **Arrangement visualization** nodes use compile-time bakes plus per-frame loop-index uniforms (`onsetLoop*` / `noteLoop*`) at transport time via `buildExportFrameState` (same math as preview). Without a snapshot, MIDI driver uniforms are not applied and arrangement loop indices are zeroed (silent skip, same as preview).
- **DAW automation curves** — **Out of scope:** mapping Audiotool published-project **automation** lanes to shader parameters is not a product goal (distinct from **MIDI note-envelope** drivers above).

## 6. Related

- [04-nodes-and-parameters.md](./04-nodes-and-parameters.md) — Parameter controls, effective values, port UI.
- [05-connections.md](./05-connections.md) — Graph wires and input modes.
- [06-audio.md](./06-audio.md) — Files, bands, remaps, playback.
- [07-timeline-and-automation.md](./07-timeline-and-automation.md) — Transport, automation evaluation, timeline panel.
- [08-presets-and-data.md](./08-presets-and-data.md) — Serialization and presets.
- [09-export.md](./09-export.md) — Video/image export uses the same MIDI driver evaluation at transport time.
