# Arrangement snapshot nodes — preview unusable when wired into Blend on heavy graphs

**Status:** Mitigated (partial) — shipped 2026-06-04 (WebGL reachability parity + WebGPU blend/fragment `let` bindings)

## Background

**ShaderNoice** is a node-based shader editor: users wire **nodes** on a canvas; a **preview** panel shows the live image driven by a compiled GPU program. **Notes** (`arrangement-notes`) draws MIDI notes from an imported **arrangement snapshot** (playlist timeline data baked at compile time). **Blend** composes two color inputs with Photoshop-style modes. Wiring **Notes → Blend → … → Final Output** puts the notes renderer on the **hot path** to the preview image.

**Scope:** Same failure class confirmed for other arrangement snapshot nodes that bake heavy eval helpers and feed **Blend** on the path to **Final Output** — **`pitch-class-compass` (Pitch Wheel)**, **`chord-voronoi-bloom`** (~200 notes, one track, long timeline), and likely other **pattern** nodes (`note-ripple-field`, …) when composited through deep blend chains.

### Default preview backend

Editor preview defaults to **WebGL2**, not WebGPU. `createRuntimeManager` uses `renderBackend ?? 'webgl'` (`src/runtime/factories.ts`); only an explicit URL flag overrides this (`?renderBackend=webgpu|webgl|auto`). **`auto`** picks WebGPU when `navigator.gpu` is present; **no query param → WebGL**. Most users hit **§2 (runtime hot path)** below, not WebGPU string-limit compile failures.

## Symptom

1. Load a preset with a dense arrangement snapshot and a heavy node stack (many **Blend** nodes, pattern/MIDI-driven nodes).
2. Place **Notes** fed by **UV Coordinates**; connect **Notes → Color** into a **Blend** port that feeds **Final Output** (directly or through downstream blends).
3. Preview FPS collapses to single digits or the tab becomes unresponsive; disconnecting that wire restores usable preview.

**Expected:** Preview remains interactive; Notes layer composes at modest cost.

**Actual:** Preview is extremely slow or frozen while the wire is connected.

**Environment:** Reproduced during investigation with preset `3x-midi-env-perf (1).json` (8192-note snapshot cap, 553 notes baked after track filter, 14 Blend nodes on output path). **WebGL (default):** compile succeeds (~410 KB fragment) but preview FPS collapses when Notes is on the output chain. **WebGPU (`?renderBackend=webgpu`):** compile throws `RangeError: Invalid string length` during codegen on the same graph.

**Also reported:** **Chord Voronoi Bloom** → **Blend** on a lighter graph (one track, ~200 notes) — preview freeze with default WebGL preview. **Pitch Wheel** (`pitch-class-compass`) → **Blend** — same failure class (user-confirmed sibling; compile-time pitch-class bake + per-pixel 12-sector loop).

## Mitigation (shipped 2026-06-04)

Shipped mitigations addressed **Recommended fixes 1** and **3**:

| Fix | Shipped | Effect |
| --- | --- | --- |
| **1 — WebGL reachability parity** | ✅ Task **01** | Shared `computeUpstreamReachableNodeIds`; WebGL `MainCodeGenerator` + `FunctionGenerator` skip main codegen and bake helpers for nodes **not** upstream of `final-output`. Unwired arrangement/pattern nodes no longer execute every pixel or inflate the fragment shader. |
| **3 — WebGPU fragment `let` bindings** | ✅ Tasks **02A** + **02B** | `emitWgslBlendNode` binds base/src once per blend; `WgslMvpCompiler` emits per-reachable-node `let node_<id>_<port>` in fragment prelude. Deep blend chains + arrangement nodes compile without `RangeError: Invalid string length`. |
| **2 — Separate-pass composite** | ⬜ Deferred | When an arrangement node **is** wired into the output chain, per-pixel eval cost remains on **default WebGL**. Requires render-to-texture once per frame — new work package if connected-chain perf is still unacceptable. |

**Regression tests:** `computeUpstreamReachableNodeIds.test.ts`; `NodeShaderCompiler.test.ts` — `GLSL upstream reachability`, `WGSL blend let bindings` (shared `buildDeepBlendArrangementChainGraph` fixture for 5/14-blend WebGPU chains).

## Root cause

Two stacked mechanisms; **which one dominates depends on render backend** (see Default preview backend above).

### 1. WebGPU MVP: entire fragment shader is one inlined expression (WebGPU-only; not default path)

The WebGPU compiler emits a fragment entry point that **returns one giant expression** built by recursively inlining every reachable node's `.code` string — no per-node `let` bindings like WebGL's main body.

```wgsl
@fragment
fn fs(in : VsOut) -> @location(0) vec4<f32> {
  return ${colorVec4};  // full upstream tree inlined here
}
```

Each **Blend** node then **re-embeds** its `base` and `blend` input expressions once **per RGBA channel** in `blendPerComponent`:

```typescript
// wgslBlendNode.ts — base.code and blend.code repeated per component
`applyBlendMode((${base.code}).x, (${blend.code}).x, ${mode})`
```

With **N blend nodes** chained, expression size grows **multiplicatively** (roughly exponential in depth), not linearly. When **Notes** enters the reachable set from `final-output`, its `evalArrangementNotes_*()` call (553-note const arrays + per-pixel loop) is folded into that tree.

**Evidence:** Compiling the repro preset with `{ backend: 'webgpu' }` throws:

`RangeError: Invalid string length` at `wgslBlendNode.ts` → `blendPerComponent` → `parts.join(', ')`.

When **Notes** is **not** upstream of output (wire removed), WebGPU's `computeUpstreamReachableNodeIds` drops it from the shader — but this preset's blend stack can still hit the same string limit without Notes; adding Notes makes the failure certain.

### 2. Runtime: per-pixel arrangement eval on the output hot path (**primary on default WebGL**)

When wired into **Blend → Final Output**, the arrangement node's baked eval runs **every pixel, every frame**. WebGL avoids duplicating the eval expression through blend chains (per-node variables in `MainCodeGenerator`), but does **not** skip executing it on the hot path.

#### Arrangement Notes

**Notes** evaluates baked MIDI data **per pixel** in a loop bounded by preview uniforms `noteLoopStart` / `noteLoopEnd` (updated each frame by `applyArrangementNotesLoopUniforms`). For the repro preset:

| Metric | Value |
|--------|-------|
| Snapshot notes (importer cap) | 8192 |
| Baked notes (2-track filter) | 553 |
| Preview loop budget | 512 |
| Worst-case loop span (12 s window, scrubbed) | **71 notes/pixel** |

That clamp works as designed (not a full 553-note scan), but **71 iterations × fullscreen × 14-blend stack × pattern nodes** is still heavy when the notes layer is composited into output (Exclusion blend, mode 11, on vec4 in the repro).

On **WebGL** (post-fix), unwired arrangement nodes are **omitted** from codegen via reachability; when **connected**, `node_*_out` feeds the blend chain and the note eval runs every pixel on the hot path.

#### Chord Voronoi Bloom (confirmed sibling)

Uses **time-binned pitch-class energy** (`packArrangementNotePatternData`), not a per-pixel note list. Bake size is driven by **timeline duration**, not note count: a ~150 s arrangement yields **341 time bins** and **1023 vec4** PC constants (near `MAX_PATTERN_PC_BAKE_VEC4S`) whether the track has ~200 or ~800 notes.

Per pixel: outer loop over **12 pitch classes**; each calls `chordVoronoiPcEnergyAt` (release-window bin scan, cap **64** bins) plus Voronoi distance — no preview loop budget like Notes' `noteLoopStart` / `noteLoopEnd`.

Synthetic compile measurements (150 s timeline, bloom on blend port, vec4 Exclusion chain):

| Blends wired | WebGL shader | WebGPU |
| --- | --- | --- |
| 0 (direct to output) | ~85–106 KB, compiles | ~93–116 KB, compiles |
| 5 | ~98 KB, **2×** eval in source | ~1.8 MB, **972×** eval inlined in `fs` return (pre-fix) |
| 14 | ~104–125 KB, compiles | **`RangeError: Invalid string length`** (pre-fix); compiles post-fix |

## Evidence

| Observation | Detail |
| --- | --- |
| Preset graph | 47 nodes, 14 `blend`, 1 `arrangement-notes`, 18 MIDI envelope bindings |
| WebGPU compile | `RangeError: Invalid string length` in `wgslBlendNode.ts` (connected and disconnected wire variants both failed in investigation; fixed post **02A/02B**) |
| WebGL compile | ~409 KB fragment shader; connected vs disconnected differ by ~300 bytes pre-fix; post-fix unwired nodes omit `eval*` |
| Note loop clamp | `findNoteIndexRangeForWindow` + `clampNoteLoopRangeForPreviewBudget` → max **71** loop iterations at worst timeline sample |
| Reachability | WebGPU skips non-upstream nodes: `for (nodeId of executionOrder) { if (!reachable.has(nodeId)) continue; }` in `WgslMvpCompiler.ts`; WebGL parity post **01** |
| Default backend | No URL param → `webgl` in `src/runtime/factories.ts`; user reports match WebGL runtime path |
| Chord Voronoi Bloom | Same blend-chain freeze on WebGL; WebGPU `Invalid string length` at 14 blends with 200-note / 150 s synthetic graph (pre-fix) |
| Pitch Wheel (`pitch-class-compass`) | User-confirmed same class; unwired compass omitted from GLSL post-fix; wired + deep blend still heavy on WebGL |
| Post-fix WebGL reachability | Unwired `arrangement-notes` / `pitch-class-compass` omit `eval*` from fragment shader when noise feeds `final-output` |
| Post-fix WebGPU compile | 14-blend + `arrangement-notes` / `chord-voronoi-bloom` graphs compile under 500 KB WGSL (`NodeShaderCompiler.test.ts`) |

## Key files

| File | Role |
| --- | --- |
| `src/shaders/compilation/WgslMvpCompiler.ts` | WebGPU MVP: builds single `return ${colorVec4}` fragment; `computeUpstreamReachableNodeIds` limits which nodes inline; per-node fragment `let` bindings post **02B** |
| `src/shaders/compilation/wgslBlendNode.ts` | Blend base/src prelude `let`s post **02A**; previously inlined per channel in `blendPerComponent` |
| `src/shaders/nodes/arrangement-notes.ts` | GLSL template: per-pixel `for (i = noteLoopStart; i < noteLoopEnd)` over baked `ARR_NOTES_*` arrays |
| `src/shaders/arrangement/packArrangementNotesForGlsl.ts` | Bakes snapshot notes into shader literals; caps at `ARRANGEMENT_NOTES_INTERACTIVE_PACK_LIMIT` (1280) with subsampling |
| `src/runtime/arrangement/arrangementNotesPreviewLoop.ts` | Each frame sets `noteLoopStart` / `noteLoopEnd` uniforms to visible-window slice |
| `src/audiotool/arrangement/arrangementNotesVisibleRange.ts` | Window index range + preview loop budget (`resolveArrangementNotesPreviewLoopBudget`) |
| `src/shaders/compilation/computeUpstreamReachableNodeIds.ts` | Shared upstream walk from `final-output`; used by WebGL + WebGPU + preview dependency mask |
| `src/shaders/compilation/MainCodeGenerator.ts` | WebGL: emits per-node statements with variable names; skips unreachable nodes (post-fix) |
| `src/shaders/nodes/blendNodeCode.ts` | WebGL blend uses `$input.base` / `$input.blend` variables, not repeated expression trees |
| `src/shaders/nodes/chord-voronoi-bloom.ts` | Pattern-node sibling: 12× pitch-class loop + release-bin scan; bakes via `notePatternBake.ts` |
| `src/shaders/arrangement/pattern/notePatternBake.ts` | Timeline-length bin layout (`resolvePatternBinLayout`); drives large PC tables for long songs |
| `src/runtime/factories.ts` | Default preview backend: `renderBackend ?? 'webgl'` |

## Recommended fixes (priority)

1. **WebGL reachability parity (critical for default users):** ✅ **Shipped** — Skip main codegen for nodes not upstream of `final-output` (shared `computeUpstreamReachableNodeIds`).
2. **Structural (arrangement nodes in heavy graphs):** Composite arrangement / pattern nodes in a **separate pass** (render to RGBA texture once per frame / timeline step; Blend samples texture). Moves cost off the monolithic fragment / mega-shader hot path. Applies to Notes, Chord Voronoi Bloom, Pitch Wheel, and other pattern bakes. **Follow-up WP** if connected-chain WebGL perf remains unacceptable.
3. **WebGPU fragment codegen (critical when `?renderBackend=webgpu` or `auto` on capable browsers):** ✅ **Shipped** — Fragment-body `let` bindings per reachable node + blend base/src prelude (`02A`/`02B`).
4. **Mitigations (no code):** Keep arrangement snapshot nodes off the final-output chain while iterating; tighten track filter or `windowSeconds` (Notes); reduce blend depth on the output path.

## Repro (minimal)

### WebGL (default — matches most user reports)

1. Open ShaderNoice **without** `?renderBackend=` in the URL (or use `?renderBackend=webgl`).
2. Load a graph with a dense arrangement snapshot and several **Blend** nodes on the path to **Final Output**.
3. Add **Notes**, **Pitch Wheel**, or **Chord Voronoi Bloom** (UV → node → **Blend** `blend` port, vec4 color where applicable).
4. Observe preview FPS collapse or tab unresponsiveness; disconnect the wire → preview recovers (unwired nodes omitted from shader post-fix).
5. Optional: large fragment compile after connect may block the main thread briefly (~100 KB+ GLSL).

### WebGPU (opt-in — compile failure path, pre-fix)

1. Reload with `?renderBackend=webgpu`.
2. Same graph as above with a deep blend chain (e.g. 14 blends).
3. **Pre-fix:** compile hang / `RangeError: Invalid string length` in devtools when connecting the arrangement node to **Blend**. **Post-fix (02A/02B):** compiles successfully; regression in `NodeShaderCompiler.test.ts`.
4. Disconnect the wire; on WebGPU, node leaves reachable set — preview may improve if compile succeeds.

Example data: user preset `3x-midi-env-perf (1).json` — Notes node `node-1780526716789-41puwdyqq`, Blend `node-1780527040443-4x1qlr6pj`, connection `conn-1780527053569-0xxvma0vd`.

## Related

- **Fix (shipped):** `computeUpstreamReachableNodeIds` + WebGL `MainCodeGenerator`/`FunctionGenerator` skip; `emitWgslBlendNode` + fragment prelude `let` bindings — tests in `computeUpstreamReachableNodeIds.test.ts`, `NodeShaderCompiler.test.ts`
- **Follow-up (if needed):** Separate-pass composite for connected arrangement/pattern nodes on heavy WebGL graphs — new work package; not scoped in v1
- Arrangement notes / snapshot: `src/audiotool/arrangement/`, `docs/user-goals/06-audio.md`
- Preview loop uniforms: `src/runtime/arrangement/arrangementPatternPreviewLoop.ts`, `arrangementNotesPreviewLoop.ts` (`onsetLoop*` / `noteLoop*` pattern)
- Pattern nodes: `src/shaders/nodes/` (e.g. `chord-voronoi-bloom.ts`, `pitch-class-compass.ts`)
- Preview backend selection: `docs/architecture/webgl-webgpu-preview-export.md`, `src/runtime/renderBackends/selectRenderBackend.ts`
- Similar preview-freeze class: [color-lut-connect-preview-freeze](./color-lut-connect-preview-freeze.md) (large inlined shader + main-thread compile). WebGPU path here adds **blend expression duplication**; default WebGL path is primarily **runtime hot-path eval** + large fragment compile.
