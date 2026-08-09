# Architecture & performance follow-ups

## Mission

Continue the 2026-08-09 review after [`arch-perf-remediation`](../arch-perf-remediation/_OVERVIEW.md): land the **deferred** high-impact items—App shell decomposition, export UI inversion, WebGPU wire-policy injection, true incremental / hash-skip compile, and offline audio-analysis cost—without blocking the first remediation package.

## Goals

- **Primary:** Split `App.svelte` into feature modules; export orchestrators become pure APIs (lib owns dialogs); WebGPU capability rules inject into validation instead of shaders→data-model imports.
- **Primary (perf):** Real incremental or hash-skip compile for GLSL (and a WebGPU path that is not always full re-emit); lower offline FFT / analysis cost for long clips (UI + export prep).
- **Secondary:** Architecture docs + pointers so agents do not re-litigate deferred scope.

## Success & constraints

| Must-have | Detail |
| --- | --- |
| Behavior | No silent preview/export regressions; list intentional deltas per task. |
| Graph | Immutable; runtime reads only; no runtime→`graphStore` import. |
| Soft deps | Prefer landing [`arch-perf-remediation`](../arch-perf-remediation/_OVERVIEW.md) **02** (compile-contract) before **04\*** here; **07** there helps incremental eligibility. |
| Checks | Per task: `type-check` + targeted tests; package closeout: `lint` + `build`. |

**Invariants:** Exclusive WebGL/WebGPU session policy unchanged; failed compile keeps last-good preview.

**Out of scope:** Adaptive DPR productization; new end-user settings chrome beyond what export-dialog move requires; rewriting the whole node compiler architecture.

**Allowable deltas:** Faster offline analysis may use lower hop for UI-only paths if live/export samplers stay correct; App split must preserve callback wiring.

## Architecture & design

**Seams:** `lib/app/*` feature modules ← thin `App.svelte`; `image-export` / `video-export` return configs/results, **`src/lib`** mounts dialogs; platform validation module owns WebGPU allowlists consumed by data-model + editor; compiler caches section hashes / reuses unchanged bodies.

**Anti-patterns:** Growing `App.svelte` further; orchestrators importing `.svelte`; data-model importing shader MVP allowlists directly; calling “incremental” when still full re-emit.

**High-touch:** `App.svelte`, `appExportSession`, export orchestrators, `webGpuExclusiveConnectionValidation`, `WgslMvpCompiler` allowlists, `NodeShaderCompiler.compileIncremental`, `OfflineAudioProvider` / analysis build core.

## Work items

| ID | Task | Status | Provides | Blocks |
| --- | --- | --- | --- | --- |
| 01 | [App.svelte feature modules](./01-app-shell-decomposition-arch-perf-followups.md) | ✅ | Thinner App; extracted wiring modules | — |
| 02 | [Export dialogs owned by lib](./02-export-dialog-inversion-arch-perf-followups.md) | ✅ | Pure export APIs; no Svelte mount in export pkgs | — |
| 03 | [WebGPU validation injection](./03-webgpu-validation-injection-arch-perf-followups.md) | ✅ | Allowlist/policy outside data-model→shaders | — |
| 04A | [GLSL incremental / hash-skip](./04A-glsl-incremental-hash-skip-arch-perf-followups.md) | ✅ | Real reuse or skip when slice unchanged | 04B |
| 04B | [WebGPU compile hash-skip](./04B-webgpu-compile-hash-skip-arch-perf-followups.md) | ✅ | WebGPU not always full re-emit | — |
| 05 | [Offline analysis hop / progressive](./05-offline-analysis-cost-arch-perf-followups.md) | ✅ | Cheaper long-clip analysis prep | — |
| 06 | [Docs + package closeout](./06-docs-closeout-arch-perf-followups.md) | ✅ | Arch/user-goal pointers; verify green | — |

**Execution order:** `01` ∥ `02` ∥ `03` ∥ `05` (watch conflict files); `04A` → `04B` (after remediation compile-contract if possible); `06` last.

## Progress tracker

- **Overall:** **100% — Done** (2026-08-09). All tasks **01**–**06** ✅.
- **Milestone A:** 01–03 (ownership / shell) — ✅.
- **Milestone B:** 04A–05 (compile + analysis perf) — ✅.
- **Milestone C:** 06 closeout — ✅.

## Notes & risks

| Topic | Decision |
| --- | --- |
| Sibling | Implements deferred rows from remediation Notes (`A2`, `A4`, `A6`, `P3`, `P5`). |
| Conflict | `App.svelte` / export session — serialize **01** vs **02** if both touch export entry. |
| Incremental honesty | **04*** landed hash-skip (not always full-emit). Documented in `preview-and-recompilation.md` / `compilation-worker.md`. |
| Analysis | Live preview curve samplers and export must stay numerically aligned when hop changes. |
| 03 validation injection | SSOT: `src/platform-validation/` (`GENERIC_RAYMARCHER_WEBGPU_MVP_SDF_TYPES`). Data-model + `WgslMvpCompiler` import it; no shaders→allowlist re-export shim. Arch: WIRE-VALIDATION-DESIGN / graph-and-platform-boundaries / webgl-webgpu-preview-export. |
| 01 App shell | Extracted `graphHistory`, `audiotoolEditorWiring`, `hubGraphPrepare`; extended `editorRuntimeBootstrap` (preview compile UI sink + URL helpers). Still in App: hub/autosave, overlays, arrangement import, canvas↔runtime `$effect`s. Module map: `editor-ui-canvas-layout.md`. |
| **02 export dialog inversion** | Pure APIs: `runImageExport` / `runVideoExport` (+ `createImageExportPreviewController`, `VideoExportUiSession`). Lib mounts via `imageExportDialogHost` / `videoExportDialogHost`; `appExportSession` wires dialog → run. No `mount`/`unmount` or `.svelte` in `image-export` / `video-export`. App handlers unchanged (still `runEditor*ExportSession`). Docs/AGENTS use `runImageExport` / `runVideoExport` (not Flow). |
| **05 offline analysis** | Preview worker builds at **60 Hz** (`PREVIEW_ANALYSIS_RATE_HZ`); export/`OfflineAudioProvider` stays **120 Hz**. Rates in `audioAnalysisRates.ts`. Progressive `partialResult` (~2s prefixes) during full builds; fingerprint includes `hop:`. Intentional delta: coarser preview hop vs export smoothing grid; same-hop live↔export samples match (tested). Export rebuilds at 120 (does not reuse 60 Hz preview caches). Arch + user-goals: `audio-reactivity.md`, `06-audio.md`. |
| **04A GLSL hash-skip** | Strategy: **hash-skip** on codegen-input digest (`GlslSectionHashes.aggregate`; uniform-backed params → `@u`). `compileIncremental` sets `incrementalHashSkip` and skips function collect / `assembleShader` when aggregate matches. Worker slim posts hashes; `CompilationManager.applyIncrementalHashSkip` keeps last-good program. Helpers: `src/shaders/compilation/glslSectionHashes.ts`. |
| **04B WebGPU hash-skip** | Strategy: **hash-skip** via `WgslSectionHashes.aggregate` (`computeWgslCodegenDigest` = GLSL digest + pass-plan topology fingerprint). Matching aggregate skips `compileWgslMvp`. Worker slim posts `wgslSectionHashes`. Full path on hash miss / guard fail; unsupported graphs still `supported: false`. Helpers: `src/shaders/compilation/wgslSectionHashes.ts`. |
| **06 closeout** | Architecture + AGENTS + user-goals (analysis hop) + remediation deferred pointers synced to shipped seams. Package complete. |
| **Post-ship review (2026-08-09)** | Removed unused shaders allowlist re-export shim; shared `WGSL_WEBGPU_PASS_PLAN_NODE_TYPES` via `wgslPassPlanNodeTypes.ts` (hash fingerprints no longer drift / import full compiler); dropped unused hash helper params; renamed preview counter `incrementalHashSkips`; doc honesty for WebGPU `incrementalHashSkip`. |
