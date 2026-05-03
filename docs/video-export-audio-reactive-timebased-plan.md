# Video export + live audio-reactive parity (time-based, canonical 120 Hz)

## Context and problem statement

We currently compute audio-reactive uniforms (bands + remaps) using **stateful recursive smoothing** whose state advances **once per visual update**:

- **Live preview**: update cadence is `requestAnimationFrame` (depends on monitor refresh, load, throttling).
  - WebAudio `AnalyserNode` uses `smoothingTimeConstant = 0.8` (internal recursive filter).
  - App applies **additional** per-band smoothing: `smoothed = s * cur + (1 - s) * prev`.
- **Video export**: update cadence is **configured FPS**.
  - Offline provider approximates analyser smoothing with a fixed `0.8` recurrence **per exported frame**.
  - Offline provider also applies per-band smoothing `s` **per exported frame**.

Observed symptom: **120 fps export matches live better than 60 fps**. This is expected given the architecture: filters are parameterized “per update” instead of “per second”, and input sampling for smoothing happens only once per rendered frame.

### Goal

Make audio-reactive behavior **time-based and deterministic** across:

- live preview on 60/120/144 Hz displays (and under jitter),
- video export at 60 vs 120 fps,
- (eventually) any render cadence,

by ensuring:

1) smoothing coefficients are **dt-normalized** (seconds-based),
2) audio analysis state advances on a **canonical analysis timeline** (120 Hz), not render FPS,
3) render frames only **sample** that canonical audio-reactive signal at frame-center times.

### Decisions already made

- **Canonical analysis rate**: 120 Hz (analysis hop \(= 1/120\) seconds).
- **Export start behavior**: *warm-up* the analysis state so exporting from `startSeconds` behaves as if the track had already been playing (matches expert recommendation).

### Non-goals (for first implementation)

- No UI/UX redesign of audio controls in this pass (we will add data-model fields as needed, but keep UI changes minimal).
- No shader changes; we only change how band/remap uniforms are computed.
- No attempt to perfectly replicate browser-specific `AnalyserNode` internals beyond the current best-effort approach (windowing + linear magnitude smoothing + dB mapping). We prioritize determinism and parity.

## Current code map (relevant files)

### Export path

- `src/video-export/videoExportOrchestrator.ts`
  - drives per-frame export loop at `frameRate`
  - calls `offlineProvider.getFrameState(frameIndex)` then `renderPath.renderFrame(...)`
- `src/video-export/OfflineAudioProvider.ts`
  - computes per-frame audio state:
    - `channelSamples` (for mux input / diagnostics)
    - `uniformUpdates` (bands/remaps + file uniforms)
  - analysis time today: `t = start + (frameIndex + 0.5) / frameRate`
  - smoothing today:
    - per-bin “analyser-like” smoothing: fixed 0.8 per frame
    - per-band smoothing: fixed `s` per frame
- `src/video-export/ExportRenderPath.ts`
  - applies `uniformUpdates` per frame to shader instance

### Live path

- `src/lib/App.svelte`
  - `requestAnimationFrame` loop calls `runtimeManager.setTime(time)`
- `src/runtime/RuntimeManager.ts` + `src/runtime/runtime/TimeManager.ts`
  - updates time and always calls `audioParameterHandler.updateAudioUniforms(...)` when a shader exists
- `src/runtime/runtime/AudioParameterHandler.ts`
  - forwards to `AudioManager.updateUniforms(...)`
- `src/runtime/AudioManager.ts`
  - creates `AnalyserNode` with `fftSize=4096` and `smoothingTimeConstant=0.8` on load
  - `updateUniforms` calls `collectAudioUniformUpdates(...)`
- `src/runtime/audio/FrequencyAnalyzer.ts`
  - reads `getByteFrequencyData(...)`
  - band extraction and per-band smoothing `smoothed = s * new + (1 - s) * old`
- `src/runtime/audio/audioUniformUpdates.ts`
  - pushes `band`, `band0..`, and `remap` uniforms from analyzer state + audioSetup config

## Target architecture (robust parity)

Canonical model:

1) **Input** (live: analyser snapshot; export: AudioBuffer sampling)
2) **Canonical analysis timeline** at 120 Hz
3) **Time-based smoothing** (dt in seconds) applied within canonical steps
4) Produces deterministic band/remap curves over time
5) Render (live or export) samples the curves at its own frame-center times

This separates “audio timeline evolution” from “render cadence”.

## Implementation plan (phased)

### Phase 1 — Export: precompute canonical 120 Hz analysis cache + warm-up + time-based smoothing

This phase gives immediate improvement to “60 vs 120 export mismatch”, and is deterministic and testable.

#### 1.1 Build a deterministic 120 Hz analysis cache (random access, dense curve cache)

Instead of lazily substepping inside `getFrameState(frameIndex)`, we precompute a canonical 120 Hz timeline of audio-reactive values (bands/remaps) for the export segment. This makes `OfflineAudioProvider` deterministic under random access and removes hidden coupling to call order.

Determinism requirement:

- `getFrameState(2)` must produce the same result whether it is called:
  - after `getFrameState(0)`/`(1)`, or
  - as the first call, or
  - in any other order.

Add provider-internal state:

- `analysisHopSeconds = 1 / 120`
- smoothing state already exists:
  - `analyserSmoothedMagnitudes: Float32Array` (per bin)
  - `smoothedBandValues: Map<string, number[]>` (per analyzer/band)

##### Cache representation (dense curves; avoid per-frame objects/maps)

Do **not** store one object per canonical frame with `Map` fields. That is convenient but allocation-heavy and makes interpolation harder.

Use a dense numeric cache:

```
type AudioAnalysisCurveCache = {
  startTimeSeconds: number
  hopSeconds: number // 1/120
  frameCount: number

  channels: AudioAnalysisChannel[] // stable ordered list of uniform-driving channels
  values: Float32Array            // flattened: values[frameIndex * channelCount + channelIndex]
}

type AudioAnalysisChannel = {
  uniformKey: string              // e.g. "{bandId}.band", "{bandId}.remap", "remap-{id}.out"
  kind: 'band' | 'remap' | 'remapperOut'
  sourceId?: string               // metadata only (debug/invalidation); not used in hot sampling path
  min?: number                    // optional clamp (e.g. 0)
  max?: number                    // optional clamp (e.g. 1)
  defaultValue?: number           // used when cache missing / out-of-range; typically 0
}
```

Notes:

- `channels` is derived once from `audioSetup` (bands/remappers) and remains stable for the cache.
- `values` stores *final uniform-driving values only* (not FFT bins).

This gives:

- deterministic random access,
- trivial interpolation (tight loop over a flat `Float32Array`),
- fewer allocations and better locality.

Implementation shape:

- `prepareAnalysisCache(): void` called from the provider constructor or first `getFrameState`.
  - Builds canonical frames from warm-up start through export end.
  - Advances smoothing state only during cache construction.
  - After construction, `getFrameState` does not mutate smoothing state.

Pseudo:

```
analysisStart = cacheStartSeconds
analysisEnd = cacheEndSeconds

// Canonical grid: analysisStart + k * hop
for k in [0..K]:
  t = analysisStart + k * hop
  dt = (k == 0 ? 0 : hop)
  stepAnalysisAt(t, dt)     // compute spectrum + time-based smoothing + band extraction
  writeFinalValuesIntoDenseCacheRow(k)

cache.values = Float32Array(frameCount * channelCount)
```

Trade-off:

- Precompute uses memory proportional to duration × 120 Hz, but the stored values are small compared to video encoding.

Example scale:

- 5 minutes → 300s × 120Hz = 36,000 frames

#### 1.2 Sample/interpolate cache at export frame centers (render is read-only)

Export samples at frame centers:

- 60 fps: `t = start + (n + 0.5) / 60`
- 120 fps: `t = start + (n + 0.5) / 120`

Canonical frames are aligned to:

- `t = cacheStart + k / 120` where `cacheStart = startSeconds` (warm-up advances state before storage)

These grids do not necessarily align (e.g. 120 fps frame centers are at odd multiples of 1/240). To avoid frame-rate-dependent “partial step” state mutation, `getFrameState(frameIndex)` should **sample the cache** via interpolation:

- find `a = frameBefore(t)` and `b = frameAfter(t)`
- compute `u = (t - a.time) / (b.time - a.time)`
- linearly interpolate band/remap values

This preserves the principle that “render samples a canonical curve” and keeps export FPS from affecting smoothing state evolution.

Important: **interpolate final values**, not raw values that are later remapped at render time. In particular:

- Store and interpolate smoothed `band` values (shader-facing band uniforms).
- Store and interpolate post-remap `remap` values (shader-facing remap uniforms).
- Store and interpolate `remap-{id}.out` for remapper virtual nodes.

This avoids frame-rate-dependent differences from applying nonlinear remap functions at render cadence.

#### 1.3 Make smoothing dt-based inside canonical cache construction

We will express smoothing in **time-based units** internally, even if config is still legacy coefficient-based.

We have two smoothing stages:

- **Stage A (analyser-like)**: today `smoothedBin = 0.8 * prev + 0.2 * cur` per frame.
  - Convert legacy `prevRetentionLegacy = 0.8` tuned at reference 120 Hz into a time constant:
    - `tauAnalyserSeconds = -(1 / 120) / ln(0.8)`
  - Then per step:
    - `ret = exp(-dt / tauAnalyserSeconds)`
    - `smoothed = ret * prev + (1 - ret) * cur`

- **Stage B (per-band smoothing)**: today `smoothedBand = s * cur + (1 - s) * prev` per frame.
  - Important: legacy `s` is **new-sample weight**; previous-retention is `prevRetentionLegacy = (1 - s)`.
  - Convert per-band legacy `s` into `tauBandSeconds` assuming legacy tuning at 120 Hz:
    - `tauBandSeconds = -(1 / 120) / ln(1 - s)`
    - edge cases:
      - `s <= 0` ⇒ **infinite smoothing (frozen)** (preserve legacy equation meaning)
      - `s >= 1` ⇒ no smoothing (immediate)
  - Then per step:
    - `ret = exp(-dt / tauBandSeconds)`
    - `smoothedBand = ret * prev + (1 - ret) * curBand`

Deliverable: Replace fixed per-frame coefficients with dt-based coefficients (computed per step).

#### 1.4 Export warm-up behavior (during cache construction)

We want “export from startSeconds” to behave like the audio had been playing. That implies the smoother’s internal state is not cold-started at `startSeconds`.

Warm-up plan:

- Define a warm-up window in seconds, derived from the maximum relevant time constant:
  - `warmUpSeconds = clamp( 5 * max(tauAnalyserSeconds, tauBandSecondsMax), min=0.25, max=3.0 )`
  - (exact constants subject to expert review)
- Anchor warm-up to the semantic clip boundary (`startSeconds`), not the first frame center:
  - `warmStart = max(0, startSeconds - warmUpSeconds)`
  - warm the smoothing state by advancing analysis from `warmStart` to `cacheStart`
  - then build/store canonical cache from `cacheStart = startSeconds` through `cacheEnd`

This makes frame 0 match what you’d see if you had been running for a short time before the start, without requiring simulating the full preceding track.

##### Cache coverage (avoid end clamping artifacts)

To ensure interpolation has a valid “next” canonical frame near the end, include one hop beyond the last sampled time.

- Let `lastVideoSampleTime = startSeconds + (maxFrames - 0.5) / exportFps`
- Choose:
  - `cacheStart = startSeconds`
  - `cacheEnd = lastVideoSampleTime + hopSeconds`

Then build `frameCount = ceil((cacheEnd - cacheStart) / hopSeconds) + 1`.

Implementation tip to reduce off-by-one errors:

```
lastSampleTime = startSeconds + (maxFrames - 0.5) / exportFps
frameCount = ceil((lastSampleTime - cacheStart) / hopSeconds) + 2
```

This guarantees at least one canonical frame at-or-before `lastSampleTime`, and one after for interpolation.

Sampling tip to avoid floating-point boundary issues at exact grid points:

- compute `x = (t - cache.startTimeSeconds) / cache.hopSeconds`
- choose:
  - `i0 = clamp(floor(x + 1e-9), 0, cache.frameCount - 2)`
  - `i1 = i0 + 1`
  - `u = clamp(x - i0, 0, 1)`

#### 1.5 Keep output uniform semantics identical

We must continue producing:

- file uniforms: `{fileId}.currentTime`, `.duration`, `.isPlaying` (export currently sets `isPlaying=1`)
- analyzer uniforms: `band` / `band0...` and `remap` / `remap0...`
- remapper virtual nodes: `remap-{id}.out`

No shader changes required.

#### 1.6 Verification for Phase 1

Add deterministic “trace” tooling for export only (can be dev-only):

- For a fixed AudioBuffer + band config:
  - compute band/remap values sampled at:
    - 60 fps frame-centers
    - 120 fps frame-centers
  - compare both against a canonical reference sampled at the 120 Hz analysis hop timeline (interpolated as needed)

Important comparison rule:
- Do **not** compare frameIndex-to-frameIndex (timestamps differ).
- Compare by timestamp (interpolate one curve onto the other’s timestamps, or compare both to a reference).

---

### Phase 2 — Live: prefer sampling the same precomputed curve for file-backed audio

Goal: live preview parity with export and invariance across monitor Hz/jitter.

Key adjustment: rAF cannot provide true 120 Hz fresh analyser snapshots on 60 Hz displays. To make live behavior stable and close to export, the preferred approach for **file-backed audio** is to reuse the same canonical 120 Hz analysis curve computed from the decoded `AudioBuffer`, and sample it by audio playback time.

This makes live preview largely independent of monitor Hz: rAF only samples a curve, it does not define the analysis cadence.

#### 2.1 Set WebAudio analyser smoothing to zero

In `src/runtime/AudioManager.ts` when creating the analyser:

- change `analyser.smoothingTimeConstant` from `0.8` to `0`

Rationale:
- We cannot dt-normalize internal analyser smoothing.
- Keeping it causes double-smoothing and adds cadence dependence.

#### 2.2 Prefer float frequency data, smooth in linear magnitude domain

Current live code uses `getByteFrequencyData` (dB mapped + clipped + quantized).

Plan:

- Switch live analyzer sampling to `getFloatFrequencyData(Float32Array)` (dB values).
- Convert each bin from dB to linear magnitude:
  - `mag = 10^(db/20)`
- Apply our **Stage A** analyser-like smoothing (dt-based) to these magnitudes.
- If we still need byte-like behavior for band extraction parity, we can apply the same min/max dB mapping used by export after smoothing, but this can be tuned later.

This aligns live’s smoothing domain with the export offline implementation (which smooths linear magnitudes before converting to dB/bytes).

#### 2.3 Preferred path: precompute curve from `AudioBuffer`, sample by playback time

When we have access to the decoded `AudioBuffer` (we do for uploaded/loaded files), reuse the export-style analysis cache:

- on audio load or band/remap config change:
  - (re)build canonical 120 Hz analysis frames over the relevant duration (with warm-up policy appropriate for live)
- on each rAF:
  - determine `analysisTimeSeconds` from playback/timeline
  - sample/interpolate the cached curve at `analysisTimeSeconds`
  - emit uniforms

This eliminates dependence on WebAudio analyser behavior for parity-critical uniforms in the common case (file playback).

##### Live cache invalidation (must be deliberate)

For live reuse, cached curves must be invalidated whenever any analysis input changes. Define an explicit cache key derived from:

- audio buffer identity (file id) and decoded buffer metadata (sample rate, channels)
- analysis constants (canonical hop = 1/120, FFT size, window function, dB mapping constants if any)
- legacy reference policy constants (e.g. reference FPS for legacy coefficients)
- audioSetup-derived analysis configuration:
  - band definitions (ranges), per-band smoothing settings, fftSize mapping
  - remap settings (in/out min/max)
  - remappers mapping (bandId → remap-{id}.out)
- warm-up policy (warm-up vs reset; warm-up window clamps)

Implementation note: for export, caches are throwaway per export run; for live, consider a `hashAudioAnalysisConfig(...)` helper so invalidation is deterministic and not “best effort”.

Additional invalidation inputs to include (timing + analysis semantics):

- **audio source time mapping** (project time → buffer time)
  - start offset, trim in/out, loop region + loop enabled, playback rate/time-stretch, reverse (if supported)
- **analysis preprocessing**
  - channel mix policy (mono average vs single channel), out-of-bounds sample policy (zero-pad/clamp/wrap)
  - whether analysis follows gain/volume (if yes, include pre-analysis gain)
- **FFT/bin mapping details**
  - window alignment (centered-at-`t` vs ending-at-`t`), Hz→bin rounding policy, inclusive/exclusive bin ranges
  - min/max dB constants and linear magnitude normalization scale
- **remap semantics**
  - clamp mode, curve/easing type, inversion, thresholds/dead-zones, post-gain (if any), ordering/topology of remapper application
- **versioning constants**
  - analysis algorithm version, cache schema version, legacy migration policy version

#### 2.4 Fallback path: WebAudio analyser input + dt-normalized smoothing

For sources where no `AudioBuffer` is available (streaming/live input), keep the analyser-based pipeline, but:

- set `smoothingTimeConstant = 0`
- use `getFloatFrequencyData`, convert dB→linear magnitudes
- apply dt-normalized smoothing

This fallback is **stable across monitor Hz**, but not guaranteed bit-identical to export (input spectrum differs).

#### 2.5 Advance analysis in canonical 120 Hz steps, driven by audio/timeline time (fallback)

We want smoothing state to evolve according to the **audio/timeline clock**, not rAF.

Approach:

- Define `analysisTimeSeconds` as:
  1) primary audio playback time (preferred), else
  2) runtime timeline time (`uTimelineTime` source), else
  3) wall-clock as last resort (only when no timeline exists)
- Move `FrequencyAnalyzer.updateFrequencyAnalysis` to accept an update context:

```
type AudioAnalysisUpdateContext = {
  analysisTimeSeconds: number
  isPlaying: boolean
  sourceId: string
  resetReason?: 'seek' | 'source-change' | 'config-change' | ...
}
```

Internally `FrequencyAnalyzer` stores:
- `lastAnalysisTimeSeconds`
- per-analyzer smoothing state (band values, smoothed band values)
- (optionally) a shared per-bin smoothed magnitude buffer if we centralize Stage A there

Then `FrequencyAnalyzer`:
- computes dt between calls
- if dt > 0:
  - advances using canonical 120 Hz steps (substeps) up to `analysisTimeSeconds`
- if dt == 0: no change
- if dt < 0 or resetReason provided: reset/warm-up

This avoids threading `dt` through many layers and supports explicit resets on seeks and source changes.

#### 2.6 Seek/pause/throttle semantics (live)

Rules:

- **Pause** (timeline/audio time not advancing): analysis holds (dt=0).
- **Seek/rewind** (analysisTimeSeconds jumps backward or explicit seek):
  - reset smoothing state and warm-up from `analysisTimeSeconds - warmUpSeconds` to `analysisTimeSeconds`.
- **Large forward jump** (tab throttling; audio time advanced a lot):
  - either substep catch-up (bounded) or warm-up near the current time.

This prevents the “clamp dt” anti-pattern that can keep stale state too long.

---

### Phase 3 — Data-model + preset compatibility: introduce time-based smoothing fields

We should not silently reinterpret legacy `smoothing` (dimensionless) as seconds.

#### 3.1 Add new time-based field(s)

Minimum viable:

- `smoothingHalfLifeSeconds` (or `smoothingHalfLifeMs`) on bands (and possibly remappers, if needed)

Better long-term:

- `attackHalfLifeSeconds`
- `releaseHalfLifeSeconds`

For this plan, start with a single half-life field (simpler migration/UI), then extend.

#### 3.2 Migration policy

On load:

- if new time-based field exists: use it
- else if legacy coefficient exists: convert using **reference 120 Hz** (legacy look preservation)

On save:

- write the new time-based field
- optionally retain the legacy field for backwards compatibility for a transition period (decision needed)

#### 3.3 UI impact

Not part of Phase 1/2 unless required.

If UI must expose the new fields, prefer milliseconds and plain language:

- “Smoothing half-life (ms)”

---

## Risks and mitigations

### Risk: CPU cost (live and export)

- Substepping at 120 Hz adds work.
- Export already does FFT per frame; substepping may increase total FFT calls significantly.

Mitigations:

- Export:
  - precompute band curves at 120 Hz once per export (the canonical cache).
  - store dense curves only (no per-frame objects/maps; no per-frame FFT bin retention).
- Live:
  - For file-backed audio, prefer sampling the precomputed curve (no “fake 120 Hz” substeps from rAF).
  - For fallback analyser sources, accept that canonical 120 Hz stepping is constrained by available analyser snapshots; prioritize dt-normalized smoothing for stability rather than claiming full export equivalence.

### Risk: live/export still differ due to analyser differences

Even with time-based smoothing, differences can remain if live input spectrum differs from offline FFT model.

Mitigation:

- Move live to float dB bins and smooth linear magnitudes (closer to spec order).
- Ensure min/max dB mapping matches between live and export if we still use byte-like extraction.

### Risk: preset/UX confusion during migration

Mitigation:

- Add explicit new field; document legacy conversion policy (120 Hz reference).
- Consider showing both “legacy smoothing” and “time-based smoothing” during transition (advanced).

## Concrete change list (expected)

Phase 1 (export only):

- `src/video-export/OfflineAudioProvider.ts`
  - build deterministic canonical 120 Hz analysis cache (precompute)
  - add warm-up logic for export start
  - replace per-frame smoothing with dt-based smoothing
- (optional) `src/video-export/videoExportOrchestrator.ts`
  - no change expected (still calls `getFrameState(frameIndex)`); provider handles substeps internally
- (optional) add a small dev-only trace helper or test

Phase 2 (live):

- `src/runtime/AudioManager.ts`
  - set `analyser.smoothingTimeConstant = 0`
- `src/runtime/audio/FrequencyAnalyzer.ts`
  - switch to `getFloatFrequencyData`
  - implement dt-based smoothing and canonical stepping
  - accept analysis time context (or store last time internally)
- `src/runtime/audio/audioUniformUpdates.ts`
  - minimal; may need to pass analysis context through (depending on chosen integration)
- `src/runtime/runtime/AudioParameterHandler.ts` and/or `AudioManager.updateUniforms(...)`
  - provide analysis time (audio/timeline) context

Phase 3 (data-model):

- `src/data-model/audioSetupTypes.ts` (+ migrations/serialization as needed)
  - add new time-based smoothing field(s)
- update any fixtures/presets if we choose to write new field

## Open questions for expert review

1) **Export cache structure**: what is the best minimal cached representation (arrays vs maps) to minimize allocations and keep interpolation simple?
2) **Warm-up window**: is `5 * maxTau` a good heuristic? What min/max clamps would you use?
3) **Live path choice**: for file-backed audio, should live always prefer sampling the precomputed curve (export-style) and treat WebAudio analyser as fallback-only?
4) **Domain alignment**: if live uses the precomputed curve for file-backed audio, is it still worth aligning analyser-domain behavior for fallback sources now?
5) **Migration**: half-life vs tau vs attack/release—what’s the best long-term UX while preserving legacy look via a 120 Hz reference policy?

