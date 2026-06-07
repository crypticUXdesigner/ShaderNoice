# Onboarding checklist

Quick orientation for new contributors and agent sessions. Pair with the **`onboard-contributor`** skill and **`AGENTS.md`**.

## 1. Product and repo

- [ ] Read [`README.md`](../README.md) — product pitch, stack, `npm run dev`
- [ ] Read [`AGENTS.md`](../AGENTS.md) — non-negotiables (immutable graph, where things live)
- [ ] Skim [`docs/user-goals/README.md`](./user-goals/README.md) — canonical UX expectations by area

## 2. Rules and workflow

- [ ] Browse [`.cursor/rules/`](../.cursor/rules/) — start with **`core/project-conventions.mdc`**
- [ ] Note slash commands vs skills: [`.cursor/commands/`](../.cursor/commands/) (canonical prose) and [`.cursor/skills/`](../.cursor/skills/) (thin runners)
- [ ] For multi-step work: **`docs/implementation/<slug>/_OVERVIEW.md`** + tasks; use **`/implement-task`**

## 3. Code layout

| Area | Path | Role |
| --- | --- | --- |
| Graph (SSOT writes) | `src/data-model/` | Types, immutable updates, validation, serialization |
| Store | `src/lib/stores/graphStore.svelte.ts` | Reactive graph + audioSetup |
| Svelte UI | `src/lib/` | App shell, panels, parameters |
| Canvas engine | `src/ui/` | Editor, interactions (TypeScript, not Svelte) |
| Shaders | `src/shaders/` | Node specs, compilation, GLSL/WGSL |
| Runtime | `src/runtime/` | Preview, compile scheduling, WebGL/WebGPU |
| Node help content | `src/data/node-documentation.json` | Guide copy — see **`docs/node-documentation-content-guide.md`** |

## 4. Architecture (when touching seams)

- [ ] [`docs/architecture/README.md`](./architecture/README.md) — system map and reading order
- [ ] Immutable graph + store: [`graph-and-platform-boundaries.md`](./architecture/graph-and-platform-boundaries.md)
- [ ] Parameter → shader path: [`parameters-pipeline.md`](./architecture/parameters-pipeline.md)

## 5. Before you ship

- [ ] Behavior change? Update the matching **`docs/user-goals/`** file
- [ ] Pre-push: **`/prepare-commit`** or `npm run verify:pages` for CI parity
- [ ] New shader node? **`add-shader-node`** skill + **`shaders/node-standards.mdc`**

## 6. Try the app

- [ ] `npm install && npm run dev`
- [ ] Optional dev flags: `?renderBackend=webgl|webgpu|auto` (see **`AGENTS.md`**)
