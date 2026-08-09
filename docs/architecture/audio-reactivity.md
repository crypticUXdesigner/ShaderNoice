# Audio reactivity and parameter connections

**Last updated:** 2026-08-09 (arch-perf-followups closeout — analysis hop policy)

This document describes how **parameter connections** to audio (and related) nodes reach **generated GLSL** and how **per-frame uniforms** stay in sync. UI behavior for audio is specified in [`docs/user-goals/06-audio.md`](../user-goals/06-audio.md).

## Intended behavior

- Nodes can expose **audio-driven** outputs (e.g. analyzer bands).
- Any **parameter** connected to such a signal should reflect that signal in the shader, respecting **parameter input mode** (override / add / subtract / multiply) and the parameter’s configured value where applicable.

## Data flow

1. **Graph** — Parameter connections set `targetParameter` on `Connection`; port connections use `targetPort`. Both participate in execution ordering.
2. **Execution order** — `GraphAnalyzer` builds dependencies from all connections so sources (e.g. analyzers) sort **before** consumers.
3. **Shader codegen** — For connected parameters, `MainCodeGenerator` substitutes **`$param.*`** placeholders with the **source variable** (override) or a **mix** of uniform + source (add / subtract / multiply). `UniformGenerator` skips a uniform for a connected parameter **only** in **override** mode; other modes keep a uniform for the static component.
4. **Per-frame uniforms** — Audio analyzers push values into uniforms. [`RuntimeManager`](../../src/runtime/RuntimeManager.ts) wires `AudioParameterHandler.updateAudioUniforms` into [`TimeManager.updateTime`](../../src/runtime/runtime/TimeManager.ts).

### `TimeManager` and preview dependencies

When the last successful compile exposes a **`PreviewDependencyMask`** (`usesAudioUniforms`, `usesWallTime`, `usesTimelineTime`, …), `TimeManager` **skips** redundant audio-uniform work while the timeline is paused and the shader does not use audio uniforms—unless the graph is dirty, the timeline is playing, or a **paused cap** (~15 Hz) applies for shaders that still use audio uniforms. That avoids orphan uploads when idle while keeping live preview responsive when it matters.

## Offline analysis rates (preview vs export)

FFT / curve-cache builds use hop rates from [`src/runtime/audio-analysis/audioAnalysisRates.ts`](../../src/runtime/audio-analysis/audioAnalysisRates.ts):

| Path | Rate | Notes |
| --- | --- | --- |
| Live preview (worker curve builds) | **60 Hz** (`PREVIEW_ANALYSIS_RATE_HZ`) | Cheaper long-clip prep; progressive `partialResult` (~2 s prefixes) during full builds |
| Export / `OfflineAudioProvider` | **120 Hz** (`EXPORT_ANALYSIS_RATE_HZ`) | Dense canonical grid for video-frame sampling |

Fingerprint includes `hop:`. Export rebuilds at 120 Hz and does **not** reuse 60 Hz preview caches. **Intentional fidelity delta:** preview vs export band uniforms may differ slightly between hops (smoothing accumulates on a coarser grid). Same-hop live↔export samples stay aligned (tested). Product UX for bands/remaps is unchanged; see [`docs/user-goals/06-audio.md`](../user-goals/06-audio.md).

## Contract (invariants)

These invariants are relied on by tests and codegen; changing them requires coordinated updates across compiler and runtime.

1. **Execution order** — For each connection with `targetParameter`, the **source node** must appear **before** the **target** in topological order (parameter edges are included in the dependency graph).
2. **Compiler wiring** — `parameterInputVars` and placeholder replacement must use the **same** connection set the analyzer used for ordering.
3. **Runtime** — When the audio-uniform pass runs, uniforms are updated **before** the shader’s `main()` conceptually consumes them for the frame (variable assignments from uniforms precede dependent nodes in generated code).

## UI vs shader for “live” values

[`parameterValueCalculator`](../../src/utils/parameterValueCalculator.ts) resolves effective **numeric** display values for knobs and ports when connections exist. The **shader** does not call this helper; it uses generated variables fed from uniforms. Alignment is by **shared graph + connection semantics**, not by sharing the calculator inside GLSL.

## Extending audio-like nodes

- **Compiler** — Define outputs and node spec; ordering and codegen pick up new nodes through the same graph analysis.
- **UI** — If a new source should animate parameter **needles** in the node UI, extend the calculator / port helpers so the Svelte layer can resolve the signal chain.
