# Timeline & Automation — User Goals

## 1. Purpose

Timeline provides global playhead, play/pause, and seek for preview and audio. Automation lanes let the user define curves over time for parameters so the shader can be animated without manual tweaking.

## 2. User & Context

- **Who:** User animating parameters over time or syncing to audio.
- **When:** During editing (scrub, play) and when authoring automation lanes and curves.

## 3. User Goals

- **See time and control playback** — Bottom bar: play/pause, time (current | duration), time strip (scrubber); strip reflects playhead and allows seek (click or drag). Play/pause global; when playing, playhead advances and shader (and audio) update; when paused, user can scrub. Duration from primary audio file when loaded; if no audio, default or zero; timeline panel shows same duration.
- **Seek to any moment** — Seek via time strip (click or drag); playhead moves; runtime seeks audio and updates frame.
- **Add and edit automation** — Timeline panel (e.g. from bottom bar) shows automation lanes; each lane tied to node and parameter (node id + param name). Add lanes and regions: start time, duration, loop flag, curve (keyframes with interpolation: linear, stepped, bezier). Curve editor for a region (e.g. double-click or “edit curve”): add/move/remove keyframes, set interpolation; changes saved to graph automation. Snapping (e.g. to grid or region boundaries) available in timeline or curve editor.
- **Have automation drive parameters on the whole timeline** — When a lane has at least one region with a usable curve (duration &gt; 0 and at least one keyframe), that lane **owns** the parameter for **all** transport times: the effective value comes from **lead-in** (before the first region, including negative time if used), **curve inside regions**, **hold** in gaps between regions (previous region’s end value), **tail hold** after the last non-looping region, and **loop-until-next-start** for looping regions (repeat until the next region’s start, or forever if there is no later region). The shader uses the same rules so preview matches the panel. Stored slider values are not used as a fallback merely because the playhead left a region rectangle.
- **See that a parameter is timeline-driven** — Node panel shows a small timeline cue on parameters that have evaluable automation; timeline lane headers repeat the cue and explain full-timeline behavior in the tooltip; the lane track shows a **faint tint** on times outside region rectangles where automation still applies (lead-in, gaps, tail hold).
- **Persist automation with the graph** — Automation state (BPM, duration, lanes, regions, curves) in `graph.automation`; serialized with graph so presets and copy/paste preserve it.

## 4. Key Flows

- **Play and scrub:** Play → time advances; drag scrubber → seek; pause → stop.
- **Add automation:** Open timeline panel → add lane for parameter → add region (start/duration/loop) → open curve editor → edit keyframes → close; during play, parameter follows the lane rules above everywhere on the timeline.
- **Edit curve:** Select region → open curve editor → move/add keyframe, set interpolation → close; graph updated.

## 5. Constraints

- Timeline and automation depend on runtime (e.g. RuntimeManager) exposing getTimelineState, seekGlobalAudio, toggleGlobalAudioPlayback; UI triggers these. Curve editor receives graph and lane/region id; returns updated graph (immutable); app applies to store and runtime.

## 6. Related

- [06-audio.md](./06-audio.md) — Playback, seek, primary audio duration.
- [04-nodes-and-parameters.md](./04-nodes-and-parameters.md) — Effective values and automation override.
- [08-presets-and-data.md](./08-presets-and-data.md) — Automation in graph serialization.
