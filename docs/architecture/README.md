# Architecture documentation

**Last updated:** 2026-05

This folder describes **how the codebase is shaped**: ownership of the graph, control flow from UI to WebGL, where compilation runs (main thread vs worker), and where major subsystems live. **Product behavior** for users is specified in [`docs/user-goals/`](../user-goals/README.md). **Delivery tasks and experiments** live in [`docs/implementation/`](../implementation/README.md).

## System at a glance

Solid arrows are the **primary preview path**: graph edits and parameters flow **store → App callbacks → runtime → GPU**. When no worker is configured, `CompilationManager` runs `NodeShaderCompiler` **in the same process** instead of the dashed worker leg. **Detail:** [parameters-pipeline](./parameters-pipeline.md), [preview-and-recompilation](./preview-and-recompilation.md), [compilation-worker](./compilation-worker.md), [editor-ui-canvas-layout](./editor-ui-canvas-layout.md).

```mermaid
flowchart TB
  DM["src/data-model — types, immutableUpdates, validation, serialization"]

  GS["graphStore.svelte.ts — SSOT graph + audioSetup"]

  subgraph LIB["src/lib — Svelte"]
    APP["App, editor wrapper, panels, parameters"]
  end

  subgraph UI["src/ui — TypeScript only"]
    ED["ui/editor — canvas engine"]
    INT["ui/interactions"]
  end

  subgraph RUN["src/runtime"]
    RM["RuntimeManager"]
    CM["CompilationManager"]
    WK["compilationWorker — NodeShaderCompiler"]
    GL["Renderer · ShaderInstance · WebGL"]
  end

  DM --> GS
  APP -->|"store actions"| GS
  APP --> ED
  ED --> INT
  APP -->|"onGraphChanged / onParameterChanged"| RM
  GS --> APP
  RM --> CM
  CM -->|"apply programs, uniforms"| GL
  RM -->|"time + audio uniforms"| GL
  CM -.->|"optional: postMessage compile"| WK
  WK -.->|"CompilationResult"| CM
```

## Quick answers (~10 minutes)

| Question | Where to read |
| --- | --- |
| Where does the graph live? Who mutates it? | [`graph-and-platform-boundaries.md`](./graph-and-platform-boundaries.md) — `src/data-model/`, `src/lib/stores/graphStore.svelte.ts` |
| How does a parameter change reach the shader? | [`parameters-pipeline.md`](./parameters-pipeline.md) — store → App → `RuntimeManager` → `CompilationManager` → `ShaderInstance` |
| When does recompilation run vs uniform-only updates? | [`parameters-pipeline.md`](./parameters-pipeline.md) and [`preview-and-recompilation.md`](./preview-and-recompilation.md) |
| Where does GLSL compilation run (main vs worker)? | [`compilation-worker.md`](./compilation-worker.md) — `src/runtime/compilation/compilationWorker.ts` vs in-process |
| How does audio drive connected parameters? | [`audio-reactivity.md`](./audio-reactivity.md) — compiler wiring + `TimeManager` / `AudioParameterHandler` |
| Where is Svelte vs canvas TypeScript? | [`editor-ui-canvas-layout.md`](./editor-ui-canvas-layout.md) — `src/lib/` vs `src/ui/` |
| How do I enable the **adaptive preview (P2) DPR** experiment? | [`adaptive-preview-p2-toggle.md`](./adaptive-preview-p2-toggle.md) — `localStorage` key `shadernoice.previewAdaptive` or dev `__previewSchedulerDebug.setAdaptivePreview` |

## Suggested reading order

1. **`graph-and-platform-boundaries.md`** — Immutable graph, store, runtime seams, serialization entry points.
2. **`parameters-pipeline.md`** — End-to-end parameter changes and `ParameterValue` types.
3. **`preview-and-recompilation.md`** — Graph updates, debouncing, idle vs immediate scheduling, preview instrumentation.
4. **`compilation-worker.md`** — Worker protocol and what stays on the main thread.
5. **`audio-reactivity.md`** — Execution order, uniforms, per-frame updates.
6. **`editor-ui-canvas-layout.md`** — Editor folder layout and lib ↔ canvas bridge.

## Document map

| Document | Purpose |
| --- | --- |
| [graph-and-platform-boundaries.md](./graph-and-platform-boundaries.md) | Single source of truth for the graph, immutability, change detection, validation/serialization touchpoints, runtime-only parameter concept, errors at compile boundaries. |
| [parameters-pipeline.md](./parameters-pipeline.md) | UI → store → runtime → uniform vs recompile decisions; `ParameterValue` matrix; key files. |
| [preview-and-recompilation.md](./preview-and-recompilation.md) | `setGraph` / structure vs parameter paths, `CompilationManager` scheduling, interaction with `PreviewScheduler`, reliability notes. |
| [adaptive-preview-p2-toggle.md](./adaptive-preview-p2-toggle.md) | Optional adaptive preview DPR cap + settle; `localStorage` and dev `__previewSchedulerDebug` API. |
| [compilation-worker.md](./compilation-worker.md) | Optional Web Worker for `NodeShaderCompiler`; message flow; factory wiring; main-thread `applyCompilationResult`. |
| [audio-reactivity.md](./audio-reactivity.md) | Parameter connections to audio, compiler invariants, `TimeManager` policy for audio uniform passes. |
| [editor-ui-canvas-layout.md](./editor-ui-canvas-layout.md) | `src/lib/components/*` vs `src/ui/editor/*` and interactions; where to add UI vs canvas code. |
