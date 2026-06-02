# Distortion expansion v1 — five UV warp nodes

## Mission

Ship five **Distort**-category nodes that extend ShaderNoice’s UV grammar without duplicating existing radial lens, polar kaleidoscope, rectangular glitch, or continuous noise-warp families. Each node outputs **`vec2` UV**, chains after **`UV Coords`** (aspect-corrected `p` space), ships **WebGL + WebGPU MVP** parity, **help + presets**, and **singularity-safe defaults**.

**Build order:** Crease Fold → Cellular Slip → Möbius Portal → Wake Smear → Circle Inversion (multi-circle layout presets; conservative clamps).

## Execution order (for agents)

1. **00** — shared UV helpers (circle inversion step + Voronoi cell lookup) — blocks **02**, **05**.
2. **01** — **Crease Fold** (linear hinge / repeat folds).
3. **02** — **Cellular Slip** (Voronoi glass-plate displacement) — depends on **00**.
4. **03** — **Möbius Portal** (disk automorphism portal warp).
5. **04** — **Wake Smear** (procedural motion-vector trails).
6. **05** — **Circle Inversion** (iterative UV inversion; multi-circle presets) — depends on **00**.
7. **06** — docs, demo presets, compiler/golden closeout.

**Branch discipline:** Prefer one node per PR stacked on **00** when helpers land. **04** and **03** can parallelize only if both rebase cleanly; **`WgslMvpCompiler.ts`** is high conflict.

## Research basis (product brief)

Coordinate-space warps before sampling; domain warping as `point + offset(point)`; conformal / Möbius maps; Voronoi-addressed displacement; datamosh-style motion trails without frame history. Full research log and overlap analysis: prior planning chat (distortion inventory vs existing **Distort** palette).

## Existing palette (do not duplicate)

| Node | Role |
| --- | --- |
| **Radial Warp** | Symmetric bulge / fisheye / spherize around center |
| **Kaleidoscope** | Radial N-fold mirror symmetry |
| **Block Glitch** / **Band Shift** | Rectangular / band UV jumps |
| **Vortex** / **Turbulence** / **Vector Field** | Center spin / noise / trig field displacement |
| **Spotlight** (`iterated-inversion`) | **Color** output — orbit + inversion + blobs (not UV) |
| **Cells** (`voronoi-noise`) | **Float** pattern — not per-cell UV motion |
| **KIFS SDF** | 3D iterated fold for raymarch — not 2D UV box fold |

## Locked product semantics (v1)

### Coordinate space

- **Input / output port labels:** `in` / `out` → **UV** (`node-standards.mdc`).
- Assume incoming coords match **Distort** chain convention (same as **Radial Warp**, **Block Glitch**): centered aspect space from **`UV Coords`** unless user wires otherwise; document in help.
- **Center / pole** params use `parameterUI: 'coords'` where applicable.

### Safety (all five nodes)

- User-facing **`Blend`** (or **Mix**) in `[0,1]` mixing input toward warped UV.
- Rational maps: `denom = max(abs(denom), 1e-4)` (or project-standard epsilon).
- Internal UV clamp or early-out when `length(warped) > L` (conservative `L` in shader; not exposed in v1 unless needed).
- Presets must not ship with singular defaults (pole on boundary, zero softness + max fold, etc.).

### Node summary

| `id` | `displayName` | One-line |
| --- | --- | --- |
| `crease-fold` | **Crease Fold** | Reflect / compress across soft moving crease line(s); optional repeat |
| `cellular-slip` | **Cellular Slip** | Voronoi cells slide / rotate independently; soft or locked edges |
| `mobius-portal` | **Möbius Portal** | Disk automorphism portal: off-center pole, conformal bend |
| `wake-smear` | **Wake Smear** | Capsule trail UV drag (datamosh-like, no frame history) |
| `circle-inversion` | **Circle Inversion** | Iterated circle inversions; layout presets (not **KIFS SDF**) |

## Non-goals (this package)

- Ping-pong / feedback buffers, interframe smear, optical flow from video.
- **Liquify Handles**, **Lens Lattice**, **Seam Teleport** (follow-up WPs).
- Raw GLSL/WGSL injection; graph mutations at runtime.
- Refactoring **Spotlight** to use shared helpers (optional follow-up only if zero behavior change).
- WebGPU golden for every node on day one — **compile + snapshot** minimum; golden when stable (**05** especially).

## Coordinator checklist

- **`displayName` === help `title`** — `node-standards.mdc`; short parameter / group labels.
- **Registry:** `src/shaders/nodes/index.ts`, `nodeSearchTags` / `generate-node-search-tags.mjs`.
- **WGSL:** add each `id` to `WGSL_SUPPORTED_NODE_TYPES` in `WgslMvpCompiler.ts` + matching `case` (helpers from **00** duplicated or imported per existing Voronoi pattern).
- **Tests:** `NodeShaderCompiler.test.ts` compile smoke per node; `npm run type-check && npm run test && npm run lint && npm run build`.
- **Presets:** `src/presets/*-demo.json` per node (task **06**).
- **Audio:** `supportsAnimation` / `supportsAudio` on motion drivers (kick → amount, etc.) — match **Path Drive** / **Block Glitch** patterns.
- **Path Drive:** document example wiring for **Möbius Portal** pole and **Wake Smear** emitters in help (task **06**).

## High-touch files

| Area | Files |
| --- | --- |
| Shared helpers | `src/shaders/uvWarp/**` (new — task **00**) |
| Node specs | `src/shaders/nodes/crease-fold.ts`, `cellular-slip.ts`, `mobius-portal.ts`, `wake-smear.ts`, `circle-inversion.ts` |
| WGSL | `src/shaders/compilation/WgslMvpCompiler.ts` |
| Tests | `src/shaders/NodeShaderCompiler.test.ts`, `wgslMvpCompileSnapshots.test.ts` |
| Docs | `src/data/node-documentation.json` |
| Presets | `src/presets/` |

## Work items

| ID | Task | Status | Provides | Blocks |
| --- | --- | --- | --- | --- |
| 00 | [Shared UV warp helpers](./00-shared-uv-warp-helpers-distortion-expansion-v1.md) | ✅ 2026-05-29 | Inversion + Voronoi emitters | 02, 05 |
| 01 | [Crease Fold](./01-crease-fold-distortion-expansion-v1.md) | ✅ 2026-05-29 | `crease-fold` | 06 |
| 02 | [Cellular Slip](./02-cellular-slip-distortion-expansion-v1.md) | ✅ 2026-05-30 | `cellular-slip` | 06 |
| 03 | [Möbius Portal](./03-mobius-portal-distortion-expansion-v1.md) | ✅ 2026-05-30 | `mobius-portal` | 06 |
| 04 | [Wake Smear](./04-wake-smear-distortion-expansion-v1.md) | ✅ 2026-05-30 | `wake-smear` | 06 |
| 05 | [Circle Inversion](./05-circle-inversion-distortion-expansion-v1.md) | ✅ 2026-05-30 | `circle-inversion` | 06 |
| 06 | [Docs, presets, closeout](./06-docs-presets-closeout-distortion-expansion-v1.md) | ✅ 2026-05-30 | Help + demos + ✅ package | — |

## Progress tracker

- **Overall:** 100% — package shipped 2026-05-30 (`node:*` help, five `*-demo.json` presets, Phosphor icons + blend column spans, verify green).
- **Last reviewed:** 2026-05-30.

## Success criteria

- All five nodes appear in **Distort** palette; default params compile on WebGL and WebGPU MVP.
- Each node has `node:<id>` documentation and at least one demo preset graph.
- Overlap claims validated: side-by-side with **Kaleidoscope**, **Block Glitch**, **Radial Warp**, **Spotlight** described in help “Related” / description.
- `npm run type-check && npm run test && npm run lint && npm run build` green.
