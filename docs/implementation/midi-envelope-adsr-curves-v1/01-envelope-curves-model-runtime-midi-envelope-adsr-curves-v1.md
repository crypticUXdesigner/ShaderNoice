# 01 — Envelope curves model + runtime — midi-envelope-adsr-curves-v1

## Agent instructions (START HERE)

Follow sections in order. Respect dependencies. Read **`midi-envelope-adsr-curves-v1/_OVERVIEW.md`** for mission and locked curve semantics.

Study existing **`midiEnvelopeEvaluator.ts`**, **`midiEnvelopeFrameCache.ts`**, **`midiEnvelopeTypes.ts`**, **`serialization.ts`** (`sanitizeAdsr`). Do **not** implement panel UI (task **02**) or GLSL bake.

## Overview

Extend **`MidiEnvelopeAdsr`** with optional per-phase curve presets and apply them in **`computeAdsrLevelAtTime`** via a shared easing helper. Preserve linear behavior when curve fields are absent.

## Scope

### In

- **`EnvelopeCurve`** type: `'linear' | 'exponential' | 'logarithmic' | 'smooth'`
- Optional fields on **`MidiEnvelopeAdsr`:** `attackCurve`, `decayCurve`, `releaseCurve` (each defaults to `'linear'`)
- **`src/utils/envelopeEasing.ts`** (or equivalent): `applyEnvelopeCurve(t: number, curve: EnvelopeCurve): number` for `t ∈ [0, 1]`
- Update **`phaseProgress`** (or wrapper) to compose duration normalization + curve application
- **`serialization.ts`:** extend **`sanitizeAdsr`** — unknown curve strings fall back to `'linear'`
- Vitest:
  - Linear graphs unchanged (no curve fields → same numeric output as today)
  - Exponential attack reaches 50% level **later** than linear for same `attackSeconds`
  - Logarithmic release mid-point differs from linear
  - Serialization round-trip preserves curve fields

### Out

- **`AdsrEnvelopeEditor`** UI (task **02**)
- Bezier / automation-curve sampling
- Polyphonic envelope voices
- Changing **`DEFAULT_MIDI_ENVELOPE_ADSR`** time defaults

## Dependencies

### Prerequisites

- Shipped MIDI envelope runtime (**parameter-drivers-v1** task **04** ✅)

### Provides

- Curve-aware ADSR evaluation for all bindings
- Serializable curve fields with safe defaults

### Blocks

- **02** UI

## Implementation tasks

1. Add **`EnvelopeCurve`** + optional curve fields to **`MidiEnvelopeAdsr`**; document in type header comments.
2. Implement **`envelopeEasing.ts`** with closed-form mappings (see **_OVERVIEW** curve semantics).
3. Wire curves into **`computeAdsrLevelAtTime`** — attack, decay, and release each use their phase curve on normalized progress.
4. Extend **`sanitizeAdsr`** in **`serialization.ts`**; ensure existing JSON loads with implicit linear curves.
5. Add/update **`midiEnvelopeEvaluator.test.ts`** and **`midiEnvelopeSerialization.test.ts`** coverage.

## Technical notes

- Keep **`MIN_PHASE_SECONDS`** instant-phase behavior unchanged.
- **`midiEnvelopeFrameCache`** needs no logic change — it calls the evaluator as today.
- Exponential/log implementations: use stable formulas (e.g. `1 - (1-t)^k` with fixed `k ≈ 4` or documented constant); avoid `Math.pow(0, …)` edge cases at `t=0`.
- Export easing helper from **`src/utils/`** so task **02** can sample the same function for SVG paths.

## Completion

✅ Done when curve fields persist in saved JSON, evaluator output differs predictably from linear for non-linear presets, all tests pass, and **`npm run type-check && npm test && npm run lint && npm run build`** are green — **without** editor UI changes.

### Final steps

- Mark **01** ✅ in **`_OVERVIEW.md`**; unblock **02**.
