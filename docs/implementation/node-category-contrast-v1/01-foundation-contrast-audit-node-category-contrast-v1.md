# 01 — Foundation + contrast audit — node-category-contrast-v1

## Agent instructions (START HERE)

Follow sections in order. This task **blocks all others** in the package. Do **not** bulk-edit category colors until the audit script and regression baseline exist.

Respect **`css-standards.mdc`** (tokens from `scales.css`), **`design-system.mdc`** (accents = state), and **`tokens-node-editor.css`** conventions.

## Overview

Add a **repeatable contrast audit** for node-category token pairs, wire **`--param-label-color`** on every `.node.{slug}` block, fix the **invalid SDF raymarcher token**, and document minimum contrast tiers so later tasks cannot silently regress readability.

## Scope

### In

- **Script** `scripts/node-category-contrast.ts` (+ `npm run contrast:node-categories` in `package.json`)
  - Parse declared pairs from a maintained manifest (JSON or TS table) covering all findings from the design review
  - Resolve `--color-*` via `scales.css` hex values; support literal `#rgba` where used
  - Report ratio + tier (`fail` / `warn` / `ok`) per pair; exit non-zero on `fail` tier
  - **`--baseline` mode:** fail if any pair currently marked `ok` in manifest drops below its tier (regression guard)
- **Tiers (document in script header + task 06 checklist):**
  - Normal text (param labels, enum text): **≥ 4.5:1**
  - Large/bold (node title, group header `text-3xl` 900): **≥ 3:1**
  - Non-text UI (knob ring track, toggle track): **≥ 3:1**
- **Wire `--param-label-color`** on each `.node.{slug}` (and sub-slugs) to the existing `--node-param-label-color-{cat}` token so `ParamCell` signal names and driver bypass toggles match category labels
- **Fix** `--node-knob-value-color-sdf-raymarcher: var(--color-cyan-gray-140)` → valid step (e.g. `cyan-gray-130`) in `sdf.css`
- **Manifest** lists every pair from review: category slug, surface name, fg token, bg token, tier, current ratio (optional snapshot)

### Out

- Category color tweaks (tasks 02–05)
- Side panel / help token changes
- New scale steps (unless team explicitly adds one for sdf fix — prefer existing step)

## Dependencies

### Prerequisites

- None.

### Provides

- Contrast audit + regression gate; unified param label token wiring; sdf raymarcher token fix.

### Blocks

- Tasks **02**, **03A**, **03B**, **03C**, **04**, **05**, **06**.

## Implementation tasks

1. Create pair manifest from design review (all categories + subcategories + global controls baseline).
2. Implement `scripts/node-category-contrast.ts` with tier checks and `--baseline` regression mode.
3. Add npm script; run once and commit manifest snapshot ratios as comments or JSON `expectedMin`.
4. For each category file, set `--param-label-color: var(--node-param-label-color-{cat})` on `.node.{slug}` (sub-slugs inherit or override explicitly).
5. Fix sdf raymarcher knob value color token.
6. Run `npm run type-check && npm test && npm run lint && npm run build`.

## Technical notes

- Pairs with **gradients:** audit against documented worst-case stop (e.g. math header end = `--color-blue-gray-100`).
- **Transparent cells:** manifest should include body bg token as effective background when cell bg is `transparent`.
- Script output should group by category file for easy task assignment in 02–05.

## Completion

✅ Done when audit script runs in CI locally, `--baseline` passes on current tree, every `.node.*` block sets `--param-label-color`, sdf raymarcher token resolves, and build passes.

### Final steps

- Mark task **01** ✅ in **`_OVERVIEW.md`**; update progress tracker.
