# Audio driver bypass — shader still driven by audio

**Status:** Fix proposed — needs verification

## Symptom

Toggling the **power control above a parameter port** to bypass an attached **audio driver** updates the node UI (parameter readout falls back to the static/config value), but the **preview shader keeps reacting to audio** as if the driver were still active.

## Environment

Any browser build with audio drivers on float parameter ports (local dev and GitHub Pages).

## Repro

1. Add a node with a float parameter that supports audio (e.g. effect amount or transform scale).
2. Attach an **audio driver** (band/remap) to that parameter port.
3. Load/play audio and confirm the preview reacts to the signal.
4. Click the **power toggle above the port** to bypass the driver.

**Expected:** Preview matches the bypassed static parameter value (no audio reactivity on that param). Dragging the knob updates the shader immediately.

**Actual (before fix):** UI shows the static value; preview still follows the live audio driver and/or ignores knob edits.

## Root cause

Two gaps:

1. **No recompile on bypass:** `connectionsEqual` ignored `connection.disabled`, so bypass was treated as a position-only graph change and the compiled GLSL kept the audio uniform wired in.
2. **No live parameter uniform after bypass:** Even after recompile, `UniformGenerator` (and runtime uniform push paths) treated a **bypassed** connection like an active override wire and **omitted** the parameter uniform. The shader could not receive knob edits; preview stayed on audio or a compile-time literal.

CPU-side evaluation (`computeEffectiveParameterValue`) and bypass UI were already correct.

## Mitigation

- Include `connection.disabled` in `connectionsEqual` so bypass triggers recompile.
- Treat only **active** (`!disabled`) override connections as suppressing the parameter uniform (`findActiveParameterConnection` / `isParameterUniformSuppressedByConnection`), used by `UniformGenerator`, `CompilationManager.scheduleParameterUpdate`, and parameter transfer/export paths.
- When bypassed, node UI writes knob edits directly to stored config (`useConfigForInput`).

## Key files

| File | Role |
| --- | --- |
| `src/runtime/utils/deepEquals.ts` | Connection equality for graph change detection |
| `src/utils/changeDetection/GraphChangeDetector.ts` | Decides position-only vs recompile-needed |
| `src/runtime/RuntimeManager.ts` | Skips recompile on position-only graph updates |
| `src/utils/paramDriverBypass.ts` | Bypass toggle writes `connection.disabled` |
| `src/utils/resolveParameterInputMode.ts` | Active-connection helpers; bypassed wires no longer suppress uniforms |
| `src/shaders/compilation/UniformGenerator.ts` | Emits parameter uniform when driver bypassed |
| `src/runtime/CompilationManager.ts` | Pushes knob edits to GPU when bypassed |
| `src/runtime/compilation/parameterTransfer.ts` | Seeds bypassed param values on recompile |
| `src/lib/components/node/parameters/ParamPortWithAudioState.svelte` | Knob edits config directly when bypassed |

## Verification

1. Repeat repro steps above.
2. After bypass: preview should freeze to the knob/config value; dragging the knob should change the preview; un-bypass restores audio reactivity.
3. `npm test -- src/runtime/utils/deepEquals.test.ts src/utils/resolveParameterInputMode.test.ts src/shaders/compilation/UniformGenerator.test.ts`
