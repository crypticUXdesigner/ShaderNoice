# Export — User Goals

## 1. Purpose

Capture shader output as image or video (optional audio). Resolution, duration, and format choices clear; feedback during export.

## 2. User & Context

- **Who:** User sharing or archiving the result (image or video).
- **When:** When composition is ready; image quick; video may take longer and requires WebCodecs support.

## 3. User Goals

- **Export a single frame as image** — Trigger (e.g. “Export” in top bar); capture current shader output at defined resolution (e.g. 1600×1600) and format (e.g. PNG); offer download. Uses same compiler and graph as live preview.
- **Export video with optional audio** — When supported: modal to set width, height, max duration, frame rate, “use full audio,” optionally bitrates. **Current defaults in the app:** audio **192 kbps**; video bitrate preset **50 Mbps** (other presets include 25 / 10 / 5 Mbps and custom); resolution and duration presets as shown in the dialog. Confirm or cancel; on confirm, export starts. During export: progress overlay (e.g. “Frame N / M,” cancel); runs in background (OfflineAudioContext + ExportRenderPath + WebCodecs); user can cancel. On success: file download; overlay dismissed. Export uses current graph and (for video) primary audio from audio setup when “use full audio”; limits (max width, height, duration, frame count) enforced; out-of-range show error or clamp.
- **Know when video export isn’t supported** — If browser does not support it (e.g. WebCodecs unavailable), show clear message and do not start.

## 4. Key Flows

- **Image:** Export (image) → current frame at export resolution → file offered.
- **Video:** Export video → dialog → set resolution, duration, full audio, bitrate → Confirm → progress → wait or cancel → on success, file downloads.
- **Unsupported:** Export video in unsupported browser → message (e.g. WebCodecs required).

## 5. Constraints

- Video export depends on WebCodecs (VideoEncoder, AudioEncoder) and optional OfflineAudioContext; support detected at runtime.

## 6. Related

- [06-audio.md](./06-audio.md) — Primary audio for video export.
- [08-presets-and-data.md](./08-presets-and-data.md) — Graph and audio setup as export input.
