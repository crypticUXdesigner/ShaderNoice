# Preview UI freezes when adding a node (main-thread compile/link)

**Status:** Resolved

## Symptom

- **Product surface:** ShaderNoice node editor — central **shader preview** (WebGL canvas) and overall **shell UI** (panels, canvas chrome, bottom bar).
- **User flow:** Add a node to the graph (e.g. **Add** tool with Alt+click on empty canvas and pick a type, or add from the node panel / palette). The new node may be tiny (e.g. a Float / constant) or disconnected.
- **Actual:** The app **stops responding** for a noticeable period (hundreds of milliseconds). Input, scrolling, and paint feel **frozen**, then everything resumes.
- **Expected:** The editor should stay **visibly responsive** while work completes, or at minimum the stall should be short enough not to feel like a full UI freeze.

## Evidence (paste-friendly; no repo required)

**Browser DevTools (Chromium), Console:**

- Earlier investigation showed long handlers on the compilation path, e.g.  
  `[Violation] 'message' handler took ~594ms`  
  when the **compilation Web Worker** returned a successful compile result and the main thread applied it.

- After deferring apply work off the worker message handler, the label shifts to the next synchronous host, e.g.  
  `[Violation] 'requestAnimationFrame' handler took ~658ms`  
  Same **order of magnitude** stall; the expensive work moved **into** the `requestAnimationFrame` callback instead of staying inside `worker.onmessage`.

**Interpretation (for triage):** These violations mean a **single JavaScript turn** (or one rAF tick) ran for hundreds of milliseconds on the **main thread**, blocking the event loop — hence “whole UI freezes,” not only the preview canvas.

## Environment

- **Typical:** Chromium-based browser, desktop, local dev or static hosting (e.g. GitHub Pages) — wherever WebGL2 preview runs.
- **When it shows:** After a **graph structure** change that triggers a **preview recompile** (add/remove node, many connection edits), not for pure pan/zoom of nodes alone.

## Repro (minimal)

1. Open ShaderNoice with any non-trivial graph (preset is fine).
2. Open DevTools → **Console** (Violations visible).
3. Add a node (e.g. **Add** tool + empty-canvas click + pick **Float**, or equivalent).
4. **Observe:** UI freeze; console may report a **long handler** violation (`message` and/or `requestAnimationFrame`) in the same ballpark as the felt freeze.

**Data:** Reproduces with **small** or **disconnected** nodes — the stall is **not** proportional to “how big” the new node looks in the graph UI. That matches a **full preview pipeline** recompile/link, not just “drawing one more node box.”

## Root cause (verified)

**Preview = one WebGL2 program built from the whole graph** (full-screen fragment pipeline). When the graph changes in a way that invalidates that program:

1. **GLSL generation** can run in a **Web Worker** (`compilationWorker.ts` posts a `result` back).
2. **Applying** the result on the main thread builds a new **`ShaderInstance`**: compile shaders in the driver, **link** the program, wire uniforms, then **render**. In our current architecture (DOM-owned canvas + main-thread WebGL), that GL work runs on the main thread. (Note: WebGL can run in a worker via `OffscreenCanvas`, but that would be a renderer migration.)

So the dominant cost is **GPU/driver program link + first use**, not “Svelte drawing the new node card.” Incremental **shader source** strategies reduce how often you fall back or how big the string is, but **any** new program link for a full graph can still cost hundreds of ms on the main thread.

**Tiny excerpt (conceptual):** Worker replies → main thread applies result → `new ShaderInstance(gl, result)` → `linkProgram` → `renderer.render()` — all synchronous in one callback path.

## Key files (role each)

| File | Role for this bug |
| --- | --- |
| `src/runtime/CompilationManager.ts` | Owns **when** to recompile, worker vs main thread, **`applyCompilationResult`** (swap `ShaderInstance`, mark dirty, render). Defers worker `result` apply to **`requestAnimationFrame`** so the violation label moves from `message` to `rAF` without removing wall time. |
| `src/runtime/ShaderInstance.ts` | **Main-thread hotspot:** creates WebGL program, **`linkProgram`**, uniform discovery — what the driver charges for after codegen. |
| `src/runtime/compilation/compilationWorker.ts` | Runs **`NodeShaderCompiler`** off-thread; reply still triggers main-thread apply. |
| `src/shaders/NodeShaderCompiler.ts` | Builds **full** GLSL for the graph; “incremental” path here is mostly **eligibility / safety**, not skipping full program size for every graph change. |
| `src/lib/components/editor/NodeEditorCanvasWrapper.svelte` | **`addNodeToGraph` / `notifyGraphChanged`** — editor notifies app that graph changed. |
| `src/lib/App.svelte` | **`onGraphChanged` → `loadGraph` / `setGraph`** — pushes graph into runtime and triggers compile scheduling. |

## Related bug (different symptom)

- **`docs/bug/preview-changes-on-node-add.md`** — preview **pixels** wrong after adding an **unconnected** node until **Play**; time/uniform sync hypotheses. **This doc** is about **UI responsiveness / main-thread duration** on add/recompile, not (primarily) wrong final color.

## What we already tried (still feels frozen)

- Defer **`applyCompilationResult`** from **`worker.onmessage`** to **`requestAnimationFrame`** — reduces **long `message` handler** noise; **does not** shorten the **link** phase; violation often appears as **long `rAF` handler** instead.
- Broader **`tryIncremental`** / execution-order rules in **`NodeShaderCompiler.compileIncremental`** and **`CompilationManager`** — helps **when** the worker uses incremental vs full **codegen** path; **does not** remove the need to **link a new full-screen program** on the main thread when the shader changes.

## Fix (landed)

- **Skip preview recompiles for idle graph edits**: edits that do not affect the upstream dependency slice feeding `final-output` (disconnected nodes, idle-only connections, idle param changes) no longer trigger compile/apply.
- **Coalesce structural edits**: multiple rapid structural changes schedule a single compile kick (including cancelable double-rAF “toast paint” deferrals).
- **Program cache by shader source**: bounded LRU+refcount cache avoids repeated relink stalls when revisiting prior graph states (undo/redo, toggles).
- **Optional `KHR_parallel_shader_compile` path**: when available, defer `LINK_STATUS` queries until `COMPLETION_STATUS_KHR` reports ready, and retry apply on later frames instead of blocking a single long task.

**Outcome:** violation logs stopped and the editor no longer exhibits the prior 0.5–1s UI freeze during common edit flows.

## Hypotheses / opinions wanted (external readers)

1. **Acceptance:** Is “~0.5–1s main-thread stall on structural edit” acceptable for this product class, or is a hard UX target required (e.g. &lt;100ms input response)?
2. **Instrumentation:** Should we standardize **marks / timestamps** (worker end → rAF start → link end → first present) and publish **median p95** in the bug for decision-making?
3. **UX without fixing wall time:** Can we show a **“Updating preview…”** state only if we **paint one frame before** posting compile / before heavy rAF (knowing toasts won’t draw during a blocked rAF)?
4. **Architectural:** Is any **future** split (e.g. smaller preview shader, cached program keyed by hash, WebGPU) on the roadmap, or is the answer “WebGL2 full-graph preview = occasional long main-thread tasks”?

## Debug recipe (for someone with the repo)

1. Performance tab: record one **add node**; find long **task** on main thread; expand to **`ShaderInstance` / `linkProgram` / `compileShader`**.
2. Console: confirm **`requestAnimationFrame`** or **`message`** violation timing vs that task.
3. Optionally: compare **shader source length** before/after add (same graph family) to see if incremental path still emits **full** program size.
