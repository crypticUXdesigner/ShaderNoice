# 03 — Evaluator + frame cache — midi-envelope-remappers-v1

## Agent instructions (START HERE)

Follow sections in order. Depends on **02** `resolveMidiEnvelopeBinding`. Preserve monophonic last-note-wins policy and velocity-to-peak behavior. Update tests before optimizing.

## Overview

Split evaluation into **preset-level normalized level (0–1)** and **remapper-level output range**. Refactor **`syncMidiEnvelopeFrame`** to compute ADSR once per `envelopePresetId` per transport sample, then apply each binding’s remapper range.

## Scope

### In

- **`midiEnvelopeEvaluator.ts`:** `evaluateMidiEnvelopeLevelForPresetAtTime` (or reuse `evaluateMidiEnvelopeLevelAtTime` with resolved preset slice); `remapMidiEnvelopeOutput(level, outMin, outMax)` unchanged math.
- **`evaluateMidiEnvelopeBindingAtTime`:** resolve binding → get cached level for preset → remap with remapper range.
- **`midiEnvelopeFrameCache.ts`:** `levelByPresetId` map per `syncMidiEnvelopeFrame` tick; still expose `getMidiEnvelopeFrameValue` / `getMidiEnvelopeFrameValueByBindingId`.
- **`midiEnvelopeSignals.ts`**, **`parameterValueCalculator.ts`**, **`midiEnvelopeUniformUpdates.ts`**, **`EffectiveValueUpdateRunner.ts`:** use resolved remapper range (no direct preset `outMin`/`outMax`).
- Tests: two bindings, same preset, different remappers → same level, different output; frame cache matches direct eval; disabled binding skipped.

### Out

- UI live needles (**04**); delete/connect flows (**05**).

## Dependencies

### Prerequisites

- **02** ✅

### Provides

- Correct runtime values for migrated graphs; perf win for shared presets.

### Blocks

- **06** (full closeout)

## Implementation tasks

1. Update evaluator helpers to take remapper `outMin`/`outMax` from resolved binding, not preset envelope.
2. Refactor frame cache loop: compute preset level once per unique `envelopePresetId` per time step.
3. Update **`midiEnvelopeEvaluator.test.ts`** and **`midiEnvelopeFrameCache.test.ts`** for remapper split.
4. Grep runtime/UI for `envelope.outMin` / `preset.envelope.outMax` on eval path; fix stragglers.
5. Run **`npm test`** for MIDI envelope + TimeManager tests if they assert values.

## Technical notes

- Velocity-scaled effective out max logic stays in **`evaluateBindingOutputFromActiveNote`**; only the storage of `outMin`/`outMax` moves to remapper.
- Cache invalidation unchanged: snapshot/bindings reference equality on rebuild.

## Completion

✅ Done when multi-binding shared-preset graphs evaluate correctly, frame cache matches direct evaluation, and preset-level ADSR is not recomputed per binding on the hot path.

### Final steps

- Mark **03** ✅ in **`_OVERVIEW.md`**.
