# Fractal flames & reaction–diffusion (runtime spike)

**Status:** Decision record (2026-08-09). Not product scope for Patterns **`fractal`**.  
**Package:** [`docs/implementation/advanced-2d-fractals/`](../implementation/advanced-2d-fractals/_OVERVIEW.md) task **05**.

## Why not Fractal modes

`fractal` is a **single-pass** UV → **float** field (compile-time-bounded loops, ≤32). Escape maps, traps, Newton/Lyapunov, and shape-Julia fit that contract.

**Fractal flames** (Draves density IFS) and **Gray–Scott** need **persistent GPU state**: accumulation or ping-pong textures, plus a tone-map / readout pass. Stuffing them into `fractal.ts` would break the float-field mental model, preset compat for modes 0–8, and WGSL fullscreen allowlisting. Coverage already tags history/ping-pong work as **compute-pass** / **render-pass**, not inline (`wgsl-coverage-ledger.md`).

## Flames (density IFS)

| Approach | Fit today |
| --- | --- |
| Chaos game (random IFS per particle) | Needs atomics or CPU scatter; poor match for current fullscreen fragment graphs. |
| Deterministic IFS / Lawlor-style density | Still needs a **density buffer** + log/power tone map; not a Patterns float node. |

Ship shape (later): dedicated node (e.g. density → float or vec3), runtime-owned buffer, optional seed/palette params. Refs: Draves & Reckase *The Fractal Flame Algorithm*; Lawlor IFS GPU density.

## Gray–Scott (RD)

Classic **ping-pong** A/B simulation: each frame samples previous textures, writes next. Needs:

- Seed / reset UI (noise, stamp, clear) — likely **runtime-only** params (see `runtimeOnlyParams.ts` pattern).
- Step count vs wall clock: preview `TimeManager` vs export frame time — risk of **divergent** evolution if steps ≠ fixed per export frame.
- Resolution coupling: sim grid vs preview DPR / export size.

Existing precedent: WebGPU **blur** Gaussian separable uses runtime ping-pong textures (`blurGaussianSeparablePassPlanRuntime.ts`); `FrameGraph` already allows `kind: 'compute' | 'render'`. RD is closer to that multipass model than to `fractal`.

## Touchpoints (must honor)

| Seam | Constraint |
| --- | --- |
| Graph | Immutable; sim state **not** in `NodeGraph` — runtime/session only. |
| Compile | New type → pass-plan / compute path; do not force into `WGSL_SUPPORTED_NODE_TYPES` fullscreen. |
| `RuntimeManager` | Owns lifecycle; preview clock + param updates; no graph mutation. |
| Export | **Same exclusive raster API** as preview (`getExportRasterBackend` → `runImageExport` / `runVideoExport`). No silent WebGPU→WebGL fallback ([`webgl-webgpu-preview-export.md`](./webgl-webgpu-preview-export.md)). Sim must declare WebGL and/or WebGPU support and hard-block otherwise. |
| WebGPU | Prefer compute or render-pass plan; reuse texture-pool / pass-plan patterns from blur/bloom. |

## Recommendation

**Defer product UI.** Follow-up shape: **separate node type + sim subsystem** (not Fractal modes).

1. **First package:** `reaction-diffusion-v1` — Gray–Scott (or similar) as its own node + runtime ping-pong; prove seed/reset, fixed steps-per-export-frame, and exclusive-backend gates. Rough effort: **M** (~1–2 eng-weeks for WebGPU pass-plan prototype + export correctness; **+M** for WebGL parity).
2. **Later:** `fractal-flames-v1` — density IFS + tone map after the sim ownership model is proven. Rough effort: **L** (atomics/scatter or multi-pass splat, artist controls, dual-backend).

**Do not** start with a flames-only compute prototype before RD: RD reuses existing ping-pong seams and answers export/time questions cheaper.

## Non-goals (this spike)

- Shipping nodes/UI; deep-zoom / perturbation; Electric Sheep network; changing compile/runtime beyond a comment pointer on `fractal.ts`.
