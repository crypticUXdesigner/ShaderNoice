# 04 — Unify Targets UI — parameter-driver-panel-ux-v2

## Agent instructions (START HERE)

Follow sections in order. Scope is **driver panel remapper surfaces** only unless duplication is trivial.

Use existing **`DriverConnectionTargetTags.svelte`** and **`resolveDriverConnectionTargetDisplay`**.

## Overview

Replace **`RemapperConnectionList`** (menu rows) on remapper cards in the parameter driver panel with **`DriverConnectionTargetTags`** so audio and MIDI show the same **Targets** section (badges, reveal in node editor, active param highlight).

## Scope

### In

- **`RemapperCard.svelte`:** Swap `RemapperConnectionList` for `DriverConnectionTargetTags` with `sectionLabel="Targets"`.
- Map `getRemapperParameterConnections` → `DriverConnectionTargetDisplay` via `resolveDriverConnectionTargetDisplay` (same as MIDI card).
- Pass `activeTargetNodeId` / `activeTargetParamName` when panel has open port context (add props to `RemapperCard` if missing).
- **`AudioDriverPanelContent`**, **`AudioSignalPickerCompact`**, **`AudioSignalPickerLargeContent` (driver paths):** thread active param props into remapper cards.
- Visual parity: spacing under card editor, tag/badge styles match MIDI.

### Out

- Deleting **`RemapperConnectionList.svelte`** globally (may still be used elsewhere—grep before remove).
- MIDI card targets (already uses `DriverConnectionTargetTags`).

## Dependencies

### Prerequisites

- **01** (optional).

### Provides

- Consistent “who this drives” affordance across audio and MIDI.

### Blocks

- **06**

## Implementation tasks

1. Extend `RemapperCard` props for active target + `onRevealParameter` (if not already complete).
2. Replace connection list markup with `DriverConnectionTargetTags`.
3. Update call sites to pass graph/nodeSpecs for resolution.
4. Storybook/screenshot: remapper with 0, 1, and 2+ targets; active param highlighted.
5. Run **`npm run type-check && npm test`**.

## Technical notes

- `RemapperParameterConnectionTarget.label` vs `DriverConnectionTargetDisplay.paramLabel`—use resolver for one shape.
- Keep aria-label **Targets** on the list for screen readers.

## Completion

✅ Done when remapper cards in the driver panel show **Targets** badges matching MIDI envelope cards, with reveal navigation working.

### Final steps

- Mark task **04** ✅ in **`_OVERVIEW.md`**.
