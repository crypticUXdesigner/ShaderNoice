# Preview, recompilation, and graph updates

**Last updated:** 2026-05

This document describes **how graph and structure changes reach the runtime**, how **`CompilationManager`** schedules full compiles vs fast paths, and how **`PreviewScheduler`** records signals for debugging and future scheduling work. For the parameter-specific path, see [`parameters-pipeline.md`](./parameters-pipeline.md). For worker offload of GLSL generation, see [`compilation-worker.md`](./compilation-worker.md).

## Single path: store → App → runtime

Graph structure changes (nodes, connections, non–position-only view changes, etc.) follow one route:

1. **UI** — e.g. [`NodeEditorCanvasWrapper.svelte`](../../src/lib/components/editor/NodeEditorCanvasWrapper.svelte): user action → `graphStore.*` mutator → `notifyGraphChanged()` → `callbacks.onGraphChanged(graphStore.graph)`.
2. **App** — `onGraphChanged` awaits `runtimeManager?.setGraph(g)` and integrates undo/redo snapshots.
3. **`RuntimeManager.setGraph`** — If the change is not **position-only** for the runtime, applies structure change handling, then `compilationManager.setGraph(graph)` and `compilationManager.onGraphStructureChange(immediate)`.

The canvas does **not** call legacy hooks such as `onNodeAdded` / `onConnectionAdded` separately for the same edits; structure is conveyed entirely through **`setGraph`**.

## Graph ownership at runtime

- **`RuntimeManager`** holds `currentGraph` and passes updates into **`CompilationManager.setGraph`**.
- **`CompilationManager`** holds `this.graph` for `recompile()` and `onParameterChange()`.

With immutable updates, the reference passed into `setGraph` is always the latest snapshot; nothing mutates that object in place for preview purposes.

## Change detection (two roles)

1. **`RuntimeManager`** — Decides whether to skip work (`isOnlyPositionChange`), what cleanup to run, and whether to ask for an **immediate** recompile path (`onGraphStructureChange(true)`) vs a debounced one (`false`). Treats some automation edits as not requiring shader recompile.
2. **`CompilationManager.recompile`** — Uses `detectGraphChanges(this.graph)` for **full vs incremental** compilation and to update cached metadata for the next run.

## Compilation scheduling (current code)

| Trigger | Behavior (simplified) |
| --- | --- |
| Structure change, `immediate === false` | `scheduleRecompile()` — cancels pending work, then uses **`requestIdleCallback`** when available (with timeout matching compile debounce), else **`setTimeout`** — callback runs **`recompile()`** |
| Structure change, `immediate === true` | Cancels pending, **`setTimeout(0)`** → `recompile()` (e.g. connections-only, audio setup updates) |
| Parameter change | `onParameterChange` — graph hash / value type decide **recompile** vs **`scheduleParameterUpdate`** (uniforms + **`requestAnimationFrame`** batch for render) |
| Audio setup change | Treated as structure-sensitive; uses the **immediate** path |

**Parameter-only updates** apply uniforms immediately and coalesce **one render per frame** via `requestAnimationFrame`.

### `PreviewScheduler` (instrumentation and future contract)

[`src/runtime/PreviewScheduler.ts`](../../src/runtime/PreviewScheduler.ts) records dirty reasons, compile phase transitions, and optional adaptive-preview flags. It is wired from [`Renderer.ts`](../../src/runtime/Renderer.ts) and [`CompilationManager.ts`](../../src/runtime/CompilationManager.ts). The default mode is still largely a **telemetry / skeleton** layer relative to presentation cadence; deeper scheduling behavior is tracked under [`docs/implementation/`](../implementation/) (live preview performance work package).

**Adaptive preview (P2) toggle:** how to turn it on (`localStorage` + dev API) is documented in [`adaptive-preview-p2-toggle.md`](./adaptive-preview-p2-toggle.md).

## Reliability properties (current)

- **Latest graph for compile** — When a scheduled recompile runs, it reads **`this.graph`**, which reflects the last `setGraph`. Rapid edits cancel and reschedule; the callback is intended to see the latest graph.
- **Parameter + graph consistency** — `updateParameter(..., graph)` updates `CompilationManager`’s graph before `onParameterChange` uses hashes of `this.graph`.
- **Errors** — Failed compile does not replace the active `ShaderInstance` with a broken one; errors go through the shared error handler.
- **Context loss** — `recompile()` bails early when the GL context is lost; restore flows use dedicated APIs.

## Worker interaction

When a compilation worker is attached, **`recompile()`** posts a message and returns; **`applyCompilationResult`** runs on the main thread when the result arrives. Stale replies are ignored via a monotonic compile id. Details: [`compilation-worker.md`](./compilation-worker.md).

---

## Appendix A: Historical review notes

An internal review noted that **`requestIdleCallback`** is meant for short idle work while **`recompile()`** can be heavy (full or incremental compile + `ShaderInstance` setup + transfer + render). Whether to move the long task out of the idle callback is a **scheduling / performance** decision; see [`docs/implementation/`](../implementation/) for active tuning notes. Behavior described above matches **current** `CompilationManager` implementation.

---

## Appendix B: Optional API cleanup

`RuntimeManager` still exposes `onNodeAdded` / `onConnectionAdded` / etc. for hypothetical alternate callers; the **primary** editor path does not use them. They can remain for compatibility or be removed in a dedicated refactor with call-site audit.
