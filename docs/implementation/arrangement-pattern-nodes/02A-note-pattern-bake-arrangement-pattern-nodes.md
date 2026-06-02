# 02A — Note-side pattern bake — arrangement-pattern-nodes

## Agent instructions (START HERE)

Follow sections in order. **Depends on 01.** Blocks all note-driven pattern nodes. Read **`_OVERVIEW.md`** and existing `packArrangementNotesForGlsl.ts` — **extend**, do not fork piano-roll packing.

## Overview

Add **compile-time note bakes** and CPU helpers for **time-window lookup**, **active notes**, **pitch-class energy**, and **onset density** so fragment shaders stay O(window) or O(1), not O(2048).

## Scope

### In

- **New module(s):** `src/shaders/arrangement/pattern/` (suggested exports):

| Export | Purpose |
| --- | --- |
| `packArrangementNoteTimeBinsForGlsl()` | Fixed bins over `[0, durationSeconds]`; each bin stores onset count, max/mean velocity, mean pitch (document bin width default, e.g. 0.05s) |
| `packArrangementActiveNoteBinsForGlsl()` | Per-bin or per-time-slice active note count + optional pitch-class 12-vector energy |
| `packArrangementPitchClassEnergyForGlsl()` | 12-bin energy table sampleable at `time` with **Release** tail (seconds) |
| `packArrangementNoteOnsetsForGlsl()` | Sorted onset list `{start, end, pitch, velocity, trackIndex}` capped at **2048**; reuse filter from `trackPassesArrangementFilter` |
| `buildNotePatternGlslBake()` / `buildNotePatternWgslBake()` | Emit `const` arrays + counts per node suffix |
| `findOnsetIndexRangeForWindow()` | Binary search on sorted onsets (mirror `findNoteIndexRangeForWindow`) |
| `injectArrangementPatternNoteBake()` | FunctionGenerator hook pattern (or shared injector called per node type) |

- **Preview runtime (required):** Extend or parallel `arrangementNotesPreviewLoop.ts` → e.g. `arrangementPatternPreviewLoop.ts` setting **`onsetLoopStart`/`onsetLoopEnd`** (or generic names) per windowed pattern node type so preview does not scan full bake.

- **Constants** (export from types or pattern module):

  - `MAX_PATTERN_ONSET_LOOP = 512`
  - `MAX_PATTERN_ACTIVE_SITES = 24`
  - Default bin count derived from snapshot duration (cap array size for GLSL limits — document max bins, e.g. 4096 or duration/0.05 whichever smaller).

- **Tests:** `src/shaders/arrangement/pattern/notePatternBake.test.ts`

  - Spike fixture snapshot: bin counts monotonic with note density; window index range correct; empty snapshot → zero counts.
  - Golden: small hand-built 3-note snapshot → expected bin/onset pack.

- **Do not** ship individual pattern nodes in this task.

### Out

- Region boundary events (02B).
- Shared hash/color helpers beyond minimal pitch-class palette stub if needed for tests.

## Dependencies

### Prerequisites

- **01**

### Provides

- Note bake API for tasks **03**, **04**, **06A**, **06B**, **07B**, **07C**, **07D**.

### Blocks

- **03**, **04**, **06A**, **06B**, **07B**, **07C**, **07D**

## Technical notes

- Reuse `readArrangementLanesPackOptions` / `resolveVisibleTracks` for track filter parity with **Notes** / **Regions**.
- Sorted by `startSeconds` before pack; subsampling policy: prefer **bin tables** for density; onset list may subsample like `ARRANGEMENT_NOTES_INTERACTIVE_PACK_LIMIT` when >1280 — log diagnostic once.
- WGSL: follow `buildArrangementNotesWgslNodeHelper` array literal style.

## Completion

✅ Done when Vitest passes for bake helpers, preview loop sets window uniforms for at least one stub node id (or documented hook), and **`npm run type-check && npm test && npm run build`** green.

### Final steps

- Update `_OVERVIEW.md` row **02A** → ✅ + date.
