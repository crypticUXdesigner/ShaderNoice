# Audio — User Goals

## 1. Purpose

Audio drives the shader in real time (frequency bands, remapped values) and anchors transport for preview and export. Users manage **session audio** (files, bands, remappers) in the audio panel and attach **audio drivers** to parameters via the same port-centric driver flow as other driver kinds.

## 2. User & Context

- **Who:** User creating audio-reactive shaders or exporting video with audio.
- **When:** When configuring audio, during playback, when binding remappers to parameters, and when exporting video.

## 3. User Goals

- **Manage audio files** — Audio panel (bottom-bar toggle) shows setup: files, bands, remappers. Add file (upload or picker); primary source drives timeline duration and export. Playlist track or upload; preview may pause during file dialog.
- **Define bands and remaps** — **Bands:** per-source FFT ranges, smoothing, mode, FFT size. **Remaps:** map band level to an output range (inMin, inMax, outMin, outMax)—the **shaping layer** for an audio driver. MIDI drivers mirror this in the parameter driver panel: track set (tracks + response) + **remaps** (outMin/outMax only); see [12-parameter-drivers.md](./12-parameter-drivers.md). Browse/create/edit bands and remaps from the audio panel without a target parameter. **Target:** the same remap configuration also appears in the **parameter driver panel** when editing an audio driver from a port (main column, bands as section dividers).
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
