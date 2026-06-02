# 01 — Data model + migration — midi-envelope-remappers-v1

## Agent instructions (START HERE)

Follow sections in order. Use **`data-model-migration`** skill patterns for serialization and idempotent load migration. Do **not** change driver panel UI or evaluator logic in this task—only types, graph fields, sanitize, and migration tests.

## Overview

Introduce **`MidiEnvelopeRemapper`** on `NodeGraph`, remove output range from **`MidiEnvelopePreset.envelope`**, and change bindings to reference **`remapperId`**. Ship load migration from existing `presetId` + preset-level `outMin`/`outMax`.

## Scope

### In

- **`midiEnvelopeTypes.ts`:** `MidiEnvelopeRemapper`; narrow `MidiEnvelopeDefinition` (ADSR + `velocityToPeak` only); `MidiEnvelopeBinding.remapperId`; update `ResolvedMidiEnvelopeBinding` shape for downstream (may still flatten resolved fields).
- **`types.ts`:** `midiEnvelopeRemappers?: MidiEnvelopeRemapper[]`.
- **`midiEnvelopeRemapperMigration.ts`:** idempotent migration (after `migrateLegacyMidiEnvelopeBindings`).
- **`serialization.ts`:** sanitize remappers; accept legacy `presetId` on bindings until migration runs; strip `outMin`/`outMax` from preset envelope on load.
- **`graphLegacyMigrations.ts`** / registry hook if project uses centralized migration list.
- **`immutableUpdates.ts`:** copy helpers for remapper arrays on graph clone.
- **`index.ts`:** export new types.
- Tests: round-trip JSON; graph with 1 preset + 2 bindings → 1 remapper + 2 bindings with same `remapperId`; preset without `outMin`/`outMax`.

### Out

- CRUD helpers (**02**), validation rules (**02**), evaluator (**03**), UI (**04**).

## Dependencies

### Prerequisites

- Shipped MIDI preset+binding model (`parameter-drivers-v1` task **08**).

### Provides

- Stable serialized shape for **02**–**06**.

### Blocks

- **02**, **03**, **04**, **05**, **06**

## Implementation tasks

1. Define `MidiEnvelopeRemapper` (`id`, optional `name`, `envelopePresetId`, `outMin`, `outMax`).
2. Remove `outMin`/`outMax` from preset `MidiEnvelopeDefinition`; keep defaults on remapper (`0`/`1`).
3. Change binding field to `remapperId`; keep legacy type guard for inline/old `presetId` rows during sanitize.
4. Implement migration: per preset, create remapper `remapper-{presetId}` with former preset out range; rewrite bindings; auto remapper for presets with zero bindings.
5. Wire migration in `sanitizeGraphMidiEnvelopeBindings` pipeline.
6. Add **`midiEnvelopeRemapperMigration.test.ts`** (and extend serialization test if present).

## Technical notes

- Stable remapper id `remapper-{presetId}` keeps re-load idempotent (mirror `band-{bandId}` remapper migration).
- If two legacy bindings share a preset but resolved envelopes differed (shouldn’t happen on one preset row), migration uses preset’s single stored range.

## Completion

✅ Done when old saved graphs deserialize with remappers + `remapperId` bindings, preset envelopes have no out range fields, and **`npm test`** passes for migration/serialization cases.

### Final steps

- Mark **01** ✅ in **`_OVERVIEW.md`**; unblock **02**.
