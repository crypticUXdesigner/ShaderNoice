# 02 — Immutable API + validation — midi-envelope-remappers-v1

## Agent instructions (START HERE)

Follow sections in order. Depends on **01** types and migration. Extend **`immutableUpdatesMidiEnvelope.ts`** only; keep graph updates immutable. Do not refactor UI yet.

## Overview

CRUD and resolve helpers for envelope presets, remappers, and bindings—mirroring audio remapper patterns (`addRemapper`, `removeRemapper`, duplicate). Replace preset-centric connect APIs with **remapper-centric** APIs.

## Scope

### In

- **Presets:** `addMidiEnvelopePreset` creates preset + **default remapper** (0→1 range).
- **Remappers:** `addMidiEnvelopeRemapper`, `updateMidiEnvelopeRemapper`, `removeMidiEnvelopeRemapper`, `duplicateMidiEnvelopeRemapper` (or reuse pattern from `createDuplicateRemapperEntry`).
- **Bindings:** `bindMidiEnvelopeRemapperToParam`, `connectMidiEnvelopeRemapperToParam`, `unbindMidiEnvelopeBindingForParam` (unchanged port semantics).
- **Resolve:** `resolveMidiEnvelopeBinding` joins remapper → preset → flattened `trackIds`, `adsr`, `outMin`, `outMax`, `velocityToPeak`.
- **Lookups:** `findMidiEnvelopeRemapper`, `findBindingsForRemapper`, `findMidiEnvelopeBindingForParam` (by remapper).
- **Remove preset:** cascade delete child remappers + all their bindings.
- **`getMidiEnvelopeRemapperConnections.ts`** (new): targets for a remapper (replace `getMidiEnvelopePresetConnections` usages in later tasks).
- **`validation.ts`:** validate three collections; orphan remapper warnings; duplicate param binding warnings; float param checks on bindings.
- Deprecate or remove **`bindMidiEnvelopePresetToParam`** / **`connectMidiEnvelopePresetToParam`** (thin wrappers OK temporarily if callers not yet migrated).
- Tests: connect same remapper to two params; update remapper range affects both; delete remapper disconnects targets.

### Out

- Frame cache / evaluator (**03**); panel UI (**04**); delete confirm copy (**05**).

## Dependencies

### Prerequisites

- **01** ✅

### Provides

- Graph mutation API for **03**–**05**.

### Blocks

- **03**, **04**, **05**

## Implementation tasks

1. Implement remapper CRUD + cascade rules on preset delete.
2. Update binding helpers to use `remapperId`; ensure `addMidiEnvelopeBinding` creates preset + default remapper + bind.
3. Implement `resolveMidiEnvelopeBinding` with remapper+preset join.
4. Add `getMidiEnvelopeRemapperConnections` (+ tests).
5. Extend `validateMidiEnvelopePresetsAndBindings` for remappers array.
6. Update existing **`midiEnvelopePresetSharing.test.ts`** / **`connectMidiEnvelopeBinding.test.ts`** for remapper model.

## Technical notes

- **`findMidiEnvelopeBindingForParam`** stays the port attachment lookup (binding row still per param).
- Snapshot validation (`validateMidiEnvelopeBindingsAgainstSnapshot`) should read `trackIds` from resolved preset, not remapper.

## Completion

✅ Done when all data-model tests pass and callers can attach params via remapper id without referencing preset id on bindings.

### Final steps

- Mark **02** ✅ in **`_OVERVIEW.md`**; unblock **03**, **04**, **05**.
