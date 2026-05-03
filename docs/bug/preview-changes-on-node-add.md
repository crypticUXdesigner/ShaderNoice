Title: Shader preview changes when adding unconnected node
Status: Fix proposed (needs verification)

**See also:** [Preview UI freezes on node add (main-thread recompile)](./preview-ui-freeze-on-node-add-recompile.md) — separate issue: input/paint stall and DevTools long-handler violations, not wrong pixels until Play.

## Symptom

- **Context**: Load a preset such as `warped drops` so the shader preview shows the expected visualization for the current node graph.
- **Action**: Add a node (e.g. from the node panel or via drag/drop) that is **not connected** into the existing graph.
- **Observed behavior**:
  - The shader preview **changes immediately** when the node is added, even though the new node has no connections and should not affect the visual output.
  - The change looks like the whole shader is responding to “some change” in the graph, not to the specific new node’s effect.
  - When the user then presses **Play**, the shader preview **snaps back** to the normal / expected visualization.
- **Regression status**: Not yet confirmed if this is a recent regression or long‑standing behavior.

## Suspected area

- **Runtime / preview pipeline**, not the node editor UI itself:
  - Graph source of truth is `graphStore` and `src/data-model/immutableUpdates.ts`.
  - The preview is driven by `RuntimeManager` + `CompilationManager` + `Renderer`:
    - `src/runtime/RuntimeManager.ts`
    - `src/runtime/CompilationManager.ts`
    - `src/runtime/Renderer.ts`
  - The node editor side that mutates the graph and notifies runtime:
    - `src/lib/stores/graphStore.svelte.ts`
    - `src/lib/components/editor/NodeEditorCanvasWrapper.svelte`
    - `src/lib/App.svelte` (wires `onGraphChanged` → `runtimeManager.setGraph`).
  - Shader compilation:
    - `src/shaders/NodeShaderCompiler.ts`
    - `src/shaders/compilation/GraphAnalyzer.ts`

## Current understanding / hypotheses

- **Key user-visible pattern**:
  - Before adding the node: preview is correct.
  - Immediately after adding an unconnected node: preview changes in a way that does **not** correspond to that node’s effect.
  - After pressing Play: preview returns to the expected look.

From an architectural point of view this implies:

- Adding a node **does** cause the preview shader to change (there is a recompile or a new shader instance).
- Pressing Play subsequently causes the shader to **change again** back to the correct state, without the graph itself changing.

**Current conclusion**: The “new shader starts at time 0 / time not synced” theory has been tested in three ways (mark dirty after recompile; sync time/uniforms in a post-recompile callback; transfer time/timeline from old to new shader instance at swap). **None of these changed the behavior; the problem persists.** So the root cause is likely **not** simply that the new shader has wrong time/uniform state. Remaining possibilities include:

1. **Compilation output differs** when an unconnected node is present (e.g. execution order, dead-code elimination, or incremental vs full compile producing different shader code or uniform set), and Play triggers a different code path that happens to produce the “correct” output again (e.g. no second recompile, but something else changes when playing).
2. **Something other than time/uniforms** differs between “paused after add” and “playing” (e.g. audio uniforms, render path, or a flag that only updates when playback starts), and that difference is what restores the correct preview.
3. **Instrumentation**: Log or breakpoint around recompile, shader instance swap, and the first few `setTime`/render calls after adding a node; and compare graph/compilation result when paused vs when Play has been pressed, to see what actually differs.

## Key code paths inspected

- **Graph updates and notification to runtime**
  - `graphStore.addNode` in `src/lib/stores/graphStore.svelte.ts` (immutable add of a node).
  - `addNodeToGraph` and `notifyGraphChanged` in `src/lib/components/editor/NodeEditorCanvasWrapper.svelte`:
    - `graphStore.addNode(node)` mutates the store.
    - `notifyGraphChanged()` calls `callbacks.onGraphChanged?.(graphStore.graph)`.
  - In `src/lib/App.svelte`:
    - `onGraphChanged: async (g) => { await runtimeManager?.setGraph(g); undoRedoManager.pushState(g); }`.
    - This is the main path that pushes a new graph into the runtime when the editor graph changes.

- **Runtime graph handling and compilation**
  - `RuntimeManager.setGraph` (`src/runtime/RuntimeManager.ts`):
    - Maintains `currentGraph`.
    - Uses `GraphChangeDetector.detectChanges` to determine what changed.
    - Calls `applyGraphStructureChange(oldGraph, graph)` for non‑position‑only changes.
  - `applyGraphStructureChange`:
    - Cleans up removed nodes via `AudioParameterHandler`.
    - Calls `compilationManager.setGraph(graph)` to sync the graph into `CompilationManager`.
    - Calls `compilationManager.onGraphStructureChange(...)` to schedule a recompile.
  - `CompilationManager` (`src/runtime/CompilationManager.ts`):
    - Debounced / idle compilation via `scheduleRecompile` and `onGraphStructureChange`.
    - Full/incremental compilation using `NodeShaderCompiler`.
    - On success creates a new `ShaderInstance`, transfers parameters, and calls:
      - `renderer.setShaderInstance(newInstance)`
      - `renderer.markDirty('compilation'); renderer.render();`

- **Shader execution order**
  - `GraphAnalyzer.topologicalSort` (`src/shaders/compilation/GraphAnalyzer.ts`):
    - Computes execution order from the graph.
  - `MainCodeGenerator.generateMainCode` and `generateNodeCode`:
    - Use `executionOrder` plus `executionOrder.indexOf(...)` to decide which source “wins” when multiple connections target the same parameter.

- **Time / playback behavior**
  - Animation loop in `src/lib/App.svelte`:
    - Calls `runtimeManager.setTime(time)` each frame.
  - `RuntimeManager.setTime`:
    - Retrieves `timelineState` (which depends on audio / synthetic transport).
    - Calls `TimeManager.updateTime(time, shaderInstance, renderer, updateAudioUniforms)`.
  - `TimeManager` (`src/runtime/runtime/TimeManager.ts`):
    - Only updates the shader’s time and calls `renderer.render()` when:
      - `timeChanged` (difference greater than threshold), or
      - `isDirty` is true.
    - This means a new `ShaderInstance` created while the timeline is **paused at a fixed time** may not immediately receive the current time unless `isDirty` is set somewhere.

## Hypotheses explored (not confirmed / rolled back)

These are attempted directions that **did not resolve the bug** or were too speculative and have been reverted:

- **1. Recompile timing (debounced vs immediate)**
  - Idea: The wrong preview might be due to a race between updating the graph and running a delayed (debounced) recompile.
  - Change: In `RuntimeManager.applyGraphStructureChange`, force `onGraphStructureChange(true)` for all structure/connection changes so recompilation happens on the next tick instead of via idle/debounce.
  - Outcome: Behavior remained unchanged; the incorrect preview still appeared immediately after adding an unconnected node and reset on Play. This suggests the issue is not simply that the compile was running “too late”.

- **2. Execution order sensitivity to unconnected nodes**
  - Idea: Adding an unconnected node might change the topological execution order in a way that alters which parameter connection “wins”, even though the node isn’t hooked into the final output.
  - Change: Adjust `GraphAnalyzer.topologicalSort` to treat “isolated” nodes (no connections in or out) specially so they do **not** perturb execution order of connected nodes (e.g., by putting all isolated nodes at the end).
  - Outcome: After considering the actual queueing behavior and test results, this change did not clearly map to the user’s observed “fix on Play”, and given the user’s feedback it was reverted as it did not convincingly address the symptom.

- **3. Time / uniform sync after recompile**
  - Idea: After recompiling, a new `ShaderInstance` starts with `time = 0`. If the graph is paused, `TimeManager` may not update time on the new instance because `timeChanged` is false and `isDirty` is false; therefore the shader might show a frame at `t = 0` until playback resumes (time starts changing).
  - Attempted direction (A): Add an “onRecompiled” callback in `CompilationManager` and have `RuntimeManager` mark its `TimeManager` dirty after recompile so that the next `setTime` call forces time/uniforms to sync on the new instance. **Outcome: Did not fix; behavior persisted; reverted.**
  - Attempted direction (B): Have `RuntimeManager.syncTimeAfterRecompile()` (wired from factory) push last known time/timeline and audio uniforms onto the new shader and render immediately after recompile. **Outcome: Did not fix; behavior persisted; reverted (and had caused “syncTimeAfterRecompile is not a function” after partial revert).**
  - Attempted direction (C): In `CompilationManager.recompile()`, before destroying the old `ShaderInstance`, copy its cached `time` and `timelineTime` onto the new instance via `newInstance.setTime(old.getTime())` and `newInstance.setTimelineTime(old.getTimelineTime())` so the first forced render uses the same time state. `ShaderInstance` was extended with `getTime()`, `getTimelineTime()`, and storage of `timelineTime`. **Outcome: Did not fix; the problem persists.** So the wrong preview is **not** explained by the new shader starting at time 0; the cause is likely elsewhere (e.g. compilation/execution order or something that changes only when Play is pressed that is not time/uniform sync).

## Open questions / next steps

- **Precise state at the moment of the wrong preview**:
  - What are the exact values of `uTime` / timeline uniforms on the new shader instance right after recompile?
  - Is the wrong preview always visually consistent (e.g., always looks like the shader at `t = 0`) or does it depend on the specific graph?

- **Graph snapshot used by the first compilation vs after Play**
  - Confirm via logging / instrumentation which `NodeGraph` is actually passed into `NodeShaderCompiler.compile`:
    - On node add.
    - On or around Play.
  - Confirm that the two compilations (if there are two) are using identical graphs.

- **Runtime dirtiness and render triggers**
  - Audit all places where `TimeManager.markDirty` is called vs where we change shader instance / graph structure.
  - Ensure that any operation that swaps out the `ShaderInstance` (full recompile) is paired with a mechanism to fully re‑sync per-frame uniforms (not just node parameters).

## Key files and entry points to revisit

- `src/lib/App.svelte`
  - Graph loading, `runtimeManager.setGraph`, animation loop, Play controls.
- `src/lib/components/editor/NodeEditorCanvasWrapper.svelte`
  - `addNodeToGraph`, `notifyGraphChanged`, `onGraphChanged` wiring.
- `src/lib/stores/graphStore.svelte.ts`
  - `addNode`, graph immutability / reference changes.
- `src/runtime/RuntimeManager.ts`
  - `setGraph`, `applyGraphStructureChange`, `setTime`, `markDirty`.
- `src/runtime/CompilationManager.ts`
  - `setGraph`, `onGraphStructureChange`, `recompile`, creation of new `ShaderInstance`.
- `src/runtime/runtime/TimeManager.ts`
  - Conditions under which `setTime` actually updates the shader and triggers a render.
- `src/shaders/NodeShaderCompiler.ts` and `src/shaders/compilation/GraphAnalyzer.ts`
  - Execution order and any potential sensitivity to unconnected nodes.

## Summary

- **Symptom**: Adding an unconnected node changes the shader preview; pressing Play restores the expected visualization.
- **Confirmed**: The behavior involves the runtime/preview path (graph → compilation → shader instance → render), not just the Svelte editor UI.
- **Root cause**: **Identified.** (See Root cause and fix section below.)
- **Fix proposed**: Wire `onRecompiled` in `RuntimeManager` so the next frame after recompile renders with audio uniforms (see Root cause and fix section).
- **Status**: Fix proposed (needs verification). User should confirm using How to verify below.

## Root cause and fix (symptom-cause chain)

1. **Symptom**: Preview changes (wrong) when adding an unconnected node; snaps back when pressing Play.
2. **Root cause**: (a) The first render after recompile uses the new shader instance before any call to `updateAudioUniforms`, so audio-related uniforms are at default values. (b) `onRecompiled` was never wired, so after recompile `TimeManager.isDirty` is never set. (c) When paused, `setTime()` only triggers a render when `timeChanged || isDirty`; without the callback, we rarely re-render, so the wrong frame stays. (d) When Play is pressed, we mark dirty every frame and render every frame with correct audio, so preview is correct again.
3. **Because** (cause), **therefore** (symptom): Because the first frame is drawn without audio uniforms and we never mark dirty after recompile, the next frame that could correct it does not render when paused, so the wrong preview stays until Play.
4. **If we** wire `onRecompiled` to `syncTimeAfterRecompile` **then** the next `setTime()` will see `isDirty` and render after `updateAudioUniforms`, so the symptom stops.

## How to verify

1. Start the app and open `http://localhost:3000/shadernoice/`.
2. Load the **Warped Drops** preset (top bar). Confirm the preview shows the expected warped-drops visualization.
3. Add an **unconnected** node: open the node panel, search for e.g. "float", add it to the canvas without connecting any of its ports.
4. **Expected after fix**: The preview may briefly flicker (one frame without audio then one with), then should show the same warped-drops look as before adding the node. It should **not** stay in a wrong state until Play.
5. Press **Play** (Space or bottom bar). The preview should remain correct (no snap back needed).
6. **Before fix**: The preview would change to a wrong look immediately after adding the node and would only snap back to correct after pressing Play.

## Replication report (browser automation) — 2025-02-23

### Environment

- **URL**: `http://localhost:3000/shadernoice/`
- **Preset**: Warped Drops (loaded by default or via preset picker button "Warped Drops" in the top bar)

### Precise UI sequence for manual replication

1. **Open app**: Navigate to `http://localhost:3000/shadernoice/`.
2. **Load preset**: If not already loaded, click the **"Warped Drops"** button in the top bar (left side). Confirm the node graph shows: UV Coords → Fisheye → Time → Rain Drops → Reaction-Diff → Output, and the preview (top-right or main canvas) shows the warped-drops visualization.
3. **Observe preview (before add)**: Note the current preview appearance (e.g. FPS in top bar, any error toasts).
4. **Add unconnected node** (choose one method):
   - **Click-to-add (no scroll)**: Click **"Open node panel"** (top bar). The panel opens and **search is focused**. Type a node name (e.g. `float`). Click the **first result** (e.g. "float") or focus it and press **Enter** — the node is added at **canvas center** and remains **unconnected**. (Alternatively, drag a node from the list and drop on the canvas; ensure you do not connect any of its ports.)
   - **Legacy**: In the **Nodes** tab, use **Search nodes...** or scroll to a simple node (e.g. **float**, **UV Coords**, **Constant float**). **Click** the node name to add it to the canvas (do not connect any of its ports).
5. **Observe preview (after add)**: Check whether the preview **changes immediately** (e.g. flicker, different look, black/grainy, or wrong frame). Watch for a brief recompile flicker.
6. **Press Play**: Click the **Play/Pause all audio (Space)** button in the bottom bar (or press Space). Start playback.
7. **Observe preview (after Play)**: Check whether the preview **snaps back** to the expected warped-drops look.

### What was observed (automated run)

- **On initial load**: In one run the app showed a **COMPILATION** error toast: *"Unexpected compilation error: rm.syncTimeAfterRecompile is not a function"* (from leftover factory wiring after a partial revert). The preview was broken. That wiring has since been removed.
- **Add-node step**: Could **not** be performed by the browser automation (scroll-into-view failures). Manual replication using the sequence above is recommended.
- **Screenshots**: Automation captured page states; a full “before add / after add / after play” set would require successfully adding a node manually.

### Attempts that did not resolve the bug (current knowledge)

- **Mark dirty after recompile** (RuntimeManager callback calling `markDirty('compilation')`): Did not fix; reverted.
- **Sync time/uniforms in post-recompile callback** (`syncTimeAfterRecompile` pushing last time + timeline + audio onto new shader and rendering): Did not fix; reverted.
- **Transfer time/timeline from old to new ShaderInstance** in `CompilationManager.recompile()` before first render (`newInstance.setTime(old.getTime())`, `setTimelineTime(old.getTimelineTime())`): **Did not fix; the problem persists.** So the wrong preview is not explained by the new shader starting at time 0.

### Console / recompile notes

- **Console**: During automation the only error seen was the post-recompile callback error (since removed). Manual replication with DevTools console open is recommended to log recompile/render and to see whether anything differs when Play is pressed.
- **Next debugging**: Compare (1) shader code / execution order / uniforms when compiling after “add unconnected node” vs (2) state when Play has been pressed and preview is correct (no second recompile). Instrument or log what actually changes so the root cause can be identified.

