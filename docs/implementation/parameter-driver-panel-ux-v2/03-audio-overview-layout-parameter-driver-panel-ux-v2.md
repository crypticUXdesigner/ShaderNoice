# 03 — Audio overview layout — parameter-driver-panel-ux-v2

## Agent instructions (START HERE)

Follow sections in order. Do not remove **FrequencyRangeEditor** attack/release controls—only remove the **duplicate** row in `AudioDriverPanelContent` band settings.

Preserve remapper Connect-on-card behavior from **02A**.

## Overview

Reduce audio overview clutter: default to **one band** in the main column, eliminate duplicate **Attack/Release** fields above the spectrum, and tuck heavy **band analysis** (spectrum + FFT) behind a disclosure so **remappers** stay the focal column content.

## Scope

### In

- **Default nav selection:** On open, `activeNavBandId` = first band (or band of focused remapper)—not `ALL_BANDS` unless user chooses.
- **“All bands”** nav item retained but de-emphasized (secondary/list position) or moved to nav footer—product choice: still available for power users.
- **Remove** `band-settings` rows for **Attack** and **Release** in `AudioDriverPanelContent` (lines duplicate `FrequencyRangeEditor`).
- **Band analysis disclosure** (e.g. **“Band analysis”** / **“Spectrum & FFT”**):
  - Collapsed by default in overview.
  - Contains `FrequencyRangeEditor` (spectrum, frequency bands, attack/release, FFT).
  - Expanded state persisted per session optional (local `$state` OK).
- **Remappers** section remains visible below analysis (always expanded).

### Out

- Changing FFT/analyzer semantics in runtime.
- `AudioSignalPickerLargeContent` / bottom-bar audio browse (unless shared helper extracted—prefer driver panel only).
- Remapper targets UI (**04**).

## Dependencies

### Prerequisites

- **01** (optional; disclosure can use existing `Button` + conditional).

### Provides

- Leaner audio overview aligned with MIDI single-editor density.

### Blocks

- **06**

## Implementation tasks

1. Change default `activeNavBandId` from `ALL_BANDS` to first band when bands exist.
2. Delete duplicate Attack/Release `settings-row` pair; keep Mode + FFT in disclosure or inside editor only (FFT may live only in editor—pick one surface).
3. Add collapsible wrapper around `frequency-wrap` / `FrequencyRangeEditor`.
4. Adjust empty/copy if it references attack row above spectrum.
5. Manual: one band + two remappers—remappers visible without scrolling past large spectrum unless analysis expanded.
6. Run **`npm run type-check && npm test`**.

## Technical notes

- `FrequencyRangeEditor` already receives `attackHalfLifeSeconds` / `releaseHalfLifeSeconds`—single source of truth after dedupe.
- Focused **AudioSignalPickerCompact** may still show spectrum for raw band wire—out of scope unless duplicate there too (note in PR if found).

## Completion

✅ Done when audio overview opens on **one band**, attack/release appear **once** (in spectrum/analysis UI), and band analysis is **collapsed by default**.

### Final steps

- Mark task **03** ✅ in **`_OVERVIEW.md`**.
