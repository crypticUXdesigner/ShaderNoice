# Timeline & Automation — User Goals

## 1. Purpose

**Transport** (playhead, duration, seek) synchronizes preview, audio, and time-based parameter motion. **Animation drivers** define how float parameters change over transport time via keyframe curves. Transport lives in the shell; animation authoring is converging on the **parameter driver panel** rather than a separate timeline-first workflow.

## 2. User & Context

- **Who:** User animating parameters over time or syncing motion to audio and arrangement.
- **When:** During playback/scrub and when authoring or editing animation curves.

## 3. User Goals

- **See time and control playback** — Bottom bar: play/pause, time (current | duration), scrubber strip (click or drag). One global playhead; when playing, preview and audio advance; when paused, user can scrub. Duration from primary audio when loaded; otherwise default or user-set automation duration.
- **Seek to any moment** — Scrubber or lane/ruler seek moves playhead; runtime seeks audio and updates frame.
- **Add and edit animation drivers** — **Primary:** from the parameter port → driver panel → **Animation** → default **full-length curve** over transport → edit keyframes in panel (optional zoom/pan in curve view). **Advanced:** split into regions, loop segments, multiple curves on one lane—same evaluation rules as below. **Optional overview:** timeline panel → **Add Lane** → add **region** on track → open **curve editor** (double-click region or edit action); snapping on grid/region boundaries in timeline or curve editor.
- **Have animation drive parameters on the whole timeline** — When a lane has at least one **evaluable** region (duration &gt; 0, keyframes present), that lane **owns** the parameter for **all** transport times: **lead-in** before the first region, **curve inside** regions, **hold** in gaps, **tail hold** after the last non-looping region, **loop-until-next-start** for looping regions. Shader and panel use the same rules; stored slider is not a fallback merely because the playhead left a region rectangle.
- **See that a parameter is animation-driven** — Timeline cue on parameter row and lane headers; faint tint on lane track for times outside region boxes where evaluation still applies (lead-in, gaps, tail).
- **Use timeline panel as optional overview** — Dedicated panel for all lanes, region blocks, drag/resize, multi-lane view. Single-parameter animation and MIDI envelope authoring lives in the **parameter driver panel** ([12-parameter-drivers.md](./12-parameter-drivers.md)); timeline panel is not required for one-param workflows.
- **Persist automation with the graph** — BPM, duration, lanes, regions, curves in `graph.automation`; serialized with presets and clipboard.

## 4. Key Flows

- **Play and scrub:** Play → time advances; drag scrubber → seek; pause → stop.
- **Add animation (primary):** Parameter port → driver panel → Animation → edit curve → close; parameter follows lane rules on transport.
- **Add animation (timeline overview):** Open timeline panel → add lane for parameter → add region → curve editor → keyframes.
- **Edit curve (current):** Select region in timeline panel → curve editor → keyframes/interpolation → graph updated.

## 5. Constraints

- Transport and automation evaluation depend on runtime timeline APIs (play, seek, duration). Curve edits apply immutable graph updates.
- Float parameters only for automation lanes (int/enum not supported on lanes).
- Driver panel as primary authoring surface: [12-parameter-drivers.md](./12-parameter-drivers.md).

## 6. Related

- [06-audio.md](./06-audio.md) — Playback, seek, primary duration.
- [04-nodes-and-parameters.md](./04-nodes-and-parameters.md) — Effective values and port cues.
- [08-presets-and-data.md](./08-presets-and-data.md) — Automation in graph serialization.
- [12-parameter-drivers.md](./12-parameter-drivers.md) — Animation as a driver kind.
