# 09 — Overview, Swap, and connect polish — parameter-drivers-v1

## Agent instructions (START HERE)

Depends on **06**, **07**, and **08**. Milestone **C** closeout. Update user-goals + **`_OVERVIEW.md`** when done.

## Overview

Overview mode (`layoutMode === 'overview'`) is the **preset library + connect** surface for audio and MIDI. Animation has **no shared preset library** — overview should say so honestly and not pretend to offer “swap preset.”

Unify:

- Left nav = filter library (bands / envelope presets)
- Main = editor for selection
- Toolbar = **Connect** + **New preset** (single location — dedupe card-level Connect where redundant)
- **Swap** footer button = **Browse drivers** (opens overview); rename or subtitle when animation has no library

## Scope

### In

- **Swap button:** Relabel to **Browse** or **Change driver** with tooltip explaining: pick another preset (audio/MIDI) or change kind via tabs. Animation tab copy: “Curves belong to this parameter — use Remove curve to delete.”
- **Connect dedupe:** One primary **Connect** in overview toolbar (`ParameterDriverPanel` or kind content shell). Remove duplicate Connect from `MidiDriverPanelContent` nav **or** from each `MidiEnvelopeCard` header — keep one obvious path.
- **Animation overview:** No fake library nav. Empty / attached states use same copy structure as audio/MIDI empty states (icon, title, body, primary CTA). Secondary link: “Edit on timeline” optional hint only.
- **`TimelineCurveEditor` in focused mode:** Hide or collapse timeline-only chrome (region index `# N`, redundant trash, loop tools) when `embedded` + driver focused — expose via “Advanced” disclosure if needed for power users.
- **Empty states:** Shared pattern across three kinds (match **`07`** header work).
- **`docs/user-goals/12-parameter-drivers.md`:** Document unified overview pattern + animation exception; remove stale “planned” MIDI labels if any remain.
- **`docs/implementation/README.md`:** Note milestone C shipped.

### Out

- New preset categories or MIDI polyphony UI.
- Timeline panel redesign.

## Dependencies

### Prerequisites

- **06** semantics, **07** focused header, **08** MIDI preset sharing.

### Provides

- Milestone C complete; parameter driver UX family feels like one product.

### Blocks

- —

## Implementation tasks

1. Rename **Swap** → **Browse** (or dual label: icon + “Browse”) in `ParameterDriverPanel` footer; update `aria-label` / tooltips.
2. Consolidate MIDI **Connect** / **New envelope** into shell toolbar only; cards show selection + connected-param badges.
3. Audio overview: verify Connect remains on `RemapperCard` **or** move to toolbar when remapper selected — pick one pattern, document in user-goals.
4. Animation overview: add explicit no-library copy; ensure **Browse** from focused animation opens overview without implying preset pick.
5. `TimelineCurveEditor`: add `compactDriverMode` (or extend `embedded`) to suppress region trash/index row in parameter driver focused shell.
6. Empty-state pass on `AnimationDriverPanelContent`, `MidiDriverPanelContent`, `AudioDriverPanelContent`.
7. Manual walkthrough: add audio remapper from port → Browse → switch MIDI preset → animation Remove curve → all footers/headers consistent.
8. Final docs + mark milestone C 100% in **`_OVERVIEW.md`**.

## Technical notes

- `userPinnedOverview` + `scrollSession` in `ParameterDriverPanel` — preserve when refactoring toolbar.
- Storybook: overview mode for each kind after Connect dedupe.

## Completion

✅ Done when Swap/Browse labeling is honest for animation, Connect appears once per overview kind, animation curve editor drops confusing duplicate chrome in focused driver mode, user-goals + implementation README updated, **`npm run verify:pages`** or standard checks green.

### Final steps

- Mark **09** ✅; set **`_OVERVIEW.md`** milestone C to 100%.
