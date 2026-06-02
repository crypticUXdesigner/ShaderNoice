# 05 — Attach / detach / delete semantics — midi-envelope-remappers-v1

## Agent instructions (START HERE)

Follow sections in order. Depends on **02** remapper connect APIs and **04** remapper cards (or implement Connect in parallel with **04** in one PR). Align with **`docs/user-goals/12-parameter-drivers.md`** disconnect/delete table.

## Overview

Wire **Connect / Disconnect / Duplicate / Delete** on remapper cards; ensure attach/detach orchestration and bypass use **remapper bindings**. Update delete confirmations for remapper vs envelope preset.

## Scope

### In

- **`MidiDriverPanelContent` + `MidiRemapperCard`:** `handleConnectRemapper`, `handleDisconnectFromParam`, duplicate remapper, delete remapper; `isRemapperConnectedToTarget` via binding `remapperId`.
- **`prepareGraphForMidiDriverAttach`:** unchanged exclusivity; attach creates preset + default remapper + bind OR binds existing remapper.
- **`confirmDriverAssetDelete`:** remapper delete uses `assetKind: 'remapper'`; envelope delete counts bindings across **all** child remappers.
- **`parameterDriverAttach.ts`:** `detachMidiDriverForParam` still unbinds binding (remapper stays).
- **`paramDriverBypass.ts`:** still binding-level (no change to target kind).
- Remove dead **`connectMidiEnvelopePresetToParam`** call sites; grep repo.
- **`ParameterDriverPanel`:** footer Disconnect removes binding to current remapper, not whole preset.
- Tests: **`parameterDriverAttach.test.ts`**, **`confirmDriverAssetDelete.test.ts`** if behavior changes.

### Out

- User-goals full prose pass (**06**).

## Dependencies

### Prerequisites

- **02** ✅; **04** remapper card shell (can land in same PR).

### Provides

- End-to-end attach flows for QA.

### Blocks

- **06**

## Implementation tasks

1. Connect: `connectMidiEnvelopeRemapperToParam` + `prepareGraphForMidiDriverAttach` from focused/overview remapper card.
2. Disconnect: `unbindMidiEnvelopeBindingForParam` when current param uses that remapper.
3. Duplicate remapper: same `envelopePresetId`, copy `outMin`/`outMax` (+ name).
4. Delete remapper: `removeMidiEnvelopeRemapper` + confirm when multiple targets.
5. Delete envelope: cascade via **02** + confirm total binding count.
6. Grep and fix **`addMidiEnvelopeBinding`** / panel “New envelope” to bind **default remapper**, not preset.
7. Run **`npm test`** for attach/detach tests.

## Technical notes

- **`registerDeleteHandler`** in overview: delete selected **envelope** from nav (existing behavior); remapper delete stays on card.
- Sharing: second param connects to **same remapper id** (audio parity), not duplicate remapper row.

## Completion

✅ Done when a user can add envelope → add second remapper with different range → connect each to different params, share one remapper across two params, and disconnect/delete per user-goals semantics.

### Final steps

- Mark **05** ✅ in **`_OVERVIEW.md`**.
