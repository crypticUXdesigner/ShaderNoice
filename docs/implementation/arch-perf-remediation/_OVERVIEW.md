# Architecture & performance remediation

## Mission

The 2026-08-09 architecture/performance review found **real SSOT discipline** but **drift and CPU cost** at WebGPU/export/compile seams. This package lands the highest-leverage remediations: shared WebGPU raster execution, compile-contract ownership, cheaper edit/frame paths, and ownership hygiene—**without** product UX redesign.

## Goals

- **Primary:** One WebGPU pass-plan + param-pack path for preview, image export, and video export; compile IR types no longer owned by `runtime/types`; worker compile payloads stop deep-cloning more than needed.
- **Primary (perf):** Safe path to WebGPU preview dependency clock (or documented fail-closed subset); cheaper uniform naming + audio connection indexes; WebGL export sync less brutal than unconditional `gl.finish()` every frame.
- **Secondary:** Delete dead `graphComparison`; relocate clear graph-domain helpers out of `utils`; share one `GraphChangeDetector` result across runtime/compile where practical; tighten connection-only affected-node sets.

## Success & constraints

| Must-have | Detail |
| --- | --- |
| Behavior | Preview/export visual parity for supported graphs unless a task lists an intentional delta. |
| Graph | Immutable; runtime still **reads** only; no store import from runtime. |
| Exclusive raster | Session still one of WebGL / WebGPU for preview **and** export (`?renderBackend=`). |
| Checks | Per task: `npm run type-check && npm test` (scoped OK); package closeout: `npm run lint && npm run build` green. |
| Docs | Update `docs/architecture/` only where seams move (compile-contract, pass-plan sharing, clock). |

**Invariants:** No silent WebGPU→WebGL export fallback; failed compile keeps last-good preview.

**Out of scope (tracked in [`arch-perf-followups`](../arch-perf-followups/_OVERVIEW.md)):** True partial GLSL/WGSL codegen (P3); full `App.svelte` decomposition (A2); export dialog unmount (A4); WebGPU allowlist injection (A6); offline FFT hop redesign (P5). Also out: adaptive DPR productization; new user-facing settings.

**Allowable deltas:** WebGPU paused/static graphs may skip full-rate work once clock mask ships safely; export may use fence/sync instead of `finish` if black-frame QA passes.

## Architecture & design

**Seams:** `shaders` + `runtime` share a **neutral compile-contract** module; WebGPU pass-plan runtimes stay under `runtime/renderBackends/` but **one** executor packs params + runs plans for preview/export; worker posts slim cloneable payloads.

**Anti-patterns:** Third copy of pass-plan encode; shaders importing `runtime/types`; mounting Svelte from export packages (defer full dialog inversion—note only); leaving `graphComparison` as a second change detector.

**High-touch:** `runtime/types.ts`, `CompilationManager`, `workerMessages.ts`, `WebGpuRenderBackend`, `WebGpu*ExportRenderPath`, `webGpuPreviewDependencyClock`, `ExportRenderPath`, `GraphChangeDetector`, `ShaderInstance` / `getUniformName`, `FrequencyAnalyzer`, `audioUniformUpdates`.

## Work items

| ID | Task | Status | Provides | Blocks |
| --- | --- | --- | --- | --- |
| 01 | [Hygiene + cheap frame CPU](./01-hygiene-frame-cpu-arch-perf-remediation.md) | ✅ | Dead-code gone; uniform/index/status hot-path wins | — |
| 02 | [Compile-contract extraction](./02-compile-contract-arch-perf-remediation.md) | ✅ | Neutral IR module; shaders stop importing runtime types | 03 |
| 03 | [Worker payload slim](./03-worker-payload-slim-arch-perf-remediation.md) | ✅ | Lower structuredClone cost on compile kicks | — |
| 04A | [Shared WebGPU pass executor core](./04A-webgpu-pass-executor-core-arch-perf-remediation.md) | ✅ | Shared pack + run API | 04B |
| 04B | [Wire preview + exports to shared executor](./04B-webgpu-pass-executor-wire-arch-perf-remediation.md) | ⬜ | Single path for three callers | — |
| 05 | [WebGPU preview dependency clock](./05-webgpu-preview-clock-arch-perf-remediation.md) | ⬜ | Safer mask default or conservative subset | — |
| 06 | [Export WebGL sync](./06-export-webgl-sync-arch-perf-remediation.md) | ✅ | Faster export without black frames | — |
| 07 | [Change-detection sharing](./07-change-detection-sharing-arch-perf-remediation.md) | ⬜ | Fewer walks; tighter wire-affected sets | — |
| 08 | [Ownership closeout + arch docs](./08-ownership-docs-closeout-arch-perf-remediation.md) | ⬜ | utils hygiene slice; architecture doc sync | — |

**Execution order:** `01` anytime; `02` → `03`; `04A` → `04B`; `05` ∥ `06` ∥ `07` after `01` (no hard dep); `08` last.

## Progress tracker

- **Overall:** ~55% — **01**, **02**, **03**, **04A**, and **06** done (2026-08-09): hygiene/frame CPU + compile-contract + slim worker payloads + shared WebGPU pass-plan pack/encode; WebGL export fence sync (`clientWaitSync`, `finish` fallback) instead of unconditional `gl.finish()`; **04B** unblocked; callers still on private copies until **04B**.
- **Milestone A:** 01–03 (hygiene + compile boundary) — 01 ✅, 02 ✅, 03 ✅.
- **Milestone B:** 04A ✅ → **04B** unblocked (wire three callers).
- **Milestone C:** 05–08 (clock, export sync, change detection, docs) — 06 ✅.

## Notes & risks

| Topic | Decision |
| --- | --- |
| Scope source | Review canvas + agent findings 2026-08-09 (`A1–A8`, `P1–P2`, `P4`, `P6–P7`, `P10–P12`). |
| Deferred | Moved to [`arch-perf-followups`](../arch-perf-followups/_OVERVIEW.md): `P3`, `A2`, `A4`, `A6`, `P5`. |
| Conflict risk | `WebGpuRenderBackend` + both export paths — serialize 04A/04B; avoid parallel edits. |
| Clock safety | Prefer conservative mask / golden coverage before flipping URL default on. |
| 02 compile-contract | Neutral home: `src/compile-contract/index.ts` (not under `shaders/`) so runtime does not import shaders for IR. `runtime/types` re-exports until **08**. Shaders + `UniformGenerator` import contract directly; unblocks **03**. |
| 03 worker payload | `cloneableCompilePayload` omits `previousResult` when `!tryIncremental`; incremental posts `IncrementalPreviousResult` (`metadata.executionOrder` only). Graph still structured-cloned (proxy safety). |
| 04A (2026-08-09) | Added `src/runtime/renderBackends/webgpuPassPlanExecutor.ts` (`setParamSlot`, graph transfer w/ runtime-only + override suppression, `encodeWebGpuPassPlanFrame`). Callers unchanged; packing parity tests in `webgpuPassPlanExecutor.test.ts`. Unblocks **04B**. |
