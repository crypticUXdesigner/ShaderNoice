# Node category contrast v1 — readability hardening

## Mission

Fix **sub-optimal contrast and readability** across all node-editor category palettes (headers, param cells, knobs, and in-node controls) identified in the 2026-05-31 design review. Changes must **improve or preserve** legibility — never ship a token swap that lowers contrast on its target surface.

## Goals

- **Primary:** Every category/subcategory meets minimum contrast targets on intentional text/control pairs (see task **01** thresholds).
- **Knob UX:** Background arc track visible (≥ **3:1** vs param-cell surface) in every category; active arc/marker unchanged semantically.
- **Token hygiene:** Single source for param-cell text (`--param-label-color` wired on `.node.{slug}`); fix invalid `cyan-gray-140` reference.
- **Connected state:** Co-defined label + background tokens where connected fills currently harm label or value readability.
- **Global controls:** Toggle, param-control borders, and embed-slot UIs readable on both light and dark category bodies without breaking category identity.
- **Verification:** Automated contrast script + manual canvas spot-check per category before closeout.

## Success & constraints

| Must-have | Detail |
| --- | --- |
| Scope | Node editor canvas nodes only (`src/styles/components/node-categories/`, shared param tokens, param UI components). **Out:** side panel cards, help callouts, timeline (unless they share the same broken token). |
| Tokens | Adjust existing scale steps or `color-mix` — prefer **no new scale steps** unless fixing `cyan-gray-140`-class gaps. |
| Reserved teal | **`--reserved-animated-connected`** semantics unchanged (connected/animated state still reads as teal). |
| Regression gate | Task **01** script: **no merge** if any previously-OK pair drops below its tier; new fixes must meet tier minimums. |
| Checks | `npm run type-check && npm test && npm run lint && npm run build` green; task **01** script passes; task **06** manual sweep signed off. |

**Non-goals:** Re-theming entire categories for aesthetics; light-mode canvas; rewriting node layout; side-panel icon card redesign.

## Architecture

```
scales.css (color steps)
        │
        ▼
node-categories/*.css  ──► .node.{slug} custom properties
        │                      (--param-label-color, --knob-ring-color, …)
        ▼
ParamCell / Knob / Toggle / ValueInput / NodeBody
        │
        ▼
scripts/node-category-contrast.ts  ← task 01 (CI-friendly audit)
```

**Safe change pattern (every task):**

1. Identify foreground/background **pair** (not isolated token).
2. Adjust lighter or darker step until ratio meets tier.
3. Re-run contrast script + spot-check **adjacent** pairs on same surface (hover/active/connected).
4. Reject change if any other pair on that category regresses.

## Work items

| ID | Task | Status | Provides | Blocks |
| --- | --- | --- | --- | --- |
| 01 | [Foundation + contrast audit](./01-foundation-contrast-audit-node-category-contrast-v1.md) | ✅ | Audit script, `--param-label-color` wiring, broken token fix, tier doc | 02–06 |
| 02 | [Knob ring visibility](./02-knob-ring-visibility-node-category-contrast-v1.md) | ✅ | All categories: visible arc track | 06 |
| 03A | [Header + icon box contrast](./03A-header-icon-contrast-node-category-contrast-v1.md) | ✅ | Title/port/icon pairs per category | 06 |
| 03B | [Param group header contrast](./03B-group-header-contrast-node-category-contrast-v1.md) | ✅ | Group header vs body pairs | 06 |
| 03C | [Param labels + connected states](./03C-param-label-connected-node-category-contrast-v1.md) | ✅ | Label/bg + connected co-tokens | 06 |
| 04 | [Global param controls](./04-global-param-controls-node-category-contrast-v1.md) | ✅ | Toggle, borders, mode btn, knob read-only | 06 |
| 05 | [Embedded UI tokens](./05-embedded-ui-tokens-node-category-contrast-v1.md) | ✅ | Bezier/range/vector/color-picker in-node | 06 |
| 06 | [Verification closeout](./06-verification-closeout-node-category-contrast-v1.md) | ⬜ | Full sweep, README note, ship sign-off | — |

**Execution order:** **01** → (**02** ∥ **03A** ∥ **03B** ∥ **03C** ∥ **04** ∥ **05**) → **06**.

**File conflicts:** Tasks **02–05** all touch `node-categories/*.css` — run **one at a time** or coordinate by category file (inputs.css, math.css, …) to avoid merge pain.

## Progress tracker

- **Overall:** ~93% (tasks 01–05 / 7)
- **Milestone A (guardrails):** task 01 ✅
- **Milestone B (category tokens):** tasks 02, 03A, 03B, 03C ✅
- **Milestone C (shared controls):** tasks 04, 05 ✅
- **Milestone D (ship):** task 06 ⬜

## Notes & risks

- **2026-05-31 task 01:** Added `scripts/node-category-contrast.ts` + 47-pair manifest; `npm run contrast:node-categories` runs `--baseline` regression gate; full audit via `contrast:node-categories:audit`. Wired `--param-label-color` on all `.node.{slug}` blocks; fixed `cyan-gray-140` → `cyan-gray-130` on sdf raymarcher knob value.
- **2026-05-31 task 02:** Raised `--node-knob-ring-color-*` on inputs, math, utilities, shapes, effects.stylize, midi, distort.warp, audio, default; warp active arc/marker separated from value fill (`clean-gray-110`). All 9 `knob-ring` manifest pairs ≥ 3:1; baseline regressions 0.
- **2026-05-31 task 03A:** Lightened header print on inputs (`gray-120`) and blend (`red-gray-gray-120`); raised icon contrast via lighter fg and/or darker icon-box bg on patterns, structured, sdf, shapes, derived, warp, mask, output. All 12 `header-title` + `icon-box` manifest pairs pass tiers; baseline regressions 0.
- **2026-05-31 task 03B:** Fixed global fallback (`gray-110` on gray-50); raised group-header print on utilities (`yellow-gray-50`), blend (`red-gray-gray-110`), mask (`violet-gray-130`), patterns structured (`cyan-120`), effects stylize (`red-purple-gray-110`); bumped sdf to `cyan-gray-120` (4.73:1). Corrected structured manifest bg to `cyan-gray-50`. All 9 `group-header` pairs ≥ 3:1; baseline regressions 0.
- **2026-05-31 task 03C:** Co-tuned param labels + connected pairs: inputs connected label `gray-130`; math connected `clean-gray-120` on `clean-gray-60` tint; patterns normal `red-purple-120` / connected `red-purple-70`; sdf `cyan-gray-120` + connected `cyan-gray-130` on `blue-gray-80`; raymarcher label `cyan-gray-120`; distort connected value `teal-50` on `red-orange-100` (arc stays `--reserved-animated-connected`). All 11 `param-label` + `connected-*` manifest pairs pass tiers; `--baseline` regressions 0. Mask label left at `gray-40` (4.38:1 warn, optional per task).
- **2026-05-31 task 04:** Category-scoped toggle/param-border/mode tokens on `.node` in `base.css` (color-mix from `--param-label-color` / `--param-control-*`); explicit math + utilities overrides; global toggle bump (`gray-80` off track); `Toggle.svelte` uses `--toggle-border`; `ModeButton.svelte` wired to `--param-mode-button-*`; knob read-only dims ring only (`--knob-readonly-ring-opacity: 0.7`); enum secondary chips get `--param-control-border`. Manifest +4 pairs (toggle/border/mode); 51 pairs audit pass; `--baseline` regressions 0.
- **2026-05-31 task 05:** `.node` embed propagation in `base.css` (`--embed-slot-bg` + bezier/range/vector/color-map tokens via color-mix from param tokens); per-category overrides in math, inputs, utilities, mask, effects, sdf, distort; `tokens-node-editor.css` wires range/vector bg to `--embed-slot-bg`; `RemapRangeEditor.svelte` labels use `--range-editor-label-color`. Manifest +8 pairs (bezier-label, range-label, embed-bg); 59 pairs audit pass; `--baseline` regressions 0. ADSR in-node N/A (floating panel only).
- **2026-05-31 follow-up (manual QA):** Audit manifest used wrong surfaces for several pairs (patterns labels vs knob chip, not body gradient; distort connected value vs cell salmon, not dark `--knob-value-bg`). Fixed param labels (patterns → `red-purple-60`), connected knob values (distort → `--reserved-animated-connected` on `clean-gray-60`), and active arc/marker tokens across patterns, distort.warp, utilities, math (all subgroups), inputs, mask, midi, default, effects.stylize. Manifest +4 `knob-active-arc` pairs; 63 pairs pass; `--baseline` regressions 0.
- **Mid-tone headers** (inputs, math, blend): darkening print OR lightening header end — pick per category so icon box still harmonizes.
- **Transparent param cells:** prefer explicit cell tint over relying on body gradient when label contrast is fragile.
- **Distort connected value:** teal on salmon bg failed (~1.3:1) — needs **both** bg and value color adjustment, not teal alone.
- **Knob ring fixes** can make rings look heavier — keep stroke widths; change hue/lightness only.
- **Embed theming (05)** is highest regression risk on light bodies — use subtle `color-mix` from category body tokens, not full palette rewrites.
