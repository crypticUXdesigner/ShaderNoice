# Arrangement pattern nodes — per-node integration checklist

Copy-paste for tasks **03–07D** (one node per PR). Shared infra from **02A/02B** must land first.

## Data + bake (compile time)

1. Add/extend pack helper under `src/shaders/arrangement/pattern/` (or `src/shaders/arrangement/` if a single file).
2. Filter notes/regions via `trackPassesArrangementFilter` + existing `filterNotesForNode` / `filterRegionsForNode` patterns.
3. Missing `audioSetup.arrangementSnapshot` → bake `count = 0` (compile succeeds; shader loops exit immediately).
4. Register compile-time bake params in `src/utils/compileTimeBakeParams.ts` (`trackFilterMode`, any param that changes baked tables).

## Node spec

5. `src/shaders/nodes/<node-id>.ts` — category **`Patterns`**, `in` vec2 **UV**, `time` float default **`uTimelineTime`**, `out` float mask (plus extra outputs only when task specifies).
6. Center via **`centerX`/`centerY`** + `parameterUI: 'coords'` (default **0.5** in UV space); reuse `arrangement-track-filter` layout block from `arrangement-lanes.ts`.
7. Export spec in `src/shaders/nodes/index.ts`; add `node:<id>` to `src/data/node-documentation.json`.

## GLSL / WGSL compiler

8. Node template placeholders (`{{…_BAKE}}`, `{{NODE_SUFFIX}}`) + `FunctionGenerator.collectAndDeduplicateFunctions` branch (mirror `arrangement-lanes` / `arrangement-notes`).
9. `WgslMvpCompiler.ts`: add id to `WGSL_SUPPORTED_NODE_TYPES` + `case '<node-id>'` helper builder (high-conflict file — serialize PRs).
10. Windowed note scans: reuse `noteLoopStart`/`noteLoopEnd` + `applyArrangementNotesLoopUniforms` when looping baked onsets (see `arrangementNotesPreviewLoop.ts`).

## Tests + UX

11. `NodeShaderCompiler.test.ts`: GLSL (+ WGSL when supported) bake from `spike-arrangement-raw.json`; **`compiles with empty bake when snapshot is missing`** for the new node.
12. Unit tests for pack helpers beside source (pattern: `packArrangementNotesForGlsl.test.ts`).
13. Track filter chrome shows **“No arrangement”** when snapshot absent (`ArrangementTrackFilter.svelte` — no custom empty state per node).

## Closeout (task 08)

14. Demo preset under `src/presets/`; refresh search tags if needed (`npm run generate-node-search-tags`).
