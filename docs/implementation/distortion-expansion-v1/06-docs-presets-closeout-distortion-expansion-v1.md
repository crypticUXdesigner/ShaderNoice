# 06 — Docs, presets, closeout — distortion-expansion-v1

## Agent instructions (START HERE)

Follow sections in order. **Depends on tasks 01–05** (00 if 02/05 shipped). Read **`_OVERVIEW.md`**.

## Overview

Close the package: help entries, demo presets, search tags, enum mappings, optional WebGPU fixtures, README link, full verify.

## Scope

### In

**Documentation (`src/data/node-documentation.json`):**

- Keys: `node:crease-fold`, `node:cellular-slip`, `node:mobius-portal`, `node:wake-smear`, `node:circle-inversion`.
- Each: **title** = `displayName`, tagline, description (overlap vs existing nodes), inputs/outputs, `relatedItems` (e.g. Kaleidoscope, Block Glitch, Radial Warp, Spotlight, Cells).
- **Möbius Portal:** note conformal / pole singularity + safe defaults.
- **Wake Smear:** example graph mentioning **Path Drive** where applicable.
- **Circle Inversion:** explicit “not KIFS SDF / not Spotlight color”.

**Presets (`src/presets/`):**

| File | Shows |
| --- | --- |
| `crease-fold-demo.json` | Beat-friendly fold + pattern |
| `cellular-slip-demo.json` | Glass plates before **Cells** or noise |
| `mobius-portal-demo.json` | Portal + kaleidoscope chain (from brief) |
| `wake-smear-demo.json` | Clean vs optional chaotic variant |
| `circle-inversion-demo.json` | Conservative bubble layout |

Rebuild preset index if project uses generated list (`src/presets/README.md`).

**Search / UI:**

- `generate-node-search-tags.mjs` or `nodeSearchTags.ts` — tags: warp, fold, voronoi, portal, datamosh, inversion.
- `parameterEnumMappings.ts` — `pathPreset`, `layoutPreset` where ints used.

**Tests:**

- `NodeShaderCompiler.test.ts` — one graph per node (or combined distort chain).
- `wgslMvpCompileSnapshots.test.ts` — add snapshots for new node types if repo pattern requires.
- Optional: `webgpuGoldenHarness` fixture for **crease-fold** + **mobius-portal** only (skip if harness budget tight — document in `_OVERVIEW` notes).

**README:** Add row to `docs/implementation/README.md` for this package.

### Out

- Shipping Liquify / Seam Teleport / Lens Lattice.
- Deleting **Spotlight** or merging with **Circle Inversion**.

## Dependencies

### Provides

- User-discoverable docs + starter graphs; package ✅

### Blocks

- —

## Completion

✅ Done when all five `node:*` entries exist, ≥5 demo presets load, `npm run type-check && npm run test && npm run lint && npm run build` green, `_OVERVIEW.md` work table all ✅ and **Overall** 100%.

### Final steps

- Update `_OVERVIEW.md` progress tracker + **Last reviewed** date.
- Mark package ready for `/implement-task` handoff per node if splitting PRs.
