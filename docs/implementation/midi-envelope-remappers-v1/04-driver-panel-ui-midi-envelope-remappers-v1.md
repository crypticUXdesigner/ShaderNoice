# 04 — Driver panel UI — midi-envelope-remappers-v1

## Agent instructions (START HERE)

Follow sections in order. Depends on **02** APIs and **03** for live values. Mirror **`AudioDriverPanelContent.svelte`** layout; use **svelte-code-writer** / project Svelte rules for new components.

Do **not** reintroduce **Connect** on the envelope card—that belongs on remapper cards (**05** wires handlers).

## Overview

Refactor MIDI driver overview/focused layouts: left nav = envelope presets; main column = envelope section (tracks + ADSR, no output range) + **remapper list** with cards analogous to **`RemapperCard`**.

## Scope

### In

- **`MidiDriverPanelContent.svelte`:** band-style sections; `remappersByPreset` map; “Add target range” / “Add remapper”; nav unchanged (envelope list + All).
- **`MidiRemapperCard.svelte`** (new): out-only range editor (`RemapRangeEditor` with out handles or dedicated props); `DriverConnectionTargetTags`; live incoming (preset level) + outgoing (remapped)—wire when **03** exposes level helper for UI tick.
- **`MidiEnvelopeCard.svelte`:** remove `outMin`/`outMax` from `AdsrEnvelopeEditor`; remove Connect/Disconnect header actions (moved to remapper card).
- **Focused mode:** show remapper attached to current param + parent envelope context (tracks/ADSR).
- **`ParameterDriverPanel.svelte`**, **`AudioSignalPickerCompact.svelte`:** MIDI paths use `remapperId` focus (like `focusRemapperId` for audio).
- Storybook stubs if existing MIDI panel stories break.

### Out

- Delete confirm policy (**05**); user-goals prose (**06**).

## Dependencies

### Prerequisites

- **02** ✅; **03** ✅ recommended for accurate live needles.

### Provides

- Shipped UX matching audio band/remapper layout.

### Blocks

- **06**

## Implementation tasks

1. Add `MidiRemapperCard` with props aligned to `RemapperCard` (connect handlers optional until **05**).
2. Restructure overview sections: envelope header + tracks + ADSR; remapper sub-list per preset.
3. Implement add/remove remapper actions via **02** helpers (`onGraphUpdate`).
4. Remove preset-level Connect UI; show targets on remapper cards via `getMidiEnvelopeRemapperConnections`.
5. Update focused empty state copy: browse library → connect **target range** to parameter.
6. **`npm run type-check`** + visual smoke (overview + focused).

## Technical notes

- Reuse **`DriverConnectionTargetTags`** and **`resolveDriverConnectionTargetDisplay`**.
- Section spacing/CSS: follow audio `.band-section` / `.remappers-list` patterns in `AudioDriverPanelContent`.

## Completion

✅ Done when MIDI driver overview shows envelope + remapper cards, envelope card has no Connect, and remapper cards display range editor + targets list.

### Final steps

- Mark **04** ✅ in **`_OVERVIEW.md`**.
