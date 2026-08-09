# Graph, stores, and platform boundaries

**Last updated:** 2026-08-09 (arch-perf-followups closeout)

The **node graph** (nodes, connections, view state, automation metadata) is owned by the **data model** and exposed through a **Svelte 5 module store**. **Runtime and compilation read the graph**; they do not mutate it in place. This page is the canonical description of that boundary and of related seams (types, serialization, connections, change detection, runtime-only parameters).

## Graph ownership and immutability

- **Types** — `NodeGraph`, `NodeInstance`, `Connection`, `ParameterValue`, etc. live in [`src/data-model/types.ts`](../../src/data-model/types.ts). [`src/types/nodeGraph.ts`](../../src/types/nodeGraph.ts) re-exports those types and narrows file-format shapes; it is not a second graph implementation. Optional **`bypassed?: boolean`** on **`NodeInstance`** records per-node Power (serialized like other node fields); the compiler interprets it at compile time—the runtime does not simulate bypass separately from the shader (see [`docs/user-goals/04-nodes-and-parameters.md`](../user-goals/04-nodes-and-parameters.md)).
- **Updates** — Pure updaters in [`src/data-model/immutableUpdates.ts`](../../src/data-model/immutableUpdates.ts) (`updateNodeParameter`, `addNode`, `removeConnection`, …) return a **new** graph reference.
- **Store** — [`src/lib/stores/graphStore.svelte.ts`](../../src/lib/stores/graphStore.svelte.ts) holds `$state` for the graph and audio setup; actions call immutable updaters then assign `graph = …`.
- **Compile IR** — Pass-plan / uniform / preview-mask types live in [`src/compile-contract/`](../../src/compile-contract/) (neutral module shared by `shaders` emit and `runtime` consume). Do **not** import those IR types from `runtime/types`.
- **WebGPU capability allowlists** — Wire-time / compile MVP allowlists (e.g. generic-raymarcher SDF types) live in [`src/platform-validation/`](../../src/platform-validation/). Data-model validation and WGSL compilers both import that module; data-model must not import `src/shaders/compilation/*` for policy data.

[`src/utils/changeDetection/GraphChangeDetector.ts`](../../src/utils/changeDetection/GraphChangeDetector.ts) assumes **reference equality means no change** (`oldGraph === newGraph`). Any in-place mutation of an object still held by the store would break change detection and incremental compilation.

### Runtime behavior (current)

- **`RuntimeManager.updateParameter`** accepts the graph **after** the store update. It syncs `currentGraph`, calls `compilationManager.setGraph(graph)` when a graph is passed, handles **runtime-only** parameters without touching shader uniforms, and otherwise delegates to `CompilationManager.onParameterChange`. It does **not** write into `node.parameters` on the store’s reference.
- **`CompilationManager`** uses `this.graph` for hashing, connection lookup, and uniform vs recompile decisions; it does not mutate the graph.

## Control flow (stable boundaries)

```mermaid
flowchart LR
  GS[graphStore]
  UI[Svelte UI]
  RT[RuntimeManager]
  CM[CompilationManager]
  W[(compilationWorker)]
  SI[ShaderInstance]
  GL[Renderer / WebGL]

  GS --> UI
  UI -->|callbacks| RT
  RT --> CM
  CM -->|optional postMessage| W
  W -->|CompilationResult| CM
  CM --> SI
  SI --> GL
```

- **Graph → GLSL** may run inside [`src/runtime/compilation/compilationWorker.ts`](../../src/runtime/compilation/compilationWorker.ts) when the app constructs the runtime with node specs for worker init (see [`compilation-worker.md`](./compilation-worker.md)).
- **Program creation, `ShaderInstance`, and drawing** stay on the **main thread** (`applyCompilationResult` in `CompilationManager`).

## Serialization and validation

Supported save/load uses [`src/data-model/serialization.ts`](../../src/data-model/serialization.ts): `serializeGraph` / `deserializeGraph` with format version checks and **`validateGraph`**. Presets and default/local persistence go through this path. New ingest paths (URL loaders, tests) should use the same pipeline so invalid graphs never reach the runtime or compiler.

## Where `src/utils` fits

[`src/utils/`](../../src/utils/) is a **shared helpers** tree (mostly flat modules + `changeDetection/`). Prefer putting new domain ownership elsewhere; use `utils` only for cross-cutting helpers that several layers import.

| Belongs in… | Examples / put new code here when… |
| --- | --- |
| **`src/data-model/`** | Graph types, immutable updates, validation, serialization, connection keys; audio **virtual node** ids ([`virtualNodes.ts`](../../src/data-model/virtualNodes.ts)) |
| **`src/compile-contract/`** | Neutral compile IR / pass-plan / preview-mask types (no runtime or shader imports) |
| **`src/platform-validation/`** | Neutral WebGPU / platform capability allowlists shared by data-model wire validation and compilers (no shader emit imports) |
| **`src/runtime/`** or **`src/shaders/`** | Preview loop, compile scheduling, GLSL/WGSL emission, GPU backends |
| **`src/lib/`** / **`src/ui/`** | Svelte UI components vs canvas engine / interactions |
| **`src/image-export/`**, **`src/video-export/`**, **`src/export/`** | Export orchestration and raster-API user messaging |
| **`src/utils/`** | Pure helpers reused by UI + runtime (no graph mutation): e.g. `changeDetection/GraphChangeDetector.ts`, `driverRemap.ts`, `presetManager.ts`, `ContextualHelpManager.ts`, `errorHandling.ts`, `nodeSpecUtils.ts` |

Do **not** add graph mutators or store actions under `utils`. The legacy `graphComparison.ts` helper was **removed** (arch-perf **01**); use **`GraphChangeDetector`** only.

### Approved `utils` residuals (graph-adjacent)

These stay under `utils` for now (UI + runtime share them; moving would pull automation evaluators or audio interfaces into data-model):

| Module | Why residual |
| --- | --- |
| [`paramDriverBypass.ts`](../../src/utils/paramDriverBypass.ts) | Bypass read/write uses data-model updaters + `automationEvaluator`; keep near other param-driver helpers |
| [`paramPortAudioState.ts`](../../src/utils/paramPortAudioState.ts) | Needs `IAudioManager` (runtime) for live values |
| [`resolveParameterInputMode.ts`](../../src/utils/resolveParameterInputMode.ts) / driver attach helpers | Cross-cut UI, compile, and store paths |

[`src/utils/virtualNodes.ts`](../../src/utils/virtualNodes.ts) is a **re-export shim** only — prefer [`src/data-model/virtualNodes.ts`](../../src/data-model/virtualNodes.ts) (or `data-model` barrel).

## Connection model

`Connection` is defined in `data-model/types.ts`: port targets use `targetPort`; parameter wiring uses `targetParameter`. Validation enforces **exactly one** of those targets and stable dedupe keys via [`src/data-model/connectionUtils.ts`](../../src/data-model/connectionUtils.ts) (`getConnectionTargetKey`, `isPortConnection`). User-visible rules are aligned with [`docs/user-goals/05-connections.md`](../user-goals/05-connections.md).

## Change detection and compilation

Two layers both use graph diffing, for different jobs:

1. **`RuntimeManager`** — Skips heavy work for layout-only changes (`isOnlyPositionChange`), decides cleanup and **immediate** vs debounced recompile for structure changes, and treats some automation edits as not requiring shader recompile.
2. **`CompilationManager.recompile`** — Uses `detectGraphChanges` for **full vs incremental** compile and to maintain metadata for the next comparison.

Incremental compile is used when connections are unchanged, a previous result exists, and the set of affected nodes is small enough; connection changes force a full compile path. When eligible, both GLSL and WebGPU paths may **hash-skip** unchanged codegen (reuse last-good / skip emit) — see [`preview-and-recompilation.md`](./preview-and-recompilation.md) (*Incremental / hash-skip*). Do not assume incremental always full-emits.

### Who calls what (change detection)

- **`GraphChangeDetector`** ([`src/utils/changeDetection/GraphChangeDetector.ts`](../../src/utils/changeDetection/GraphChangeDetector.ts)) — Single implementation of `isOnlyPositionChange`, `detectChanges`, automation-only helpers, and affected-node tracking. Assumes immutable graphs (`oldGraph === newGraph` means no change).
- **`RuntimeManager.setGraph`** — Delegates `isOnlyPositionChange` to `GraphChangeDetector.isOnlyPositionChange`. On non–layout-only edits it calls `GraphChangeDetector.detectChanges` (structure path) and `isOnlyAutomationRegionTimesChange` to drive `CompilationManager.onGraphStructureChange` and audio cleanup. When a structure change is detected, the same `ChangeDetectionResult` is passed into compilation so the compile path does not walk the graph again (arch-perf **07**).
- **`CompilationManager.detectGraphChanges` (private)** — Uses a shared result when provided; otherwise calls `GraphChangeDetector.detectChanges` with `trackAffectedNodes: true` / `includeConnectionIds: true`, then updates `previousGraph` / `previousGraphState` for the next compile. Connection-only edits tighten affected-node sets (endpoints + BFS), not the whole graph.
- **`graphUpdate` (editor)** — [`src/ui/editor/graphUpdate.ts`](../../src/ui/editor/graphUpdate.ts) uses `GraphChangeDetector.detectChanges` after applying a graph patch to invalidate connection layers (incremental UI), not to schedule compilation.

`detectGraphChanges` as a **method name** exists only on **`CompilationManager`** (it wraps `GraphChangeDetector.detectChanges`). There is **no** parallel `graphComparison` helper anymore.

### Edit kind → RuntimeManager vs CompilationManager

Parameter vs structure paths for uniforms and scheduling are detailed in [`parameters-pipeline.md`](./parameters-pipeline.md). This table summarizes **who reacts** after the store has produced a new graph reference:

| Edit kind (store / graph shape) | `RuntimeManager` / `setGraph` | `CompilationManager` expectation |
| --- | --- | --- |
| View-only pan / zoom / selection (`updateViewState`, `recordUndo: false`) | `graphChangedListener` runs for autosave / revision counters; **shader runtime** is not driven by view-only edits alone. | No compile triggered solely from view state. |
| Node **move** only (positions change; same nodes, connections, parameters) | **`isOnlyPositionChange` → true**: skips `applyGraphStructureChange` (no `setGraph` on compiler from this path for layout-only). | No structure recompile from this `setGraph` entry; parameter-only paths unchanged. |
| **Parameter** value change (shader-facing or not) | **`updateParameter`**: syncs `currentGraph` / `setGraph` on compiler; **runtime-only** params return early without uniform compile. | **`onParameterChange`** (uniform refresh vs incremental/full recompile per internal diff). |
| **Connection** add/remove/retarget | **`isOnlyPositionChange` → false**: `applyGraphStructureChange` → `setGraph` + `onGraphStructureChange` (treats connection-only edits as needing compile coordination). | **`recompile`**: connection deltas imply **full** compile path (incremental optimization does not skip connection changes). |
| **Automation** curve / lane / region (non–time-only) | `applyGraphStructureChange`; `onGraphStructureChange` with flags derived from `GraphChangeDetector` (e.g. region time–only vs broader). | Shader includes automation; structure path schedules recompile. |
| **Structure** (add/remove node, type change, bypass, label, reset params, …) | **`isOnlyPositionChange` → false**: full `applyGraphStructureChange` (audio cleanup, `setGraph`, `onGraphStructureChange`). | **`detectGraphChanges`** for incremental vs **full** compile; connection / node sets drive affected nodes. |

## Runtime-only parameters

Some parameters affect **JavaScript-side behavior** (audio file path, analyzer bands, etc.) and must not drive GLSL uniforms. The shared name list lives in [`src/utils/runtimeOnlyParams.ts`](../../src/utils/runtimeOnlyParams.ts) (`isRuntimeOnlyParameter`). **`UniformGenerator`**, **`CompilationManager`**, **`RuntimeManager`**, and export paths each apply this concept; when adding nodes or parameters, keep those places aligned (see also [`parameters-pipeline.md`](./parameters-pipeline.md)).

## Error handling at compile boundaries

Compilation failures (including worker errors) are reported through the shared **`ErrorHandler`** (`CompilationManager` resolves `getErrorHandler()` → injected handler or `globalErrorHandler` from [`src/utils/errorHandling.ts`](../../src/utils/errorHandling.ts)). Failed compiles do not swap in a broken `ShaderInstance`; the previous shader remains active where applicable.

## Store vs Svelte context (design note)

The graph is a **module-level** reactive store so both **Svelte components** and **non-Svelte code** (runtime, canvas TS, export) can access the same SSOT. `setContext`/`getContext` would not alone serve the runtime, which lives outside the component tree; the runtime receives the graph via **`setGraph` / `updateParameter(..., graph)`** callbacks from the app shell. If the product ever needs multiple isolated editors, you would scope graph state per instance (e.g. keyed store or context at a subtree root) **and** still pass that graph into the runtime explicitly.

---

## Appendix A: Historical review notes

Earlier versions of the runtime sometimes wrote into `node.parameters` after the store had already produced a new graph. That duplicated the SSOT and risked breaking reference-equality fast paths. **Those writes are removed**; new code must keep the store → callback → `setGraph` / `onParameterChange` pattern on the **new** reference.

---

## Appendix B: Related docs

- Parameter type matrix and file list: [`parameters-pipeline.md`](./parameters-pipeline.md)
- Recompile scheduling and preview signals: [`preview-and-recompilation.md`](./preview-and-recompilation.md)
- Worker contract: [`compilation-worker.md`](./compilation-worker.md)
