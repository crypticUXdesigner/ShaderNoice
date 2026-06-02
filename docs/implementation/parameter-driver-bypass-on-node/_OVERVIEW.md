# Parameter driver bypass on node — port-centric power toggle



## Mission



Move **temporary driver bypass** (power off) from the floating **parameter driver panel** to the **node parameter row**: a small power control **above the parameter port** when the port is visible. Support **audio**, **animation**, **MIDI envelope**, and **graph wires** on the same port. Bypass keeps the driver/wire **attached** but stops it from influencing the parameter; the row stays **connected-styled but dimmed**.



## Goals



- **Primary:** One power toggle per visible float port with an active driver or graph wire; toggling is undo-safe and persists with the graph.

- **Storage:** Reuse `Connection.disabled` for audio virtual-node wires **and** graph wires; add optional `disabled` on `AutomationLane` and `MidiEnvelopeBinding`.

- **Runtime:** Bypassed drivers/wires are ignored in JS effective-value paths and in shader float-param expressions (animation GLSL) where applicable.

- **UX:** Remove duplicate power controls from the driver panel / remapper cards; dim port + param row when bypassed (driver still attached).

- **Secondary:** Document the **animation/MIDI driver + graph wire stacking** ambiguity as an open bug (single toggle, no product rule yet).



## Success & constraints



| Must-have | Detail |

| --- | --- |

| User-goals | Align with **`docs/user-goals/12-parameter-drivers.md`** (driver attach/edit from port); optional one-line note after ship. |

| Port visibility | Toggle only when `showPort` is true (no bypass chrome on `showPort={false}` params). |

| Panel | **Remove** panel-header power buttons (no duplicate control). |

| Visual | **Connected + dimmed** when bypassed—not idle/disconnected styling. |

| Checks | `npm run type-check && npm test && npm run lint && npm run build` green when package completes. |



**Invariants:** Immutable graph updates; one graph wire per parameter port; existing driver exclusivity rules unchanged.



**Known gap (bug doc, not v1 fix):** When a parameter has both an evaluable **animation base** and an active **graph wire** (input modes), one bypass toggle cannot pause both layers without new product rules—see task **03** and [`docs/bug/param-driver-bypass-stacked-wire.md`](../../bug/param-driver-bypass-stacked-wire.md).



## Architecture



```

Param port row (visible port only)

        │

        ▼

DriverPowerToggle (above port circle)

        │

        ├── connection.disabled     ← audio virtual wire OR graph wire

        ├── AutomationLane.disabled ← animation driver

        └── MidiEnvelopeBinding.disabled ← MIDI envelope driver

        │

        ▼

Evaluators + FloatParamExpressions skip disabled sources

ParameterCell / ParamPort — dimmed connected chrome when bypassed

```



**Precedence for “what does bypass toggle?”** (matches `resolveDriverKindForParam`): active **connection** (any) → else **MIDI binding** → else **animation lane**.



**High-touch areas:** `immutableUpdates.ts`, `immutableUpdatesAutomation.ts`, `immutableUpdatesMidiEnvelope.ts`, new `paramDriverBypass.ts` (or similar), `ParamCell.svelte`, `ParameterCell.svelte`, `ParamPortWithAudioState.svelte`, `ParamPort.svelte`, `NodeBody.svelte`, `NodeEditorCanvasWrapper.svelte`, `graphStore.svelte.ts`, `parameterValueCalculator.ts`, `automationEvaluator.ts`, `FloatParamExpressions.ts`, `midiEnvelopeSignals.ts`, `AudioSignalPickerCompact.svelte`, `AudioDriverPanelContent.svelte`, `RemapperCard.svelte`.



## Work items



| ID | Task | Status | Provides | Blocks |

| --- | --- | --- | --- | --- |

| 01 | [Data model + evaluators](./01-data-model-evaluators-parameter-driver-bypass-on-node.md) | ✅ | Bypass fields, helpers, runtime/shader respect | 02A, 02B |

| 02A | [Node UI](./02A-node-ui-parameter-driver-bypass-on-node.md) | ✅ | Port-above power toggle + dimmed chrome | — |

| 02B | [Panel cleanup](./02B-panel-cleanup-parameter-driver-bypass-on-node.md) | ✅ | Panel power removed | — |

| 03 | [Bug doc — stacked driver + wire](./03-bug-stacked-driver-graph-wire-parameter-driver-bypass-on-node.md) | ✅ | Open bug under `docs/bug/` | — |



**Execution order:** `03` may run anytime (∥). **`01` → (`02A` ∥ `02B`)**. Ship when **01 + 02A + 02B** are ✅; **03** should land with or before ship.



## Progress tracker



- **Overall:** 100% — shipped 2026-05-31.

- **Milestone A (behavior):** task 01 ✅

- **Milestone B (UX):** tasks 02A ✅, 02B ✅

- **Milestone C (known issue):** task 03 ✅



## Notes & risks



- **Graph wire bypass:** Same `connection.disabled` flag as audio; toggle appears whenever a connection targets the param (virtual or real node).

- **Animation bypass + compile:** Disabling a lane drops `evalAutomation_*` from float-param GLSL; `digestAutomationForCompileIdentity` includes lane `disabled` for compile identity.

- **MIDI bypass:** JS-side only today (no GLSL bake); skip evaluator + frame cache reads when binding disabled.

- **Undo:** Each toggle records a graph undo snapshot via `graphStore.setParamDriverBypass` → `graphChangedListener`.

- **Stacking bug:** [`param-driver-bypass-stacked-wire.md`](../../bug/param-driver-bypass-stacked-wire.md).

- **Related shipped work:** **`parameter-drivers-v1`** added panel power on audio remappers—this package **removes** that in favor of node placement.

- **Implementation:** `src/utils/paramDriverBypass.ts`, `graphStore.setParamDriverBypass`, power toggle in `ParameterCell.svelte` (above port), panel power removed from compact/large audio driver UI.

