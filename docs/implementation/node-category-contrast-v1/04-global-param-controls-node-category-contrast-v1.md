# 04 — Global param controls — node-category-contrast-v1

## Agent instructions (START HERE)

Depends on task **01**. Prefer **category-scoped CSS variables** on `.node` over hardcoding in Svelte — e.g. `.node { --toggle-bg-off: … }` mapped from category tokens in `base.css` or per-category files.

Test on **light-body** categories (math, inputs, distort) and **dark-body** (mask, utilities).

## Overview

Fix shared in-node controls that **ignore category palette** today: toggle switch, param-control borders, param mode button, knob read-only dimming.

## Scope

### In

| Control | Issue | Approach |
| --- | --- | --- |
| **Toggle** (`Toggle.svelte`) | Global gray tokens; ~1.08:1 track on math body; label ~2.61:1 | Add optional overrides on `.node`: `--toggle-bg-off`, `--toggle-border`, `--toggle-slider-bg`; derive from category body lightness OR use contrast-safe global bump |
| **Param control border** (`ValueInput`, enum `Button`) | `gray-60` border vanishes on leaf-gray/yellow-gray chips | Category `--param-control-border` via `color-mix` from value color + bg |
| **Param mode button** | `#00000034` on `#ffffff32` static glyph | Increase static opacity or use `color-mix` from `--param-label-color` |
| **Knob read-only** | Full knob at `--opacity-disabled` | Apply opacity to **ring only** or reduce to ~0.7 on ring; keep value box full contrast |
| **Color map active buttons** | Global teal active | OK — only adjust if category task causes clash |

Implement mapping in `node-categories/base.css` where shared, extend per-category only when needed.

### Out

- Toggle redesign; new component variants
- Floating panel / modal controls

## Dependencies

### Prerequisites

- Task **01**.

### Provides

- Readable toggles and value chips on all category bodies.

### Blocks

- Task **06**.

## Implementation tasks

1. Extend `base.css` with default toggle/param-border fallbacks on `.node`.
2. Update `Toggle.svelte` to use tokens already defined in `tokens-node-editor.css` (no hardcoded `gray-70` border if token exists).
3. Set `--param-control-border` per category or via `color-mix` rule on `.node`.
4. Adjust param mode button tokens in `tokens-node-editor.css` or category override.
5. Refine `Knob.svelte` read-only styling scope (ring vs value-row).
6. Manifest pairs for toggle/border/mode; audit + `--baseline`.
7. Build + tests; canvas toggle param on math + utilities nodes.

## Technical notes

- Toggle **on** state can stay global blue (`--toggle-bg-on`) — state semantics are product-wide.
- Keep `prefers-reduced-motion` untouched.

## Completion

✅ Done when toggle track ≥ 3:1 on math/inputs bodies, param borders visible on utilities/math chips, mode button static glyph ≥ 3:1, connected read-only values readable, `--baseline` passes.

### Final steps

- Mark task **04** ✅ in **`_OVERVIEW.md`**.
