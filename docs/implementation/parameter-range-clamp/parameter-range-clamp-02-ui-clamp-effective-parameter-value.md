## Agent instructions (START HERE)

Follow this task top-to-bottom. Keep changes minimal and localized. Do not add new UI indicators. Clamp only float parameter effective values. Do not change stored config values.

## Overview

Clamp the computed **effective** float parameter value in the UI so the live display (knob/value) matches the value the shader uses and never goes out of the parameter’s spec range.

## Scope

### In

- Clamp output of `computeEffectiveParameterValue` (or the UI-facing equivalent) for float parameters using spec `min/max`.
- Ensure connected and audio-connected paths converge on the same clamp rule.

### Out

- New UI hints or warnings.
- Per-parameter opt-out (later).
- Special handling for automation (out of scope for this work package; clamp final effective value).

## Dependencies

### Provides

- Live UI value cannot exceed min/max and equals shader’s clamped effective value.

### Blocks

- `parameter-range-clamp-03-tests-and-regression.md` (needs stable clamp semantics).

## Implementation tasks

1. In `src/utils/parameterValueCalculator.ts`, apply a clamp to the final return value of `computeEffectiveParameterValue` when `paramSpec.type === 'float'`.
   - Clamp after applying `inputMode` composition (override/add/subtract/multiply).
   - Clamp unconnected case too (harmless; ensures UI and shader match if compilation clamps unconnected literals/uniforms).
2. Clamp helper policy:
   - Use `paramSpec.min`/`max` when present.
   - If missing (should not happen in current node specs), fall back to `0..1` to match default-range policy.
3. Ensure UI consumers (notably `src/lib/components/node/parameters/ParamPortWithAudioState.svelte`) continue to show `displayValue` that matches the clamped effective value.

## Technical notes

- Avoid reusing `snapParameterValue` here: snapping includes step/rounding and is intended for editing; this path should be a pure “range clamp” so it matches shader-side clamp.
- Keep float-only; other parameter types remain unchanged.

## Completion

Acceptance: The UI live effective value returned by `computeEffectiveParameterValue` is always within spec `min/max` for float params, including when driven by connected graph signals or audio live values, and matches the shader clamp semantics.

Final steps:

- Run existing unit tests that cover parameter effective value (see `src/utils/parameterValueCalculator.test.ts`) and add/adjust tests if needed (task 03 covers broader regression).

