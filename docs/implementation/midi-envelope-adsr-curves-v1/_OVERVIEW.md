# MIDI envelope ADSR curves v1 — musical easing

## Mission

Add **per-phase envelope curves** to MIDI envelope ADSR so attack, decay, and release feel musical (exponential attack, logarithmic release) while preserving today’s **absolute-time seconds** model and **linear default** for saved graphs.

## Goals

- **Primary:** Optional curve preset per phase — `linear` | `exponential` | `logarithmic` | `smooth` — applied in JS-side evaluation (`midiEnvelopeEvaluator.ts`), not GLSL bake.
- **Backward compatible:** Missing curve fields deserialize as `linear`; existing bindings behave identically.
- **UI:** `AdsrEnvelopeEditor` shows curve shape in the graph (sampled path) and compact per-phase curve controls; time handles still edit **duration/level** only (not curve shape via drag in v1).
- **Display:** Show attack/decay/release in **ms** when &lt; 1 s (seconds internal storage unchanged).
- **Performance:** Closed-form easings only — no change to frame-cache architecture or note lookup cost.

## Success & constraints

| Must-have | Detail |
| --- | --- |
| Storage | Extend `MidiEnvelopeAdsr` in `midiEnvelopeTypes.ts`; sanitize in `serialization.ts` |
| Eval | `phaseProgress` (or shared helper) maps normalized phase time through curve preset |
| Defaults | `linear` for attack/decay/release when omitted |
| Out of scope | Polyphonic voices, bezier/automation-curve editor, GLSL codegen, global “character” macro (optional follow-up) |
| Checks | `npm run type-check && npm test && npm run lint && npm run build` green per completed task |

**Invariants:** Immutable graph updates; monophonic last-note-wins policy unchanged; sustain remains **level** (0–1), not duration.

## Architecture

```
MidiEnvelopeAdsr (+ optional attackCurve, decayCurve, releaseCurve)
        │
        ▼
envelopeEasing.ts  ──► phaseProgress(elapsed, duration, curve)
        │
        ▼
midiEnvelopeEvaluator.ts  ──► computeAdsrLevelAtTime (unchanged call sites)
        │
        ▼
midiEnvelopeFrameCache.ts  ──► per-transport-time cache (unchanged contract)
        │
        ▼
AdsrEnvelopeEditor.svelte  ──► sampled SVG path + curve preset UI
```

**Anti-patterns:** Baking curves into shader compile; breaking linear graphs on load; drag-mapping that conflates curve shape with segment duration in v1.

**High-touch areas:** `midiEnvelopeTypes.ts`, `serialization.ts`, `midiEnvelopeEvaluator.ts`, `AdsrEnvelopeEditor.svelte`, `midiEnvelopeEvaluator.test.ts`, `midiEnvelopeSerialization.test.ts`.

## Work items

| ID | Task | Status | Provides | Blocks |
| --- | --- | --- | --- | --- |
| 01 | [Model + runtime easing](./01-envelope-curves-model-runtime-midi-envelope-adsr-curves-v1.md) | ✅ | Types, `envelopeEasing`, evaluator + tests | 02 |
| 02 | [UI + closeout](./02-envelope-curves-ui-closeout-midi-envelope-adsr-curves-v1.md) | ✅ | Editor curves, ms labels, package done | — |

**Execution order:** **01** → **02**.

## Progress tracker

- **Overall:** 100% (2 / 2 tasks)
- **Milestone A (runtime):** task 01 ✅ (2026-06-01 — `envelopeEasing.ts`, evaluator curves, `sanitizeAdsr`, tests)
- **Milestone B (UI + ship):** task 02 ✅ (2026-06-01 — `AdsrEnvelopeEditor` curve presets + sampled SVG, ms display, sustain hint; `ValueInput.formatDisplay`; user-goals note)

## Notes & risks

- **Curve semantics (locked for v1):**
  - `exponential` — concave rise (slow start → fast finish); default suggestion for **attack**
  - `logarithmic` — convex fall (fast start → slow tail); default suggestion for **decay/release**
  - `smooth` — smoothstep `t²(3−2t)`
  - `linear` — current behavior (`t`)
- **Suggested defaults for *new* bindings (optional in 01):** keep factory defaults linear; 02 may offer sensible presets in UI without changing `DEFAULT_MIDI_ENVELOPE_ADSR` unless product asks.
- **Visual sustain segment** stays fixed-width (`SUSTAIN_VISUAL_SECONDS`); document in UI helper copy so users don’t confuse with hold time.
- **Performance:** one extra `Math.pow` or smoothstep per active phase — negligible vs preview render.
