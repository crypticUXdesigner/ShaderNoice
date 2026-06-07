# Export — User Goals

## 1. Purpose

Capture shader output as image or video (optional audio). Resolution, duration, and format choices clear; feedback during export.

## 2. User & Context

- **Who:** User sharing or archiving the result (image or video).
- **When:** When composition is ready; image quick; video may take longer and requires WebCodecs support.

## 3. User Goals

- **Export uses the same GPU mode as the editor session** — Still image and video rasterization follow the active **preview render mode** ([01-overview-and-app-shell.md](./01-overview-and-app-shell.md)): a **WebGPU** session exports via the **WebGPU** path only; a **WebGL2** session uses the **WebGL2** export path. There is **no** automatic “try WebGPU, then silently finish in WebGL” within **one** export job. If the graph or environment cannot complete export in the current mode, the user gets a **clear, actionable error** (e.g. switch to WebGL mode or reduce scope)—same spirit as preview **hard block**.
- **Export a single frame as image** — Trigger (e.g. “Export” in top bar); capture current shader output at defined resolution (e.g. 1600×1600) and format (e.g. PNG); offer download. Uses the same **graph and compiler** as live preview and the session’s **GPU export path** (WebGL2 or WebGPU).
- **Export video with optional audio** — When supported: modal to set width, height, max duration, frame rate, “use full audio,” optionally bitrates. **Current defaults in the app:** audio **192 kbps**; video bitrate preset **50 Mbps** (other presets include 25 / 10 / 5 Mbps and custom); resolution and duration presets as shown in the dialog. Confirm or cancel; on confirm, export starts. During export: progress overlay (e.g. “Frame N / M,” cancel); runs in background (OfflineAudioContext + frame render path + WebCodecs); user can cancel. On success: file download; overlay dismissed. Export uses current graph and (for video) primary audio from audio setup when “use full audio”; limits (max width, height, duration, frame count) enforced; out-of-range show error or clamp.
- **Parameter drivers and arrangement loops in export** — Video and still-image export evaluate **audio** remaps (offline), **MIDI envelope parameter drivers**, and **arrangement loop-index uniforms** (`velocity-spark-grid` and other onset-window pattern nodes, `arrangement-notes`) at the same **transport time** as preview when `audioSetup` has an **arrangement snapshot** where required; **animation** lanes use `uTimelineTime` in the compiled shader. Driver remap eval matches preview: band/envelope → remapper **In** gate → **gated 0–1** → per-target **Out** (audio: per virtual wire; MIDI: per binding). Offline audio caches the gated channel once per remapper; export applies each connection’s **Out** at sample/read. Compiled shaders bake per-wire **Out** constants from the same gated uniform. Without a snapshot, MIDI driver uniforms are skipped and arrangement loops are zeroed (same as preview). See [12-parameter-drivers.md](./12-parameter-drivers.md).
- **Know when video export isn’t supported** — If browser does not support it (e.g. WebCodecs unavailable), show clear message and do not start.

## 4. Key Flows

- **Image:** Export (image) → current frame at export resolution → file offered.
- **Video:** Export video → dialog → set resolution, duration, full audio, bitrate → Confirm → progress → wait or cancel → on success, file downloads.
- **Unsupported:** Export video in unsupported browser → message (e.g. WebCodecs required). Export in **WebGPU** session cannot be completed on WebGPU (graph or limits) → **clear error**, not a silent switch to WebGL in the same job; user may switch session to **WebGL** and retry ([01-overview-and-app-shell.md](./01-overview-and-app-shell.md)).

## 5. Constraints

- Video export depends on WebCodecs (VideoEncoder, AudioEncoder) and optional OfflineAudioContext; support detected at runtime.
- Raster export path (WebGL2 vs WebGPU) matches the editor session; architecture: [`../architecture/webgl-webgpu-preview-export.md`](../architecture/webgl-webgpu-preview-export.md).

## 6. Related

- [12-parameter-drivers.md](./12-parameter-drivers.md) — MIDI envelope drivers in preview and export.
- [06-audio.md](./06-audio.md) — Primary audio for video export.
- [08-presets-and-data.md](./08-presets-and-data.md) — Graph and audio setup as export input.
- [01-overview-and-app-shell.md](./01-overview-and-app-shell.md) — Session GPU mode (WebGL2 vs WebGPU) matches export rasterization.
- [10-help-and-discovery.md](./10-help-and-discovery.md) — User-facing copy for export failures in WebGPU mode.
