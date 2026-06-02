# 03B — Param group header contrast — node-category-contrast-v1

## Agent instructions (START HERE)

Depends on task **01**. Group headers use `--param-group-header-color` on `.group-header` in `NodeBody.svelte` (`text-3xl`, weight 900) — tier **≥ 3:1** vs **node body background** (not param grid nested bg unless header sits on grid).

Avoid making group headers louder than node titles unless body is very dark.

## Overview

Fix **tone-on-tone param group headers** that nearly disappear against the node body.

## Scope

### In

| Category / sub | Pair | Review ratio | Fix direction |
| --- | --- | --- | --- |
| **Global fallback** | gray-40 on gray-50 | ~1.06:1 | Fix default in `tokens-node-editor.css` or `default.css` to ≥ 3:1 |
| utilities | yellow-gray-110 on blue-gray-120 body | ~1.39:1 | Darken text to yellow-gray-130 or lighten body band behind header |
| mask | violet-gray-110 on violet-gray-gray-100 body | ~1.48:1 | Use gray-130 or violet-gray-130 print |
| blend | red-gray-gray-80 on red-gray-gray-50 body | ~2.4:1 | Darken to red-gray-gray-40 or gray-130 |
| effects stylize | red-purple-gray-70 on red-purple-gray-10 body | ~2.1:1 | Shift to red-purple-gray-110+ or add header strip bg |
| patterns structured | cyan-40 on cyan-80 body | ~2.8:1 | cyan-120+ or lighter header band |
| sdf | cyan-gray-110 on blue-gray-80 body | ~3.4:1 | Bump to ≥ 3:1 confirmed (borderline) — target 4.5 if easy |

Categories with OK group headers (math, effects filter, distort, audio, output, midi, inputs): verify only.

**Inputs layout groups:** `.layout-group .group-header` uses `#ffffff14` — ensure `--param-group-header-color-inputs` (gray-10) still passes on that surface.

### Out

- Group header typography size/weight; divider styling

## Dependencies

### Prerequisites

- Task **01**.

### Provides

- Readable section headers in all categories.

### Blocks

- Task **06**.

## Implementation tasks

1. Audit `group-header-*` pairs.
2. Fix global fallback token so uncategorized nodes never hit 1:1.
3. Per failing category, adjust `--param-group-header-color-{cat}` and/or add subtle **header strip** background on `.group-header` in category CSS (last resort).
4. Canvas check: utilities, mask, blend, effects stylize nodes with multiple param groups.
5. Audit + `--baseline`; build + tests.

## Technical notes

- Optional pattern: `color-mix(in srgb, var(--body-light) 12%, transparent)` strip behind header — document in category file if used.
- Color-map row actions inherit group header area — ensure button chips still pass after header bg changes.

## Completion

✅ Done when all group-header manifest pairs ≥ 3:1 (≥ 4.5:1 where body is mid-tone and header acts as primary label), `--baseline` passes.

### Final steps

- Mark task **03B** ✅ in **`_OVERVIEW.md`**.
