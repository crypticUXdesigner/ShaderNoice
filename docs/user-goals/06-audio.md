# Audio — User Goals

## 1. Purpose

Audio drives the shader in real time (frequency bands, remapped values) and anchors transport for preview and export. Users manage **session audio** (files, bands, remappers) in the audio panel and attach **audio drivers** to parameters via the same port-centric driver flow as other driver kinds.

## 2. User & Context

- **Who:** User creating audio-reactive shaders or exporting video with audio.
- **When:** When configuring audio, during playback, when binding remappers to parameters, and when exporting video.

## 3. User Goals

- **Manage audio files** — Audio panel (bottom-bar toggle) shows setup: files, bands, remappers. Add file (upload or picker); primary source drives timeline duration and export. Playlist track or upload; preview may pause during file dialog.
- **Define bands and remaps** — **Bands:** per-source FFT ranges, smoothing, mode, FFT size. **Remaps:** gate normalized band level with **In** (**inMin**, **inMax**) on the remapper; **Out** (**outMin**, **outMax** in parameter units) is stored **per attached parameter** so one remapper can drive several ports with different target ranges (e.g. Strength 0…1.6 vs Opacity 0…100). Eval order: band level → **In** gate → **Out** map. **Out** is edited in real parameter units (e.g. −0.5 … 4), not limited to a 0–1 slider. **In** uses a slim gate editor on the normalized band level. MIDI drivers use the same gate / per-target **Out** model in the parameter driver panel (track set for tracks + ADSR, then remaps); see [12-parameter-drivers.md](./12-parameter-drivers.md). When attaching a remap from a parameter port, **Out** defaults from that parameter’s spec min/max on the **connection** and **In** defaults to 0–1 on the remapper; connecting another parameter to the same remapper does **not** reset existing gate or other targets’ Out ranges. The port defaults to **override (=)** for the audio driver wire. On the connected remapper card, **Input gate** and **Target range** (Out) appear together for the focused port. Browse/create/edit bands and remaps from the audio panel without a target parameter.
- **Control playback and see time** — Play/pause from bottom bar; time display and scrubber; one playhead and duration; primary source sets duration when loaded.
- **Scrub transport** — Drag time strip in bottom bar; playhead seeks; preview and driven parameters update.
- **Attach audio drivers to parameters** — **Target:** parameter port → driver panel → **Audio** → pick/create remapper → attach. **Current:** double-click port → **audio signal picker** (large when unattached, compact when connected); only **remappers** connect to ports (not raw band output). Remappers list other driven parameters; jump-to-port keeps picker open. Disconnect from picker or driver panel. Graph node outputs still connect by drag only. Live value and peak meter on audio-driven ports.
- **Import arrangement snapshot** — For Audiotool playlist primaries: import published-project arrangement once; snapshot enables arrangement visuals and MIDI drivers—not required for FFT audio drivers.
- **Arrangement pattern nodes vs DAW layout nodes** — Under **MIDI**, nodes like **Note Ripple Field**, **Pitch Wheel**, and **Chord Voronoi Bloom** read the same imported snapshot but drive **abstract fullscreen masks/warps** (ripples, pitch-class wheel sectors, Voronoi cells)—not piano-roll rectangles. **Notes** and **Regions** remain the literal DAW-style note and lane visuals in the same category. Pattern nodes compile with zero output when no snapshot is present; use **Tracks** on each node to filter lanes.
- **Persist audio setup** — Files, bands, remappers, playlist state, and arrangement snapshot stored with presets and clipboard separately from graph topology (see [08-presets-and-data.md](./08-presets-and-data.md)).

## 4. Key Flows

- **Session setup:** Audio toggle → add file or playlist track → configure bands/remappers (browse mode).
- **Bind to parameter (target):** Parameter port → driver panel → Audio → remapper → preview reacts.
- **Bind to parameter (current):** Double-click port → signal picker → connect remapper.
- **Playback:** Play in bottom bar → transport runs; scrub → seek; shader and audio in sync.
- **Export:** Video export uses primary audio buffer and duration ([09-export.md](./09-export.md)).

## 5. Constraints

- Web Audio (and OfflineAudioContext for export); export codec support varies by browser.
- **Import / portability** — Uploaded file ids may need re-upload after import JSON or moving machines.
- Driver panel unification: [12-parameter-drivers.md](./12-parameter-drivers.md). Audio panel remains the natural home for **browse/edit library** without a target port.

## 6. Related

- [04-nodes-and-parameters.md](./04-nodes-and-parameters.md) — Parameter ports and effective values.
- [07-timeline-and-automation.md](./07-timeline-and-automation.md) — Shared transport and playhead.
- [08-presets-and-data.md](./08-presets-and-data.md) — Audio setup in presets.
- [09-export.md](./09-export.md) — Video export with primary audio.
- [12-parameter-drivers.md](./12-parameter-drivers.md) — Unified driver attach/edit model.
