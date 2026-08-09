# Advanced 2D fractals — expand the Fractal node

## Mission

Upgrade the Patterns **`fractal`** node from a demoscene-style fold/glow field into a **broader 2D fractal toolkit**: richer escape-time maps, orbit traps, Newton/Lyapunov, and one artist-directable Julia variant—while keeping **UV → float**, immutable graph rules, and preset compatibility for modes **0–5**. Defer density/feedback systems (flames, reaction–diffusion) to an explicit later runtime track after a scoped spike.

## Goals

- **Primary:** Ship priorities **1–4** on `fractal` (escape family + coloring, trap library, Newton/Lyapunov, shape-modulus or portal Julia).
- **Secondary:** Document **priority 5** (fractal flames / Gray–Scott) as a **runtime feasibility spike**—boundaries only, no ship in this package.
- **UX:** Enum labels for every new int mode/family; short parameter labels; full prose in `node-documentation.json`.

## Success & constraints

| Must-have | Detail |
| --- | --- |
| Compat | Modes **0–5** keep current meaning; existing presets look the same at default params. |
| Output | Still **`float`** (field / mask); color via graph (LUT / Color Map). |
| Caps | Iteration loops stay compile-time bounded (≤32 unless a task raises with WGSL/GLSL parity). |
| Checks | Per task: `npm run type-check && npm test && npm run lint && npm run build`. |
| Standards | `shaders/node-standards.mdc`; enum maps in `parameterEnumMappings.ts`. |

**Invariants:** Immutable graph; no runtime mutation; no deep-zoom / arbitrary-precision; no new top-level node unless a task explicitly requires it.

**Allowable deltas:** New params (defaults preserve look); mode max may grow (**6+**); docs/examples updated.

**Out of package:** Mandelbulb/box/KIFS SDF changes; flame/RD product UI; perturbation deep zoom.

## Architecture & design

```
UV → fractal (modes 0–5 legacy + 6–8 new + escape/trap sub-enums)
         → float field → Mix / Color Map / Output
```

**Shared helpers** live in `fractal.ts` `functions` (cmul, smooth escape, DE, trap distance, shape modulus)—extend, don’t fork per mode.

**Anti-patterns:** Breaking mode 0–5 ints; dumping research params on every mode without `visibleWhen`; implementing flames inside the single-pass Fractal node; silent formula changes without docs.

**High-touch:** `src/shaders/nodes/fractal.ts`, `parameterEnumMappings.ts`, `node-documentation.json`, optional small Vitest for pure JS helpers if extracted.

## Work items

| ID | Task | Status | Provides | Blocks |
| --- | --- | --- | --- | --- |
| 01 | [Escape family + smooth/DE](./01-escape-family-smooth-de-advanced-2d-fractals.md) | ✅ | Mandelbrot/Burning Ship; smooth + DE coloring under mode 3 | 02, 03, 04 |
| 02 | [Orbit trap library](./02-orbit-trap-library-advanced-2d-fractals.md) | ✅ | Line/cross/spiral/multi traps on mode 4 | 04 (soft) |
| 03 | [Newton + Lyapunov](./03-newton-lyapunov-advanced-2d-fractals.md) | ✅ | Modes 6–7 + enums/docs | — |
| 04 | [Shape-modulus / portal Julia](./04-shape-modulus-portal-julia-advanced-2d-fractals.md) | ✅ | Directable Julia variant | — |
| 05 | [Flames & RD spike](./05-flames-rd-runtime-spike-advanced-2d-fractals.md) | ✅ | Architecture note + non-goals | — |

**Execution order:** `01` → `02` → `03` → `04` → `05`. All of **01–04** touch `fractal.ts`—serialize PRs; **05** may run after **01** if desired (docs-only).

## Progress tracker

- **Overall:** 100% — tasks **01–05** done (2026-08-09).
- **Milestone A:** tasks 01–02 (escape + traps).
- **Milestone B:** tasks 03–04 (new maps + directable Julia).
- **Milestone C:** task 05 (future runtime track) — spike complete.

## Notes & risks

| Topic | Decision |
| --- | --- |
| Escape | Mode **3** UI label **Escape**; `fractalEscapeFamily` (Julia / Mandelbrot / Burning Ship) + `fractalColoring` (Iteration / Smooth / Distance). Defaults 0/0 preserve legacy Julia look. |
| Traps | Mode **4**; `fractalTrapShape` enum; multi-trap = weighted mix of ≥2 shapes. |
| New modes | **6** Newton, **7** Lyapunov, **8** Shape Julia (top-level `fractalMode`). |
| Directable | Prefer **shape-modulus** (analytic, param shape); light **portal** as stretch in **04**. |
| P5 | Spike done: **defer** product; follow-up = **separate node type + sim subsystem**. First slug **`reaction-diffusion-v1`** (then **`fractal-flames-v1`**). Note: [`docs/architecture/fractal-flames-and-reaction-diffusion.md`](../../architecture/fractal-flames-and-reaction-diffusion.md). |
| 05 land | Go/no-go: **no-go for Fractal modes**; go for later RD package. Comment pointer on `fractal.ts`. |
| 01 land | GLSL `fractalEscapeField` + WGSL `fractalEscapeFieldWgsl` parity; Burning Ship Y-flipped + diffabs for DE; files: `fractal.ts`, `WgslMvpCompiler.ts`, `parameterEnumMappings.ts`, `node-documentation.json`. |
| 02 land | `fractalTrapShape` 0–4 (Ring default) + `fractalTrapRadius` (0.5); Multi = min(ring, cross); Archimedean spiral; accum capped at 64; GLSL/WGSL `fractalOrbitTrapDist*`; snapshot updated. |
| 03 land | Modes **6** Newton (`zⁿ−1`, Power 2–5; float = (rootId+conv)/n) and **7** Lyapunov (ABAB; Rate A/B + UV; λ→clamp(0.5−λ·0.5)); `visibleWhen` Newton/Lyapunov grids; fold/Julia/trap hidden; GLSL/WGSL parity; enums/docs/snapshot. |
| 04 land | Mode **8** Shape Julia: μ(z)=‖z‖/R_shape(θ) (ellipse + soft squircle); Thin/Shell + Coloring + Julia X/Y; **portal stretch shipped** (Off/On + Center/R, disk inversion in iter space); GLSL/WGSL `fractalShapeJuliaField*`; enums/docs/snapshot. |

**Risks:** GPU cost at 32 iters × DE; enum UI clutter—use `visibleWhen`; Burning Ship orientation (Y flip) document in help.
