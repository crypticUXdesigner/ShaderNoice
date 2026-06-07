# Parameter driver bypass — stacked animation/MIDI driver + graph wire

**Status:** Open

## Symptom

ShaderNoice nodes expose a **single power toggle above each float parameter port** to temporarily bypass the attached driver or graph wire while keeping it connected. When a parameter is influenced by **more than one layer**—for example, timeline **animation** (or a **MIDI envelope**) as the config/base **and** an active **graph wire** with a non-override input mode (add / subtract / multiply)—one toggle cannot pause every layer.

Depending on which attachment wins precedence (connection first, then MIDI, then animation), bypass may silence the wire while automation still drives the parameter in the shader, or the opposite. There is no product rule yet for “pause all layers” vs per-layer bypass.

## Environment

Any browser build where parameter drivers and graph wires coexist (local dev and GitHub Pages).

## Repro

1. Add a node with a float parameter that supports animation (e.g. a transform or effect amount).
2. Attach an **animation driver** with at least one evaluable region on the timeline.
3. Connect another node’s float output to the same parameter port; set input mode to **Multiply** (or Add).
4. Play the timeline and observe the parameter is driven by **both** automation (base) and the wire.
5. Click the **power toggle above the port** on the node.

**Expected (undefined — product TBD):** Either all driving layers pause, or each layer has its own bypass.

**Actual (v1):** One toggle writes to a **single** bypass store following precedence: **any connection on the port** → else **MIDI binding** → else **animation lane**. The other layer(s) may keep affecting effective values and GLSL.

## Current behavior

- **Effective values (JS):** `computeEffectiveParameterValue` in `parameterValueCalculator.ts` combines a config/base (automation or MIDI when present) with an enabled connection using the port’s input mode. Disabled connections are skipped; disabled lanes/bindings are skipped in their evaluators.
- **Shader float params:** `FloatParamExpressions.ts` can emit `evalAutomation_*` for an active lane while a separate enabled graph wire still contributes via `resolveFloatParameterInputVarsFromConnections`.
- **Bypass toggle:** `getParamDriverBypassState` / `setParamDriverBypass` in `paramDriverBypass.ts` target one store per precedence (port-above power toggle shipped 2026-05-31).

Intentional v1 scope: document the gap; node toggle follows connection-first precedence.

## Key files

| File | Role |
| --- | --- |
| `src/utils/paramDriverBypass.ts` | Single-target bypass read/write and precedence |
| `src/utils/parameterValueCalculator.ts` | JS effective value: base + wired input modes |
| `src/shaders/compilation/FloatParamExpressions.ts` | GLSL float param: automation expr + wired inputs |
| `src/utils/parameterDriverAttach.ts` | Driver attach preserves graph wires when adding animation (parameter-drivers-v1) |
| `src/utils/resolveDriverKindForParam.ts` | Which driver kind the UI treats as “primary” for panel edit mode |

## Notes

- Rare in current presets but possible whenever users stack animation/MIDI with graph wires on the same float port.
- Fixing this requires product decisions (one master bypass vs per-layer toggles) and is **out of scope** for the initial port-centric bypass ship.
