# 01 — Data model + evaluators — parameter-driver-bypass-on-node

## Agent instructions (START HERE)

Follow sections in order. Use **immutable** updates only (`src/data-model/`). Do **not** build node UI or remove panel buttons in this task—that is **02A** / **02B**.

Respect driver exclusivity from **`parameter-drivers-v1`**; bypass is orthogonal to attach/detach.

## Overview

Add persisted **bypass** state for animation and MIDI envelope drivers; unify read/write helpers for all bypass targets (connection, lane, binding). Teach runtime and compilation paths to **ignore bypassed** sources while keeping attachments intact.

## Scope

### In

- **Types**
  - `AutomationLane.disabled?: boolean` (`src/data-model/types.ts`)
  - `MidiEnvelopeBinding.disabled?: boolean` (`src/data-model/midiEnvelopeTypes.ts`)
  - `Connection.disabled` — already exists; document in helper as shared for audio + graph wires
- **Immutable updates**
  - `setAutomationLaneDisabled(graph, laneId, disabled)` (or update lane by nodeId+paramName)
  - `setMidiEnvelopeBindingDisabled(graph, bindingId, disabled)` (or by param target)
  - Extend or add **`src/utils/paramDriverBypass.ts`** (name flexible):
    - `getParamDriverBypassState(graph, audioSetup, nodeId, paramName)` → `{ hasBypassTarget, bypassed, targetKind: 'connection' | 'lane' | 'binding' | null, …ids for toggle }`
    - `setParamDriverBypass(graph, nodeId, paramName, bypassed)` — writes the correct store per precedence (connection > MIDI > animation)
  - **`graphStore`**: expose toggle action(s) wrapping helpers + undo snapshot
- **Evaluation / compile**
  - Skip disabled connections (already partial—audit all connection lookups)
  - `getAutomationValueForParam` / `automationLaneHasEvaluableRegions` usage: treat `lane.disabled` as non-evaluable for driving (lane data preserved)
  - `getAutomationExpressionForParam` (`FloatParamExpressions.ts`): return `null` when lane disabled
  - `evaluateMidiEnvelopeSignalForParam` / frame cache: no output when binding disabled
  - `ParamPortWithAudioState` / `getParamPortConnectionState`: expose bypass for UI (**02A** consumes; add derived fields here if needed)
- **Tests**
  - Unit tests: toggle each target kind; effective value falls back to static config when bypassed
  - Animation disabled → no `evalAutomation_*` expression in compile output for that param (minimal fixture)

### Out

- Node power toggle UI (**02A**)
- Panel power removal (**02B**)
- Bug markdown (**03**)
- Product fix for animation base + graph wire stacking

## Dependencies

### Prerequisites

- **`parameter-drivers-v1`** shipped (connections, lanes, MIDI bindings exist).
- Decisions in **`_OVERVIEW.md`** (connection + lane + binding bypass; precedence).

### Provides

- Stable bypass API for UI and panel cleanup tasks.

### Blocks

- **02A**, **02B**

## Implementation tasks

1. Add optional `disabled` fields to lane and MIDI binding types; serialization omits `false`/absent (same pattern as `Connection.disabled`).
2. Implement immutable setters + `graphStore` actions with undo recording.
3. Implement `getParamDriverBypassState` / `setParamDriverBypass` with precedence: **any connection on param** → MIDI binding → evaluable animation lane.
4. Wire evaluators and `FloatParamExpressions` to honor bypass flags.
5. Audit `parameterValueCalculator`, `parameterValueCalculatorInput`, `resolveDriverKindForParam`, and compile connection resolution for consistent `!disabled` filtering.
6. Add/adjust Vitest coverage; run **`npm run type-check && npm test`**.

## Technical notes

- **Graph change detection:** Animation bypass may affect GLSL float-param expressions—ensure graph diff treats lane `disabled` toggle as compile-relevant (similar to evaluable region changes).
- **Effective value when bypassed:** Static `node.parameters[paramName]` (plus any non-bypassed layers—today usually none on same port except the documented stacking bug).
- **Helper location:** Prefer `src/utils/paramDriverBypass.ts` colocated with `resolveDriverKindForParam.ts`.

## Completion

✅ Done when bypass can be set/read for connection, animation lane, and MIDI binding via store helpers; bypassed sources do not affect JS effective values or animation GLSL expressions; tests pass.

### Final steps

- Mark task **01** ✅ in **`_OVERVIEW.md`**; unblock **02A** / **02B**.
