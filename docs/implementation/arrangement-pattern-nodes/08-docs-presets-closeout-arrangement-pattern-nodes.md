# 08 — Docs, presets, closeout — arrangement-pattern-nodes

## Agent instructions (START HERE)

Follow sections in order. **Depends on all node tasks (03–07D)** shipped. Read **`_OVERVIEW.md`** and **`export-pipeline-check`** / **`preset-maintenance`** skills as needed.

## Overview

Close the package: **help text**, **search tags**, **demo presets**, **user-goals** touch-up, and **performance sanity** on dense arrangement fixture.

## Scope

### In

- **`node-documentation.json`:** Complete entries for all ten `node:*` ids — taglines, descriptions, composition examples (e.g. `Note Ripple Field → Mix → Color LUT → Output`), related links to **Notes** / **Regions** (“complement, not duplicate”).
- **Presets:** `src/presets/note-ripple-field-demo.json` minimum; ideally one demo per node or grouped **`arrangement-patterns-showcase.json`** with imported snapshot note in preset metadata/README.
- **Search tags:** Run / update `generate-node-search-tags.mjs` if repo uses it for new ids.
- **User goals:** Short addendum to `docs/user-goals/06-audio.md` or `04-nodes-and-parameters.md` — arrangement **pattern** nodes vs literal DAW nodes.
- **Performance check:** Document in `_OVERVIEW.md` Notes: dense snapshot (~1280+ notes) compile time + preview FPS spot-check on **Note Ripple Field** and **Chord Voronoi Bloom** (worst cases).
- **WGSL snapshots:** Add/update `wgslMvpCompileSnapshots.test.ts` entries if project convention requires for new node types.
- **Package status:** Mark all WP rows ✅; set overall progress 100%.

### Out

- New nodes; bake refactors.

## Dependencies

### Prerequisites

- **03**, **04**, **05**, **06A**, **06B**, **06C**, **07A**, **07B**, **07C**, **07D**

### Provides

- Shipped, documented package.

### Blocks

- —

## Completion

✅ Done when all ten nodes have help + at least one loadable demo preset, user-goals pointer updated, `npm run verify:pages` or project-standard full verify green, `_OVERVIEW.md` progress 100%.

### Final steps

- Update `_OVERVIEW.md` row **08** → ✅ + date.
- Add row to `docs/implementation/README.md`.
