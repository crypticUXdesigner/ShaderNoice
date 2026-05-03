# Primitives (box-torus-sdf): Size X shows live animated values but preview looks static

| Field | Value |
| --- | --- |
| **Status** | Open (reporter still sees mismatch after related compiler/runtime fixes) |
| **Subsystem** | Shader compilation, parameter wiring, preview / WebGL |
| **Last investigated** | 2026-05-03 |
| **Graph invariant** | Graph is immutable in `src/data-model/`; runtime and compiler read it only. |

---

## Symptom

- **Setup:** `mixed-wave-signal` → `multiply` → parameter **`primitiveSizeX`** (Size X) on node **`box-torus-sdf`** (UI label **Primitives**).
- **Observed:** The **parameter UI / live value** reflects the signal (moves over time as expected).
- **Observed:** The **rendered preview** behaves as if **Size X were fixed** (often described as ~0, “static,” or ignoring the wire), **not** matching the live value.
- **Noted:** Little or **no useful console output** for this scenario (no obvious `[NodeShaderCompiler] Variable … Replacing with 0.0` lines when the user looked), which made early diagnosis harder.

Same node, same parameter, same graph topology can still present this split: **CPU-tracked value** vs **GPU shader behavior**.

---

## Why “live moves” but the shader might not (architecture, no codebase required)

The editor computes **floating-point parameter previews** (tooltips, sliders, “live” readouts) on the **CPU** by walking the graph: see `src/utils/parameterValueCalculator*.ts` and `src/utils/mixedWaveSignalPreview.ts` (mixed wave uses a JS mirror of the GLSL math; time is aligned with preview via `getShaderTimeSeconds()` / app time).

The **GPU preview** uses a **compiled fragment shader**: node `mainCode`, global output variables, and **`functions`** blocks (e.g. `sceneSDF`) are stitched together in `src/shaders/NodeShaderCompiler.ts` and related modules. **Float parameters that drive code inside `functions`** are inlined via **`buildFloatParamExpressions`** (not only via uniforms).

So a **correct split-brain** is possible whenever:

1. **CPU path** sees the connection and evaluates the chain correctly, but  
2. **GPU path** embeds a **different** expression (e.g. literal `0.0`, stale `0.0` substitution, wrong variable, wrong order, wrong SDF entrypoint), or  
3. **GPU path** never receives a **recompiled** program (stale `ShaderInstance`), or  
4. **Different subgraph** is used for generic raymarcher vs full-screen Primitives (see below).

---

## Verified root causes (fixed in codebase as of investigation)

These were **real defects** in the compilation pipeline; they explain **classes** of “static GPU / animated UI” without console noise.

### A. Generic-raymarcher + Primitives SDF port: inlined distance was wrong

**File:** `src/shaders/compilation/MainCodeGeneratorRaymarcher.ts` (`buildGenericRaymarcherSdfFunction`, `getOutputExpressionAtPosition`).

**Issue:** The helper tried to parse **`$output.<name> = …;`** from `mainCode` to build `float generic_raymarcher_sdf_<id>(vec3 p) { return <expr>; }`. **`box-torus-sdf`** only uses **`$output.out += …`** (no direct `$output.out = …`), so parsing **failed** and the SDF body fell back to a **constant `1000.0`**-style sentinel (“empty” distance field). **No** `FunctionGenerator` “replace with 0.0” warning necessarily fires.

**Fix direction:** If there is no `$output.<name> =` assignment but `functions` defines `sceneSDF(vec3 …)`, emit a call to the **node-specific** `sceneSDF_* (p)` after renames (see `FunctionGenerator` / `functionNameMap`).

**Regression test:** `src/shaders/NodeShaderCompiler.test.ts` — “uses sceneSDF for generic-raymarcher when SDF source is box-torus …”.

**Relevance to reporter:** If the preview path uses **generic-raymarcher** feeding **Primitives** on the **`sdf`** port, this bug alone could cause a **static-looking** or empty SDF while panel math still “lives.” If the graph is **only** UV → Primitives → color-map → final-output (no generic-raymarcher), this specific bug does **not** apply.

### B. Float param wiring in `functions` vs `mainCode`: two different rules

**Files:** `src/shaders/compilation/FloatParamExpressions.ts`, `src/shaders/compilation/MainCodeGeneratorNodeCode.ts`.

**Issue:** `MainCodeGeneratorNodeCode` resolved float **parameter connections** using **execution order** and tie-breaking when multiple wires target the same float. **`buildFloatParamExpressions`** (used to replace **`$param.*` inside `nodeSpec.functions`**, e.g. inside `sceneSDF`) iterated connections in array order and could **diverge**; it also skipped some cases when variable-name maps were missing where main codegen would fall back to a generated name.

**Fix direction:** Shared helper **`resolveFloatParameterInputVarsFromConnections`** (`src/shaders/compilation/resolveFloatParameterInputVarsFromConnections.ts`); **`buildFloatParamExpressions`** now takes **`executionOrder`**; **`FunctionGenerator.collectAndDeduplicateFunctions`** receives that order from `NodeShaderCompiler`.

### C. Compilation worker: success handler ignored `metadata.errors`

**File:** `src/runtime/CompilationManager.ts`.

**Issue:** Main-thread compile bailed out when `metadata.errors` was non-empty; the worker’s deferred apply path could still try to build a `ShaderInstance` without the same guard.

**Fix direction:** Mirror the main-thread check before `applyCompilationResult`.

### D. Earlier FloatParam “cleanup” that dropped valid wires (historical)

**File:** `src/shaders/compilation/FloatParamExpressions.ts` (prior behavior).

**Issue:** Validation could **remove** a float param’s wired expression when a ref looked “invalid,” leaving **`$param.*`** to be replaced by **`0.0`** in a later cleanup pass inside **`FunctionGenerator`**, while CPU preview still read the graph. That matched “UI shows signal, SDF sees zero” **with** possible `[NodeShaderCompiler] Variable … Replacing with 0.0` logs.

**Fix direction:** Stop dropping the mapping on false positives; rely on `FunctionGenerator`’s safety pass and warnings.

---

## Remaining hypotheses (if symptom persists after the above)

Use these to narrow a **still-open** report without re-guessing the whole system.

1. **Wrong preview subgraph:** Confirm whether the visible preview uses **generic-raymarcher** + **`sdf`** from Primitives vs **direct** Primitives → color-map. Different code paths (see A).
2. **Stale shader on graph sync:** Trace `RuntimeManager.setGraph` (`oldGraph === graph` early return), `CompilationManager` debounce / worker `compileId`, and `applyCompilationResult` — a rare race could leave an **older** program linked while the store already has the new connection.
3. **Multiply input B:** `multiply` is `a * b` with **`b`** defaulting to `1.0` when unwired. If **`a`** is wired but **`b`** is effectively `0` in GLSL (different from CPU), product is **0** → tiny box. Compare **CPU** `getInputValue` for multiply vs generated main lines for the same node id.
4. **Incremental compile edge case:** `compileIncremental` in `NodeShaderCompiler.ts` — if a future change regresses, wrong reuse could desync `functions` vs `mainCode` (mitigated by shared resolver + tests; still a place to look if incremental is disabled/fails silently).
5. **WebGL / precision:** Unlikely to explain “fully static” vs animated UI alone, but extreme scales can make geometry **look** pegged; compare orders of magnitude from live value readout vs GLSL after `vec3(sizeX, …)` in emitted `sceneSDF` chunk.

---

## Minimal repro (for engineers with the app)

1. Add **Mixed Wave**, **Multiply**, **Primitives** (`box-torus-sdf`).
2. Connect **Mixed Wave `out`** → **Multiply `a`** (or equivalent valid float chain).
3. Ensure **Multiply `b`** is intentional (default `1.0` or a known value).
4. Connect **Multiply `out`** → **Primitives** parameter **Size X** (`primitiveSizeX`).
5. Optionally add **UV** → **Primitives `in`**, **Primitives `out`** → **color-map** → **final-output** (common 2D preview path).
6. Optionally add **generic-raymarcher** with **Primitives** on **`sdf`** port (3D raymarch path).

**Expect:** Preview size tracks the same motion as the Size X live readout.  
**Failure:** Live readout animates; preview does not.

---

## Debug recipe (shareable checklist)

1. **Confirm graph on wire:** Export graph JSON or inspect `connections` for `targetParameter: 'primitiveSizeX'` and correct `sourceNodeId` / `sourcePort: 'out'`.
2. **Dump compiled shader (or slice):** After compile, search generated source for:
   - **`sceneSDF`** / **`sceneSDF_`** (node-suffixed names after dedup),
   - **`sdBox`** / **`vec3(`** branch for box primitive,
   - The **multiply** output variable name pattern **`node_<id>_out`** inside that chunk.
3. **Execution order:** Inspect `result.metadata.executionOrder` (compiler output) or equivalent logs — **multiply** must appear **before** **Primitives** so `node_*_out` is written before `sceneSDF` runs in the same frame’s `main()`.
4. **If generic-raymarcher is involved:** Confirm `float generic_raymarcher_sdf_<id>(vec3 p)` returns **`sceneSDF_…(p)`**, not a constant sentinel.
5. **Runtime:** Confirm `loadGraph` / `setGraph` runs after connect (App → `runtimeDispatcher.loadGraph`); confirm no silent compile failure (toasts / `metadata.errors`).
6. **Console:** Search for **`[NodeShaderCompiler] Variable`** and **`Replacing with 0.0`** — if present, a **`node_*`** ref in `functions` was not in the emitted output set (name mismatch or order bug).

---

## Key files (orientation map)

| Area | Path (approx.) |
| --- | --- |
| Compiler orchestration | `src/shaders/NodeShaderCompiler.ts` |
| Float param → GLSL in `functions` | `src/shaders/compilation/FloatParamExpressions.ts` |
| Shared param wire resolution | `src/shaders/compilation/resolveFloatParameterInputVarsFromConnections.ts` |
| Main codegen per node | `src/shaders/compilation/MainCodeGeneratorNodeCode.ts` |
| `functions` dedupe / `$param` / `node_*` safety | `src/shaders/compilation/FunctionGenerator.ts` |
| Generic raymarcher SDF bridge | `src/shaders/compilation/MainCodeGeneratorRaymarcher.ts`, `MainCodeGenerator.ts` |
| Primitives node spec (Size X, `sceneSDF`, `mainCode`) | `src/shaders/nodes/box-torus-sdf.ts` |
| CPU live parameter / signal evaluation | `src/utils/parameterValueCalculator.ts`, `parameterValueCalculatorInput.ts`, `mixedWaveSignalPreview.ts` |
| Runtime compile / worker apply | `src/runtime/CompilationManager.ts`, `src/runtime/compilation/compilationWorker.ts`, `src/runtime/RuntimeManager.ts`, `src/runtime/RuntimeMessageDispatcher.ts` |
| Graph → runtime sync (high level) | `src/lib/App.svelte`, `src/lib/components/editor/NodeEditorCanvasWrapper.svelte` |
| Compiler regression tests | `src/shaders/NodeShaderCompiler.test.ts` (box-torus + param wire; generic-raymarcher + box-torus) |

---

## Related product docs

- **`docs/user-goals/`** — behavior expectations for canvas / parameters / preview (align fixes with the relevant doc).
- **`docs/architecture/`** — graph vs runtime vs compilation boundaries (`README.md`, preview/compilation notes if present).

---

## Notes for external reviewers

- The bug is fundamentally a **dual evaluation** problem: **interpreted / CPU** graph walk for UI vs **compiled / GPU** pipeline. Any fix must keep those **semantically aligned** for wired float params that appear inside **`functions`** (not only uniforms).
- **“No logs”** does not prove “no substitution”; some fallbacks use **constants** or **silent** codegen paths (see generic-raymarcher A).
- If you only have screenshots: ask for **graph topology** (with/without generic-raymarcher), **one exported shader snippet** around `sceneSDF`, and **`executionOrder`**.
