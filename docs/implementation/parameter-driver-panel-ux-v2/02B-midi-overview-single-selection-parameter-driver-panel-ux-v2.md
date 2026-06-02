# 02B — MIDI overview single selection — parameter-driver-panel-ux-v2

## Agent instructions (START HERE)

Follow sections in order. Depends on **02A** for Connect on the single visible `MidiEnvelopeCard` (can land same PR).

Do not change MIDI preset/binding data model (**`parameter-drivers-v1/08`**).

## Overview

Fix MIDI overview main column: left nav **selects** one envelope preset; main shows **one** `MidiEnvelopeCard` editor—not a stacked list of full ADSR cards for every preset.

## Scope

### In

- **`MidiDriverPanelContent.svelte` (overview):**
  - Keep left `envelope-nav` filter list.
  - Main `sections`: render **only** `selectedPreset` (fallback: first filtered preset / current binding preset).
  - Remove `envelope-list` `{#each filteredPresets}` full-card stack.
  - Nav click sets `selectedPresetId`; active styles unchanged.
- **Selection sync:** When filter narrows to zero, show filter empty state (existing); when presets exist, always have a valid `selectedPreset`.
- **Live output / connection targets:** Computed for the selected preset only.
- **Empty states:** Unchanged copy for “no presets” (full-width empty still OK without nav).

### Out

- Audio band nav behavior (**03**).
- Shared empty component wiring (**05**).

## Dependencies

### Prerequisites

- **01** (optional).
- **02A** (Connect on the one visible card).

### Provides

- MIDI overview parity with “library + single editor” mental model.

### Blocks

- **06**

## Implementation tasks

1. Replace stacked `envelope-list` with single-card branch keyed on `selectedPreset`.
2. Ensure `selectedPresetId` initializes from `currentPreset` or first filtered item (preserve existing `$effect`).
3. Pass card props: `isSelected={true}`, `onConnect`, `onDisconnect`, targets, tracks—for selected preset only.
4. Verify toolbar **New envelope** still works; creating preset selects it in nav + main.
5. Manual: project with 4+ envelopes—nav switches editor without scrolling past other ADSR graphs.
6. Run **`npm run type-check && npm test`**.

## Technical notes

- `onSelectedPresetChange` callback to shell may still be used for toolbar state—after **02A**, toolbar Connect is removed; callback can remain for future or be cleaned if unused.
- Focused layout unchanged (already single card).

## Completion

✅ Done when MIDI overview main column shows **at most one** full envelope editor and nav selection switches that editor.

### Final steps

- Mark task **02B** ✅ in **`_OVERVIEW.md`**.
