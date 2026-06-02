# 08 — MIDI envelope preset sharing — parameter-drivers-v1

## Agent instructions (START HERE)

Milestone **C**. Immutable updates + serialization migrations only via **`data-model-migration`** skill patterns. Add tests for connect/share semantics.

**Problem:** Audio remappers are **one preset → many parameters**. MIDI envelopes **clone** when connecting an already-bound preset (`connectMidiEnvelopeBindingToParam`), which breaks the unified mental model in **`12-parameter-drivers.md`**.

## Overview

Align MIDI with audio:

```text
Envelope preset (tracks + ADSR + out range)
        ├── binding → Param A
        ├── binding → Param B
        └── unbound copies in library (optional)
```

User edits the preset once; all bound parameters receive the same envelope shape (each port still exclusive per **03**).

## Scope

### In

- **Data model:** Separate **preset** from **binding** OR add stable `presetId` on bindings with shared definition storage — pick minimal diff that supports:
  - Create preset (unbound or bound to first param)
  - Connect **same preset** to another param without cloning ADSR/track filter
  - Update preset → all bindings using it update
  - Delete preset → disconnect all bindings (with confirmation in UI — **06**)
- **`connectMidiEnvelopeBindingToParam`:** Bound preset connects by adding a new binding row referencing the same preset, not deep-cloning envelope fields.
- **Overview list:** Show preset name/label; bindings show target param in list item secondary text (like remapper connection list).
- Serialization: migrate existing `midiEnvelopeBindings` — each current binding becomes preset+binding or single binding with unique presetId (document migration in task commit).
- Tests: connect shared preset to two params; update ADSR reflects on both; delete preset clears both.
- **`midiEnvelopeEvaluator`:** Evaluate per binding (same preset, different outMin/max if per-binding overrides added — **Out** for v1: shared outMin/max on preset only).

### Out

- Per-parameter ADSR overrides on shared preset (future).
- Polyphonic voice policy changes.

## Dependencies

### Prerequisites

- **04** MIDI model + evaluator (shipped).

### Provides

- MIDI library semantics parity with audio remappers for **09** overview UX.

### Blocks

- **09** (overview connect flow assumes share semantics).

## Implementation tasks

1. Design sketch in task PR description: chosen preset/binding shape (types in `midiEnvelopeTypes.ts`).
2. Implement immutable helpers: `addMidiEnvelopePreset`, `bindMidiEnvelopePresetToParam`, `updateMidiEnvelopePreset`, `removeMidiEnvelopePreset`, migrate `connectMidiEnvelopeBindingToParam`.
3. Migration in `serialization.ts` / `graphLegacyMigrations.ts` for graphs with existing bindings (idempotent).
4. Update `MidiDriverPanelContent`, `MidiEnvelopeCard`, `ParameterDriverPanel` to list presets and show connected params (mirror `RemapperConnectionList` pattern).
5. Update `findMidiEnvelopeBindingForParam` / evaluator to resolve preset → binding → param.
6. Tests + **`npm test`** for migration and connect-two-params flow.

## Technical notes

- **Minimal path:** Add `presetId: string` on `MidiEnvelopeBinding`; store presets in `graph.midiEnvelopePresets?: Record<string, MidiEnvelopePreset>` or parallel array. Bindings hold `{ id, presetId, nodeId, paramName }`.
- **Alternative:** Keep single array but dedupe by presetId — prefer explicit preset entity for clarity.
- Empty `nodeId`/`paramName` unbound presets remain valid library entries.

## Completion

✅ Done when connecting an envelope already used on param A to param B shares one preset (no silent clone); preset edit affects all bindings; migration loads old graphs; tests green; no evaluator regression for single-binding graphs.

### Final steps

- Mark **08** ✅ in **`_OVERVIEW.md`**.
