# ShaderNoice

A web-based node-based shader editor for procedural shader art using WebGL. Build shader graphs by connecting nodes; the preview updates as you edit.

> **Prototype status:** The app is under active development. Behavior and file formats can change between releases. Some features depend on browser capabilities (for example WebCodecs for video export).

**Repository:** [github.com/crypticUXdesigner/ShaderNoice](https://github.com/crypticUXdesigner/ShaderNoice)

🌐 **[Live demo](https://crypticUXdesigner.github.io/ShaderNoice/)**

## Features

- **Node graph editor** — Visual editor for composing shaders; pan, zoom, selection, and context menus
- **Live preview** — Real-time shader output while you build
- **Large node library** — 150+ nodes: noise and patterns, 2D/3D shapes and ray marching, color (including OKLCH), math, blending, masking, and post-processing
- **Audio** — Load tracks, frequency bands and remappers, and drive parameters from audio (see optional env vars below for Audiograph waveforms)
- **Timeline & automation** — Automate parameters over time with curves
- **Presets** — Save and load graphs as JSON; built-in presets under `src/presets/`
- **Export** — Still images (PNG, JPEG, WebP) at custom resolution; **video export** (WebCodecs) with optional audio where the browser supports it
- **Undo/redo** — History for graph edits; cleared when loading a preset
- **Copy/paste** — Duplicate and move nodes between graphs
- **Help** — Node documentation and keyboard shortcut reference in the UI

## Getting started

1. Install dependencies:

```bash
npm install
```

2. Start the dev server:

```bash
npm run dev
```

3. Open **http://localhost:3000/ShaderNoice/** (Vite `base` matches the GitHub Pages path; see `vite.config.ts` if the port changes).

Optional: copy `.env.example` to `.env` for local API tokens or RPC URL overrides (do not commit `.env`).

## Usage

### Creating a composition

1. **Add nodes** — Use the side panel to search and add nodes, or add from the canvas where supported
2. **Connect** — Drag from output ports to compatible inputs (one connection per port)
3. **Parameters** — Select a node to edit parameters; use the signal picker where ports accept audio or signals
4. **Preview** — The viewport updates as the graph changes
5. **Save** — Use the top bar to download the graph as JSON; add files under `src/presets/` to ship them as built-in presets
6. **Export** — Export a still image at a chosen size, or use **Export video** when available (browser must support WebCodecs)

### Keyboard shortcuts

Common shortcuts:

- `Delete` / `Backspace` — Remove selected nodes
- `Ctrl/Cmd+Z` — Undo
- `Ctrl/Cmd+Shift+Z` — Redo
- `Ctrl/Cmd+C` / `Ctrl/Cmd+V` — Copy / paste
- `Ctrl/Cmd+A` — Select all nodes
- `Ctrl/Cmd+D` — Duplicate selection

Use the in-app **keyboard shortcuts** dialog for the full list (including spacebar pan when not typing).

## Project structure

```
src/
├── data-model/          # Graph types, validation, serialization, migrations
├── lib/                 # Svelte 5 app shell and UI (`lib/components/`, `App.svelte`)
├── runtime/             # WebGL runtime, uniforms, audio/waveform services
├── shaders/
│   ├── nodes/           # Node specs and GLSL pieces
│   └── NodeShaderCompiler.ts
├── video-export/        # WebCodecs video/audio export pipeline
├── styles/              # Global CSS, tokens, node category styles
├── utils/               # Export, errors, presets, helpers
├── presets/             # Built-in preset JSON
└── main.ts              # Entry point
```

## Tech stack

- **TypeScript** — Strict typing across the repo
- **Svelte 5** — Runes-based UI
- **Vite** — Dev server and production build
- **WebGL / GLSL** — Preview and export rendering
- **Vitest** — Unit tests (`npm test`)
- **Phosphor Icons** — Icon set (see `scripts/build-phosphor-icons.ts`)
- **mediabunny** — Media helpers used in the export pipeline

## Environment variables

Optional variables: copy `.env.example` to `.env`. **Do not commit `.env`** — it may contain secrets and is gitignored.

| Variable | Description |
|----------|-------------|
| `VITE_AUDIOGRAPH_API_URL` | Optional. Base URL for the Audiograph RPC (default: `https://rpc.audiotool.com`). When available, waveforms can be fetched via `GetAudiographs`; otherwise decoding falls back to the client. |
| `VITE_AUDIOTOOL_API_TOKEN` | Optional. `Authorization: Bearer` token when the RPC requires auth. |

All `VITE_*` values are inlined at build time and visible in the client bundle. Keep tokens out of the repo and out of `.env.example`.

## Development

### Scripts

- `npm run dev` — Dev server
- `npm run build` — Production build to `dist/`
- `npm run type-check` — `tsc --noEmit`
- `npm test` — Vitest
- `npm run lint` — ESLint (TS + Svelte + Storybook config)
- `npm run check` — Type-check, tests, and lint (recommended before commit)
- `npm run preview` — Serve the production build locally
- `npm run a11y` — Accessibility checks (expects a running preview; see script / baseline doc)
- `npm run storybook` — Storybook on port 6006
- `npm run build-storybook` — Static Storybook to `storybook-static/` (runs in CI)
- `npm run generate-stories` — Scaffold missing `*.stories.ts` next to components

Utility scripts: `npm run migrate` (preset/data migrations), `npm run build-phosphor-icons`, `npm run build-favicons`.

### Storybook

UI lives under `src/lib/components/` with colocated `*.stories.ts`. Run `npm run storybook` to browse components.

### Building

```bash
npm run build
```

Output is written to `dist/`.

## Contributors

- **[AGENTS.md](./AGENTS.md)** — How the repo is organized: rules in `.cursor/rules/`, user-facing behavior in `docs/user-goals/`, and workflow skills
- **`docs/user-goals/README.md`** — Index of user-goals docs (product behavior by area)

Before pushing to **`main`**, run **`npm run verify:pages`** — same blocking steps as the GitHub Pages workflow (audit at high level, `check`, `build`, Storybook). After changing dependencies, run **`npm ci`** first so the lockfile matches CI.

## Deployment

Pushes to **`main`** trigger GitHub Actions: install (`npm ci`), `npm audit --audit-level=high`, type-check, tests, lint, `npm run build`, `npm run build-storybook`, then Playwright-based a11y against a preview server (non-blocking `continue-on-error`). The **`dist/`** artifact is deployed to **GitHub Pages**.

Public URL: **https://crypticUXdesigner.github.io/ShaderNoice/**

## License

All Rights Reserved. Unauthorized copying, modification, distribution, or use of this software is strictly prohibited.
