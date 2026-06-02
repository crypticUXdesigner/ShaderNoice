# 06 — Verification closeout — node-category-contrast-v1

## Agent instructions (START HERE)

Depends on **all tasks 01–05** ✅. This is the **ship gate** — do not mark the package done if any manifest pair regressed or manual sweep finds a worse surface than before.

Run **`/prepare-commit`** or at minimum `npm run type-check && npm test && npm run lint && npm run build`.

## Overview

Final verification that node category contrast improvements are **complete, non-regressive, and shippable**.

## Scope

### In

- Run `npm run contrast:node-categories` (strict + `--baseline`)
- **Manual canvas sweep** — one representative node per category/subcategory:

| Category | Suggested preset / node |
| --- | --- |
| inputs | Float Input or OKLab |
| inputs system | Time |
| patterns | Noise |
| patterns structured | Cellular / Voronoi pattern |
| sdf | SDF sphere |
| sdf raymarcher | Raymarcher |
| shapes | Circle |
| shapes derived | Meta-ball |
| math | Add |
| math functions | Pow |
| math advanced | Sin |
| utilities | Remap |
| distort | Transform |
| distort warp | Bulge |
| blend | Mix |
| mask | Threshold |
| effects | Blur |
| effects stylize | Pixelize |
| output | Output |
| audio | Audio Level |
| midi | MIDI CC |
| default | any uncategorized fallback |

- Per node verify: **header title**, **icon**, **group header**, **param label**, **knob ring**, **value chip**, **toggle** (if present), **connected param** (wire one cable)
- Update **`docs/implementation/README.md`** row for this package
- Optional: add brief note to `a11y-baseline.md` only if new axe issues discovered (prefer fix over baseline)
- Mark **`_OVERVIEW.md`** 100% with ship date

### Out

- User-goals doc updates (optional one-liner in `04-nodes-and-parameters.md` only if UX materially changed)
- Side panel contrast pass (future package)

## Dependencies

### Prerequisites

- Tasks **01**, **02**, **03A**, **03B**, **03C**, **04**, **05**.

### Provides

- Shipped, verified node category contrast v1.

### Blocks

- None.

## Implementation tasks

1. Run full audit script; archive output in task comment or PR description.
2. Complete manual sweep checklist above; file follow-up tasks only for **new** issues found (do not expand scope here).
3. Confirm `--baseline`: no previously-OK pair worsened.
4. Full test/build pipeline green.
5. Update README + `_OVERVIEW` progress to 100%.

## Technical notes

- If one category still fails marginally, document explicit deferral in `_OVERVIEW` Notes — do **not** ship regressions elsewhere to compensate.
- Compare before/after screenshots optional but useful for PR review.

## Completion

✅ Done when audit strict mode passes, manual sweep completed with no critical readability regressions, build/tests green, README linked, `_OVERVIEW` at 100%.

### Final steps

- Mark task **06** ✅; set package status **Shipped** with date in `_OVERVIEW.md`.
