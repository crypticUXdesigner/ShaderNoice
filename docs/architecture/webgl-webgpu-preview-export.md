# WebGL vs WebGPU preview and export (exclusive session modes)

**Last updated:** 2026-08-09 (arch-perf-followups closeout)

**Shipped:** Exclusive preview/export modes and hybrid preview removal were delivered 2026-05-12 (formerly tracked under `docs/implementation/webgl-webgpu-exclusive-modes/`, consolidated here).

## Invariants

- For any **preview session** or **single export job**, **at most one** live raster API runs: **WebGL2** or **WebGPU** (the CPU compiler may still emit both GLSL and WGSL).
- **WebGPU-only preview** does not keep a parallel WebGL2 context for nominal frames. `WebGpuRenderBackend` does not extend the WebGL backend; `getGLContext()` is null on that path. See [`preview-and-recompilation.md`](./preview-and-recompilation.md) (*Reliability properties*).
- **Export** uses the **same** raster backend as the editor session (`RuntimeManager.getExportRasterBackend` → `runImageExport` / `runVideoExport`). There is **no** silent WebGPU→WebGL fallback inside one export job.

## Export API ownership (dialog inversion)

| Layer | Owns |
| --- | --- |
| [`src/image-export/`](../../src/image-export/), [`src/video-export/`](../../src/video-export/) | Pure run APIs (`runImageExport`, `runVideoExport`, preview controllers / UI sessions). **No** Svelte `mount`/`unmount` and **no** `.svelte` imports. |
| [`src/lib/app/`](../../src/lib/app/) | Dialog hosts (`imageExportDialogHost`, `videoExportDialogHost`) + `appExportSession` (dialog → resolved config → run). |
| [`App.svelte`](../../src/lib/App.svelte) | User-facing handlers still call `runEditor*ExportSession` wrappers. |

Product UX is unchanged; only the package boundary moved (arch-perf-followups **02**).

## Shared WebGPU pass-plan executor

Preview and both WebGPU export paths pack param slots and encode pass plans through one module:

| Caller | Path |
| --- | --- |
| Live preview | `WebGpuRenderBackend` |
| Still export | `WebGpuExportRenderPath` |
| Video export | `WebGpuVideoExportRenderPath` |
| Shared core | [`src/runtime/renderBackends/webgpuPassPlanExecutor.ts`](../../src/runtime/renderBackends/webgpuPassPlanExecutor.ts) (`setParamSlot`, graph→slot transfer with runtime-only + override suppression, `encodeWebGpuPassPlanFrame`) |

Pass-plan IR types (`WebGpuPassPlan`, `CompilationResult`, …) are owned by [`src/compile-contract/`](../../src/compile-contract/).

## Offline driver uniforms (export frames)

Per export frame, non-GLSL parameter drivers are applied as **uniform updates** before rasterization (WebGL and WebGPU export paths both consume the same merged list):

| Driver kind | Mechanism | Module |
| --- | --- | --- |
| **Audio** | Offline channel samples + remap uniforms at frame-center transport time | `OfflineAudioProvider` |
| **MIDI** (parameter drivers) | Isolated envelope eval at `timelineTime` (no preview frame-cache globals) | `getMidiEnvelopeExportUniformUpdates` |
| **Animation** | Baked in compiled GLSL/WGSL via `evalAutomation_*(uTimelineTime)` | compiler / shader |
| **Arrangement loops** | `onsetLoopStart`/`onsetLoopEnd`, `noteLoopStart`/`noteLoopEnd` at `timelineTime` | `getArrangementLoopExportUniformUpdates` |
| **Radial-pulse spawns** | `pulseSpawnTimeline*` at `shaderTime` (sequential scratch or replay for still scrub) | `ExportRadialPulseSpawnState` |

**Merger:** `buildExportFrameState` in `src/video-export/buildExportFrameState.ts` concatenates audio, MIDI, arrangement loop, and radial-pulse `uniformUpdates` and sets `timelineTime` (video: frame-center; image scrub: `timelineTimeOverride`). Requires `audioSetup.arrangementSnapshot` for MIDI envelope drivers and arrangement loop indices; missing snapshot → MIDI skipped, loop indices zeroed. Export render paths call `refreshExportArrangementBakeCaches` after compile (same as preview `CompilationManager`).

## Product behavior

- **WebGPU session + unsupported graph:** **Hard block** with a clear error and **how to proceed** (e.g. reload with `?renderBackend=webgl` or use settings). No silent compile on WebGL for that session.
- **WebGL session:** First-class path; capability follows the GLSL pipeline for the graph.
- **URL override:** `?renderBackend=auto|webgpu|webgl` — parsed in `src/lib/App.svelte` (`parseUrlRenderBackendOverride`).

## Coverage and parity

- **Matrix semantics, export gate index, `unsupportedReasons` taxonomy:** [`COVERAGE-MATRIX.md`](./COVERAGE-MATRIX.md)
- **CI vs golden harness, RMS thresholds, “drop WebGL” gates:** [`PARITY-PLAN.md`](./PARITY-PLAN.md)
- **Per-node generated table:** [`wgsl-coverage-ledger.md`](./wgsl-coverage-ledger.md) — regenerate with `npx tsx scripts/generate-wgsl-coverage-ledger-table.ts --write-doc`

## Optional follow-ups (not required for exclusive modes)

- **Telemetry:** frame time, memory, WebGPU block rate — add when instrumenting preview/runtime.
- **Further wire / add-node guards:** Phase 1 generic-raymarcher allowlists are owned by [`src/platform-validation/`](../../src/platform-validation/) (data-model + WGSL compilers consume it; data-model does **not** import `shaders/compilation`). Additional connection-time or add-node rules: [`WIRE-VALIDATION-DESIGN.md`](./WIRE-VALIDATION-DESIGN.md), [`GAP-INVENTORY.md`](./GAP-INVENTORY.md). App shell / export dialog / hash-skip / analysis-hop work from the 2026-08-09 review is **shipped** in [`arch-perf-followups`](../implementation/arch-perf-followups/_OVERVIEW.md) — do not re-litigate that deferred scope.

## Manual QA (spot-check after large GPU changes)

| Browser | Session (`?renderBackend=`) | What to verify |
| --- | --- | --- |
| Chrome / Edge | `webgl` | Image + video export completes on **WebGL2** only; no WebGPU device for raster export. |
| Chrome / Edge | `webgpu` + WGSL-supported graph | Image + video export on **WebGPU** only. |
| Chrome / Edge | `webgpu` + unsupported graph | Preview hard-block; export error points to switching to WebGL — **no** silent WebGL export in the same job. |
| Firefox | `webgl` | Export on WebGL where available; forced `webgpu` may fail early with an explicit error. |

## Ledger maintenance

The per-node WGSL table lives in [`wgsl-coverage-ledger.md`](./wgsl-coverage-ledger.md). Regenerate after changing `nodeSystemSpecs` or WGSL allowlists. **Policy and architecture** for exclusive preview/export modes live in **this** document and the coverage/parity companions linked above.
