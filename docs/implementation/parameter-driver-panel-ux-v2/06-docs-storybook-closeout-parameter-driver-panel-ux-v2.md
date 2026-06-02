# 06 — Docs + Storybook closeout — parameter-driver-panel-ux-v2

## Agent instructions (START HERE)

Follow sections in order. Depends on **02A**, **02B**, **03**, **04**, **05** (ship after UX tasks merge or verify on integration branch).

Update docs to match **actual** UI—no “planned” MIDI/driver labels.

## Overview

Document the unified parameter driver **overview + connect** interaction matrix in user-goals; add Storybook coverage for regression; register package in implementation README; mark package complete in **`_OVERVIEW.md`**.

## Scope

### In

- **`docs/user-goals/12-parameter-drivers.md`:**
  - Overview: nav selects **one** library item; main edits selection.
  - Connect: **primary on remapper/envelope card** (audio + MIDI); animation exception (**Add** / **Edit curve**).
  - Remove/improve stale lines implying MIDI toolbar Connect or “Connect on toolbar when remapper selected.”
  - Targets: shared badge list for audio + MIDI.
  - Audio: band analysis disclosure note (optional one line).
- **`docs/implementation/README.md`:** Add row for **`parameter-driver-panel-ux-v2/_OVERVIEW.md`** (active).
- **Storybook:**
  - Extend `ParameterDriverPanel.stories.ts` or add `DriverPanelUxV2.stories.ts` with overview states: audio one-band, MIDI single card, animation no-library, empty states per kind.
- **`parameter-drivers-v1/_OVERVIEW.md`:** Optional one-line pointer under Notes: “Post-ship UX polish → **`parameter-driver-panel-ux-v2`**” (no task file edits in v1).

### Out

- Changing bypass-on-node package.
- Architecture docs outside user-goals unless one cross-link is useful.

## Dependencies

### Prerequisites

- **02A**, **02B**, **03**, **04**, **05**.

### Provides

- Documented, testable closeout for package.

### Blocks

- —

## Implementation tasks

1. Update **`12-parameter-drivers.md`** sections 3–4 (flows + disconnect table footnotes if needed).
2. Add Storybook stories with mock graph/audioSetup fixtures (reuse patterns from existing panel stories).
3. Add implementation README index row.
4. Manual checklist: port double-click → overview each tab → connect from card → Browse → focused footer → Disconnect.
5. Run **`npm run verify:pages`** or project standard: **`npm run type-check && npm test && npm run lint && npm run build`**.

## Technical notes

- Screenshot optional in PR description; Storybook is the visual contract.
- If **02A** and user-goals disagreed before this task, user-goals wins after verification.

## Completion

✅ Done when user-goals match shipped UI, Storybook covers overview + empty states for three kinds, implementation README lists the package, and full project checks pass.

### Final steps

- Mark task **06** ✅; set **`_OVERVIEW.md`** progress to 100%.
