# 04 — MIDI envelope model + runtime — parameter-drivers-v1

## Agent instructions (START HERE)

Depends on **03**. Study **`EffectiveValueUpdateRunner`**, **`parameterValueCalculator`**, **`buildArrangementSnapshot`** note lists. Do **not** implement DAW automation curve sampling (**audiotool-arrangement` task 05**).

Runtime evaluation is **JS-side per frame** (like audio), not GLSL bake.

## Overview

Add **MIDI envelope driver** data: binding `(nodeId, paramName)` → envelope config (track filter, ADSR, outMin/outMax) + runtime note-hit detection from **`audioSetup.arrangementSnapshot`**. v1: **monophonic** or last-note-wins retrigger; velocity scales envelope peak if cheap.

## Scope

### In

- Types (e.g. **`MidiEnvelopeBinding`**, **`MidiEnvelopeDefinition`**) on graph or **`SerializedGraphFile`** sidecar field—document chosen path in types file header.
- **`serialization.ts`**: serialize/deserialize/sanitize bindings; validation warnings when snapshot missing track ids.
- **`evaluateMidiEnvelopeAtTime`** (or per-frame **`tickMidiEnvelopes`**) using snapshot notes + transport time + binding track filter:
  - Note on near transport time triggers envelope; ADSR phases advance each frame.
  - Output remapped to param range (clamped like remapper outMin/outMax).
- Integrate into effective parameter path when binding active and no higher-priority conflict (animation/audio exclusivity from **03**—MIDI replaces other driver kinds on attach in **05**).
- Vitest: synthetic note list + ADSR reaches expected peak/decay; binding remap min/max.

### Out

- Driver panel UI (**05**).
- Polyphonic voice stacks (v2 note in **`_OVERVIEW.md`**).
- GLSL codegen for envelopes.

## Dependencies

### Prerequisites

- **03** exclusivity helpers.
- **`arrangementSnapshot`** import path (audiotool **02** ✅).

### Provides

- Runtime values for MIDI-driven params; serialized bindings.

### Blocks

- **05** UI.

## Implementation tasks

1. Define types + immutable add/update/remove binding helpers in `src/data-model/`.
2. Wire serialization + **`validateGraph`** warnings.
3. Implement envelope engine (ADSR state machine, monophonic policy documented).
4. Hook **`EffectiveValueUpdateRunner`** / parameter tick so panel knobs show live envelope output.
5. Unit tests for evaluator; ensure graphs without snapshot ignore bindings safely.

## Technical notes

- Reuse tick→second note positions from snapshot **`notes[]`**; filter by **`trackId`** list on binding.
- Consider sharing **`remapValue`** math from audio incremental analysis for outMin/outMax.

## Completion

✅ Done when bindings persist in saved JSON, evaluator drives float params at preview time when snapshot present, tests pass, build green—**without** panel UI yet (bindings injectable via test/fixture).

### Final steps

- Mark **04** ✅ in **`_OVERVIEW.md`**; unblock **05**.
