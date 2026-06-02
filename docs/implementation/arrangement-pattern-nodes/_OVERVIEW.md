# Arrangement pattern nodes — abstract MIDI-driven fullscreen patterns

## Mission

Ship **ten new `Patterns` nodes** that consume the existing **Audiotool arrangement snapshot** (`audioSetup.arrangementSnapshot`) to drive **abstract fullscreen shader patterns** — ripples, compasses, stripes, Voronoi, warps — without duplicating the literal DAW visuals already shipped as **`Regions`** (`arrangement-lanes`) and **`Notes`** (`arrangement-notes`).

Snapshot is **import-once static JSON**; nodes bake data at **compile time** and evaluate per pixel against **`uTimelineTime`** (or wired `time` input). No live MIDI, no piano-roll layout.

## Goals

- **Reuse** arrangement import, serialization, track filter UX, and compile-time packing patterns from `audiotool-arrangement`.
- **Add shared bake + shader helpers** so per-pixel loops stay bounded (time bins, pitch-class energy, region boundaries, density / track energy).
- **Deliver incrementally:** validate three data paths early (note onsets, active pitch-class, region boundaries), then composable utility nodes, then higher-expressivity nodes.
- **WebGL + WebGPU MVP** for each node; help + at least one demo preset in closeout.

## Success & constraints

| Must-have | Detail |
| --- | --- |
| Category | All nodes: **`Patterns`**. |
| Inputs | `in` vec2 **UV**; `time` float default **`uTimelineTime`**; center via **`centerX`/`centerY`** params (`parameterUI: 'coords'`) unless a task explicitly adds a vec2 port. |
| Outputs | Prefer **`float` mask** (`out`); add **`warp` vec2** or **`color` vec4** only where specified. |
| Missing snapshot | Match shipped arrangement nodes: **compile succeeds, zero output** (empty bake `count = 0`), not compile error. UI shows “No arrangement” via existing track-filter chrome. |
| Track filter | Reuse **`arrangement-track-filter`** layout + `trackFilterMode` / `trackFilterList` + `trackPassesArrangementFilter`. |
| Caps | Notes bake ≤ **2048**; regions ≤ **512**; per-pixel loops **pre-clamped** (typical max **512** onset window, **128** boundaries, **24** active sites, **16** tracks). |
| Checks | `npm run type-check && npm test && npm run lint && npm run build` green per completed task. |

**Invariants:** Immutable graph; snapshot read-only at compile; no CPU per-frame note uploads unless an existing preview-uniform pattern is extended deliberately in a task.

**Non-goals:** Piano-roll / timeline-strip UI; live MIDI; tempo maps; FFT duplication; parameter-driver / DAW automation (separate `parameter-drivers-v1` package).

## Architecture & design (codebase map)

Verified against repo **2026-05-30** (task 01).

```
audioSetup.arrangementSnapshot          ← AudioSetup field (audioSetupTypes.ts)
        │                                 validated on deserialize (serialization.ts)
        │                                 import via audiotool panel → audioSetupUpdates
        │
        ├── packArrangementNotesForGlsl   {{ARRANGEMENT_NOTES_BAKE}}  (arrangement-notes)
        ├── packArrangementRegionsForGlsl {{ARRANGEMENT_BAKE}}         (arrangement-lanes)
        │
        └── NEW (02A/02B): src/shaders/arrangement/pattern/
                 ├── note time bins / active notes / pitch-class energy / density
                 ├── region boundary events / per-track energy
                 └── shared GLSL/WGSL helpers (hash, pitch angle, clampLength, …)
        │
        ├── FunctionGenerator.ts — per-node-id inject* branches (GLSL placeholders)
        └── WgslMvpCompiler.ts — WGSL_SUPPORTED_NODE_TYPES + per-node case helpers
```

### Verified seams (do not fork)

| Concern | Location |
| --- | --- |
| Snapshot types & caps | `src/audiotool/arrangement/types.ts` — `MAX_ARRANGEMENT_REGIONS` **512**, `MAX_ARRANGEMENT_NOTES_PACKED` **2048**, `ARRANGEMENT_NOTES_PREVIEW_LOOP_BUDGET` **512**, `ARRANGEMENT_NOTES_INTERACTIVE_PACK_LIMIT` **1280** |
| Snapshot build | `src/audiotool/arrangement/buildArrangementSnapshot.ts` |
| Note / region packing | `src/shaders/arrangement/packArrangementNotesForGlsl.ts`, `packArrangementRegionsForGlsl.ts` |
| Shipped arrangement nodes | `src/shaders/nodes/arrangement-lanes.ts` (Regions), `arrangement-notes.ts` (Notes) — both **`Patterns`** |
| Track filter logic + UI | `src/audiotool/arrangement/arrangementTrackFilter.ts`, `src/lib/components/node/parameters/ArrangementTrackFilter.svelte` (`No arrangement` when snapshot absent) |
| Note window index (CPU) | `src/audiotool/arrangement/arrangementNotesVisibleRange.ts` |
| Preview loop uniforms | `src/runtime/arrangement/arrangementNotesPreviewLoop.ts` — `noteLoopStart` / `noteLoopEnd` per frame |
| Bake cache (preview) | `src/audiotool/arrangement/arrangementNotesBakeCache.ts`, refreshed from `CompilationManager` |
| GLSL injection | `src/shaders/compilation/FunctionGenerator.ts` — `arrangement-lanes` / `arrangement-notes` only today |
| WGSL cases | `src/shaders/compilation/WgslMvpCompiler.ts` — `arrangement-lanes`, `arrangement-notes` in allow-list + `case` helpers |
| Compile tests + fixture | `src/shaders/NodeShaderCompiler.test.ts`, `packArrangementNotesForGlsl.test.ts`, `src/audiotool/arrangement/__fixtures__/spike-arrangement-raw.json` |
| Non-MIDI pattern refs | `src/shaders/nodes/stripes.ts` (UV + time → float), `radial-pulse.ts` (center coords + timed events) |
| Per-node checklist | [`integration-checklist.md`](./integration-checklist.md) |

**Anti-patterns:** O(all notes) per pixel; duplicating DAW rectangle layout; importing `@audiotool/nexus` in shader nodes; mutating snapshot at runtime.

## Locked decisions (verified)

| Topic | Decision |
| --- | --- |
| Missing snapshot | **Compile succeeds, zero output.** Packer emits `COUNT = 0`; shader loops never run. Tests: `NodeShaderCompiler.test.ts` — `compiles with empty bake when snapshot is missing` (GLSL `arrangement-lanes`) and `compiles WGSL with empty bake when snapshot is missing`. Same contract for new pattern nodes (see checklist §11). |
| Center | **Params** `centerX`/`centerY` with `parameterUI: 'coords'` — **not** a vec2 port in v1. Layout reference: `radial-rays.ts`. Pattern nodes default **(0.5, 0.5)** in **0–1 UV** space (wired `UV Coords`); `radial-rays` defaults 0,0 because its `in` port is **Position**, not UV. |
| UV space | Pattern nodes use **0–1 UV** from wired **`UV Coords`** (`in` port label **UV**). Map from fragment `p` only when a task requires it (document per node). |
| Time bins | **Compile-time** fixed-width bins over `[0, durationSeconds]`; shader samples O(bins in window) or O(1) via pre-aggregated tables. |
| Region boundaries | Emit **start + end** events from packed regions; sort by time; cap **256** events (512 regions × 2, dedupe optional). |
| Node IDs | `note-ripple-field`, `pitch-class-compass`, `region-contour-rings`, `rhythm-stripe-field`, `velocity-spark-grid`, `track-halo-lattice`, `boundary-shutter-rays`, `duration-comet-trails`, `chord-voronoi-bloom`, `note-gravity-warp`. |
| Recompile triggers | **Snapshot import / clear:** `CompilationManager.computeAudioCompileFingerprint()` includes full `arrangementSnapshot`; mismatch forces compile (`audioNeedsCompile`). **`requestFullPreviewRecompile()`** clears fingerprint after project load. **Track filter:** `trackFilterMode` registered in `compileTimeBakeParams.ts` for `arrangement-lanes` / `arrangement-notes`; `trackFilterList` is **`string`** → always schedules recompile (`onParameterChange` non-uniform branch). New pattern nodes: register the same params + any bake-affecting scalars in `compileTimeBakeParams.ts`. **Not in fingerprint:** runtime remapper/band mapping (bands/remapper ids only, not live FFT). |
| Performance budget | Per-pixel loop caps (shader constants, pre-clamped): onset window **512**, region boundaries **128**, active pitch-class sites **24**, track lattice sites **16**. Notes bake table ≤ **2048**; regions ≤ **512**. |
| Module layout | New shared code: **`src/shaders/arrangement/pattern/`** (preferred). Extend `src/shaders/arrangement/*.ts` only when a task adds a single small helper. |

## Work items

| ID | Task | Status | Provides | Blocks |
| --- | --- | --- | --- | --- |
| 01 | [Codebase architecture map](./01-codebase-architecture-map-arrangement-pattern-nodes.md) | ✅ 2026-05-30 | Locked decisions + integration checklist | 02A, 02B |
| 02A | [Note-side pattern bake](./02A-note-pattern-bake-arrangement-pattern-nodes.md) | ✅ 2026-05-30 | Time bins, active notes, pitch-class energy, density | 03, 04, 06A, 06B, 07B, 07C, 07D |
| 02B | [Region bake + shared helpers](./02B-region-boundary-shared-helpers-arrangement-pattern-nodes.md) | ✅ 2026-05-30 | Boundary events, track energy, shader utils | 05, 06C, 07A |
| 03 | [Note Ripple Field](./03-note-ripple-field-arrangement-pattern-nodes.md) | ✅ 2026-05-30 | First shipped pattern node; validates onset window | 06B, 07B, 07D |
| 04 | [Pitch-Class Compass](./04-pitch-class-compass-arrangement-pattern-nodes.md) | ✅ 2026-05-30 | Pitch-class energy path | 07C |
| 05 | [Region Contour Rings](./05-region-contour-rings-arrangement-pattern-nodes.md) | ✅ 2026-05-30 | Region boundary visual path | 07A |
| 06A | [Rhythm Stripe Field](./06A-rhythm-stripe-field-arrangement-pattern-nodes.md) | ✅ 2026-05-30 | Density-modulated stripes + warp | 08 |
| 06B | [Velocity Spark Grid](./06B-velocity-spark-grid-arrangement-pattern-nodes.md) | ✅ 2026-05-30 | Grid spark mask | 08 |
| 06C | [Track Halo Lattice](./06C-track-halo-lattice-arrangement-pattern-nodes.md) | ✅ 2026-05-30 | Per-track lattice | 08 |
| 07A | [Boundary Shutter Rays](./07A-boundary-shutter-rays-arrangement-pattern-nodes.md) | ✅ 2026-05-30 | Section-transition rays | 08 |
| 07B | [Duration Comet Trails](./07B-duration-comet-trails-arrangement-pattern-nodes.md) | ✅ 2026-05-30 | Duration-aware trails | 08 |
| 07C | [Chord Voronoi Bloom](./07C-chord-voronoi-bloom-arrangement-pattern-nodes.md) | ✅ 2026-05-30 | Harmonic Voronoi | 08 |
| 07D | [Note Gravity Warp](./07D-note-gravity-warp-arrangement-pattern-nodes.md) | ✅ 2026-05-30 | UV warp field | 08 |
| 08 | [Docs, presets, closeout](./08-docs-presets-closeout-arrangement-pattern-nodes.md) | ✅ 2026-05-30 | Help, demos, package ✅ | — |

**Execution order:** `01` → (`02A` ∥ `02B`) → `03` → (`04` ∥ `05` after `03` smoke) → (`06A` ∥ `06B` ∥ `06C`) → (`07A` ∥ `07B` ∥ `07C` ∥ `07D`) → `08`. Prefer **one node per PR** stacked on shared infra.

## Progress tracker

- **Overall:** 100% — tasks **01**–**08** complete (note + region pattern bake, all ten pattern nodes, docs/presets closeout).
- **Milestone A (foundation):** tasks 01 ✅, 02A ✅, 02B ✅.
- **Milestone B (path validation):** task 03 ✅, task 04 ✅, task 05 ✅.
- **Milestone C (composable):** tasks 06A ✅, 06B ✅, 06C ✅.
- **Milestone D (expressivity):** tasks 07A ✅, 07B ✅, 07C ✅, 07D ✅.
- **Milestone E (closeout):** task 08 ✅.

## Notes & risks

- **`arrangement-notes` preview loop** already clamps per-pixel note scans via `noteLoopStart`/`noteLoopEnd` uniforms — windowed pattern nodes should reuse this pattern (task 02A) rather than scanning all 2048 baked notes.
- **`ARRANGEMENT_NOTES_INTERACTIVE_PACK_LIMIT` (1280)** subsamples dense bakes — pattern nodes must document whether they share subsampling or use bin tables unaffected by subsample.
- **`WgslMvpCompiler.ts`** is high conflict — serialize WGSL cases or coordinate parallel node PRs.
- **Research brief** with full algorithm sketches: `docs/research/midi-arrangement-visuals-research-brief.md` (and agent brief in planning chat).
- **Task 01 notes:** Added [`integration-checklist.md`](./integration-checklist.md). Clarified center defaults (0.5 UV vs radial-rays Position space) and recompile fingerprint vs `compileTimeBakeParams` split.
- **Task 02A notes:** Added `src/shaders/arrangement/pattern/` (`notePatternBake.ts`, `notePatternBakeGlsl.ts`, `constants.ts`) — time/active/pitch-class bins + sorted onsets (2048 cap, 1280 subsample); `injectArrangementPatternNoteBake()` + GLSL/WGSL bake builders; preview `onsetLoopStart`/`onsetLoopEnd` via `arrangementPatternPreviewLoop.ts` for stub node ids in `ARRANGEMENT_PATTERN_ONSET_NODE_TYPES`; tests in `notePatternBake.test.ts`.
- **Task 02B notes:** Added `regionBoundaryBake.ts`, `regionBoundaryBakeGlsl.ts`, `arrangementPatternHelpersGlsl.ts` — boundary events (256 cap, start/end per filtered region), per-track energy bins (16 tracks × time bins), `findBoundaryIndexRangeForWindow()`, `readRegionKindFilterOptions()`; shared GLSL/WGSL helpers registered via `graphUsesArrangementPatternSharedHelpers` in `FunctionGenerator` + `WgslMvpCompiler`; tests in `regionBoundaryBake.test.ts`, `arrangementPatternHelpers.test.ts`.
- **Task 03 notes:** Shipped `note-ripple-field` (`src/shaders/nodes/note-ripple-field.ts`) — pitch-angle/radius origins, expanding ring mask + energy sum; `injectArrangementPatternNoteBake` wired for all onset node types in `FunctionGenerator`; `buildNoteRippleFieldWgslNodeHelper` in `notePatternBakeGlsl.ts`; compile-time bake params for track filter; GLSL/WGSL tests in `NodeShaderCompiler.test.ts`; help entry + search tags.
- **Task 04 notes:** Shipped `pitch-class-compass` (`src/shaders/nodes/pitch-class-compass.ts`) — 12-sector annulus mask from pitch-class energy bins with release tail (no per-note loop); `samplePitchClassEnergyAt()` CPU mirror + `buildPitchClassCompassWgslNodeHelper`; `ARRANGEMENT_PATTERN_NOTE_BAKE_NODE_TYPES` + `isArrangementPatternNoteBakeNodeType` for note-bake injection; GLSL/WGSL compile tests; help entry + search tags.
- **Task 05 notes:** Shipped `region-contour-rings` (`src/shaders/nodes/region-contour-rings.ts`) — expanding ring mask from 02B boundary bake (track-row angle origins, kind filter, endWeight); `injectArrangementPatternRegionBake` wired via `isArrangementPatternRegionNodeType` in `FunctionGenerator`; `buildRegionContourRingsWgslNodeHelper` in `regionBoundaryBakeGlsl.ts`; compile-time bake params for track filter; GLSL/WGSL compile tests; help entry + search tags.
- **Task 06A notes:** Shipped `rhythm-stripe-field` (`src/shaders/nodes/rhythm-stripe-field.ts`) — density-modulated sine stripes + warp from time-bin window sample (no per-note loop); `sampleNoteDensityWindow()` CPU mirror; `buildRhythmStripeFieldWgslNodeHelper` in `notePatternBakeGlsl.ts`; compile-time bake params for track filter; GLSL/WGSL compile tests; help entry + search tags.
- **Task 06B notes:** Shipped `velocity-spark-grid` (`src/shaders/nodes/velocity-spark-grid.ts`) — pitch+track hashed grid cells, onset window loop (256 cap) with preview `onsetLoopStart`/`onsetLoopEnd`; `decay` window via `readOnsetWindowSeconds` in `arrangementPatternPreviewLoop.ts`; `buildVelocitySparkGridWgslNodeHelper` in `notePatternBakeGlsl.ts`; `MAX_PATTERN_SPARK_GRID_ONSET_LOOP`; GLSL/WGSL compile tests; help entry + search tags.
- **Task 06C notes:** Shipped `track-halo-lattice` (`src/shaders/nodes/track-halo-lattice.ts`) — per-track golden-angle lattice halos from 02B track energy bins (≤16 track loop, decay window); `sampleTrackEnergyAt()` CPU mirror; `buildTrackHaloLatticeWgslNodeHelper` in `regionBoundaryBakeGlsl.ts`; `isArrangementPatternTrackEnergyNodeType` + region bake injection in `FunctionGenerator`; compile-time bake params for track filter; GLSL/WGSL compile tests; help entry + search tags.
- **Task 07A notes:** Shipped `boundary-shutter-rays` (`src/shaders/nodes/boundary-shutter-rays.ts`) — radial shutter spokes at region start/end from 02B boundary bake (trailing window, 96 cap, spin + endPolarity phase); `buildBoundaryShutterRaysWgslNodeHelper` in `regionBoundaryBakeGlsl.ts`; `MAX_PATTERN_SHUTTER_BOUNDARY_LOOP`; compile-time bake params for track filter; GLSL/WGSL compile tests; help entry + search tags.
- **Task 07B notes:** Shipped `duration-comet-trails` (`src/shaders/nodes/duration-comet-trails.ts`) — curved comet strokes from onset bake (256 cap, sine bend, duration-scaled trail length + head glint); `buildDurationCometTrailsWgslNodeHelper` in `notePatternBakeGlsl.ts`; `durationCometTrailLength` CPU mirror; preview `trailTime` window in `arrangementPatternPreviewLoop.ts`; compile-time bake params for track filter; GLSL/WGSL compile tests; help entry + search tags.
- **Task 07C notes:** Shipped `chord-voronoi-bloom` (`src/shaders/nodes/chord-voronoi-bloom.ts`) — Voronoi tessellation from active pitch-class energy (≤24 site loop, velocity-weighted distance, edge/fill mask + pitch-class **Color**); `buildChordVoronoiBloomWgslNodeHelper` + `countActivePitchClassesAt` CPU mirror in `notePatternBake.ts`; compile-time bake params for track filter; GLSL/WGSL compile tests; help entry + search tags.
- **Task 07D notes:** Shipped `note-gravity-warp` (`src/shaders/nodes/note-gravity-warp.ts`) — pitch-placed gravity wells from onset bake (96 cap, radial/tangent mix via **Swirl**, `arrPatternClampLength` by **Clamp**); `buildNoteGravityWarpWgslNodeHelper` in `notePatternBakeGlsl.ts`; preview `window` in `arrangementPatternPreviewLoop.ts`; compile-time bake params for track filter; GLSL/WGSL compile tests; help entry + search tags.
- **Task 08 notes:** Closeout — all ten nodes already had complete `node-documentation.json` entries from tasks 03–07D; added presets `note-ripple-field-demo.json` + `arrangement-patterns-showcase.json` (embedded spike snapshot via `src/presets/arrangementPatternPresets.test.ts` regenerator); search-tag overrides for all pattern ids in `generate-node-search-tags.mjs`; user-goals addendum in `06-audio.md` + `04-nodes-and-parameters.md`; dense-snapshot compile budget test in `NodeShaderCompiler.test.ts` (1500 notes → 1280 onset subsample; GLSL ripple + WGSL voronoi ~35ms combined on dev CI 2026-05-30 — preview FPS bounded by per-pixel loop caps 512/24, not full bake scan); preset load/compile in `presetManager.scenario.test.ts`. **WGSL MVP snapshots:** not added — per-node GLSL/WGSL compile tests from 03–07D cover arrangement pattern nodes; `WEBGPU_MVP_FIXTURE_IDS` remains for generic node fixtures only (same as `arrangement-lanes` / `arrangement-notes`).
