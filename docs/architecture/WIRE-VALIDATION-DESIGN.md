# Wire validation design (mode-aware, WebGPU strictness)

**Last updated:** 2026-08-09 (arch-perf-followups **03** — platform-validation SSOT)

**Goal:** Apply **small, high-signal** rules at **connection create** time when the editor session is on the **WebGPU** raster path, so finishers do not build graphs that compile on WebGL2 but **hard-block** on WebGPU only at preview/export.

**Principles:** Immutable graph — validation is a **predicate** on `(proposed connection, graph, specs, session context)`; **no silent fixes**. Avoid importing the full compiler into the data-model; share only **small allowlists** with the WGSL MVP layer via [`src/platform-validation/`](../../src/platform-validation/) (neutral policy module). Data-model must **not** import `src/shaders/compilation/*` for policy data; compilers and wire validation both consume `platform-validation`.

---

## Source of truth for "current session mode"

| Approach | Pros | Cons |
| --- | --- | --- |
| **A. Callback from UI (`RuntimeManager.getExportRasterBackend()` mirrors preview)** | Always matches exclusive preview/export policy; no duplicate URL parsing. | `NodeEditorCanvasWrapper` needs a prop; `runtimeManager` null briefly during boot → treat as unknown. |
| B. Parse `?renderBackend=` in the canvas | Local. | Duplicates `App.svelte` / factory logic; drifts from actual selected backend under `auto`. |
| C. Global store | Easy reach from graphStore. | Couples data-model or store to runtime lifecycle. |

**Chosen: A.** `App.svelte` passes `getExclusiveRasterGpu?: () => 'webgl2' | 'webgpu' | null` into `NodeEditorCanvasWrapper`. When the callback is missing or returns `null` (**SSR, tests, boot**), WebGPU-only wire rules **do not** run. When it returns `'webgl2'`, rules **do not** run. When `'webgpu'`, **Phase 1** rules run, plus **Phase 2** slices documented under *Implementation status* (e.g. bool port strictness).

---

## API shape

**Extend** `AddConnectionWithValidationOptions` (and the same payload on `removeNode` bridge + `insertNodeIntoConnection`) with:

```ts
export type ConnectionValidationExclusiveGpu = 'webgl2' | 'webgpu';

export interface ConnectionValidationContext {
  exclusiveRasterGpu: ConnectionValidationExclusiveGpu;
}
```

- `connectionValidation?: ConnectionValidationContext` on `addConnectionWithValidation` options.
- `removeNode(..., { nodeSpecs, connectionValidation })` forwards to the bridge `addConnectionWithValidation`.
- `insertNodeIntoConnection(..., specs, { connectionValidation })` forwards to internal `addConnectionWithValidation` calls.

`validateConnection(..., errors, warnings, connectionValidation?)` — optional trailing argument; **`validation.ts` / `validateGraph`** omit it so load-time validation stays mode-agnostic in Phase 1.

**Alternative considered:** thread mode through every `graphStore` method — rejected to avoid widening the store API for a UI concern.

---

## Phase 1 rules (concrete)

When `connectionValidation.exclusiveRasterGpu === 'webgpu'`:

1. **Target `generic-raymarcher`, port `sdf`** — Reject if the source node's `type` is not in `GENERIC_RAYMARCHER_WEBGPU_MVP_SDF_TYPES` (SSOT in `src/platform-validation/`; also used by `WgslMvpCompiler` / `validateGenericRaymarcherWebGpuMvp`).
2. **Target `generic-raymarcher`, port `displacement`** — Reject unless source is node type `displacement-3d` and `sourcePort === 'out'`.

**User-facing errors:** Short, actionable (e.g. "WebGPU: connect an allowed SDF into Generic raymarcher, or switch to WebGL2 preview."). Surface via existing **toast** path when the canvas rejects a connection; patch tool uses `InsertNodeIntoConnectionResult.detail` when validation fails.

---

## Explicit non-goals (Phase 1)

- No **full** `compileWgslMvp` or pass-plan simulation inside `src/data-model/`.
- No **pixel** or golden RMS checks.
- No automatic rewiring or mutating the graph to "fix" invalid states.

## Implementation status (shipped slices)

- **Phase 1** — `validateWebGpuExclusiveWireRules` in [`src/data-model/webGpuExclusiveConnectionValidation.ts`](../../src/data-model/webGpuExclusiveConnectionValidation.ts): `generic-raymarcher` **sdf** allow-list + **displacement** source; gated on `connectionValidation.exclusiveRasterGpu === 'webgpu'`; allowlist from [`src/platform-validation/`](../../src/platform-validation/); tests in [`webGpuExclusiveConnectionValidation.test.ts`](../../src/data-model/webGpuExclusiveConnectionValidation.test.ts).
- **Phase 2 (partial)** — Same module: **bool port strictness** — if either side of a port wire is `bool`, the other end must be `bool` (WebGPU session only). Avoids WGSL surprises from bool↔numeric mixes that GLSL may accept. WebGL2 / omitted context unchanged (fail-open for mode).

---

## Later phases (inventory P1+)

- Pass-plan upstream subgraph checks (partial heuristics or compile probes).
- `unsupported node type` prevention on paste / add-node in WebGPU session.
- **Not planned:** wire-time or compile hard-fail for unwired `generic-raymarcher.in` — product rule is typed-zero / black behavior, same as other unconnected vec2 inputs (`resolveInputVec2`).

---

## Testing strategy

- **Unit:** `addConnectionWithValidation` with mocked minimal graphs — WebGL context omitted → allowed; WebGPU + bad SDF → error; WebGPU + allowed SDF → success.
- **Integration:** `insertNodeIntoConnection` + `removeNode` bridge with `connectionValidation` forwarded (regression that patch/delete still validates).
- **E2E:** Optional; Phase 1 covered by unit tests.
