# MIDI envelope config — stale runtime cache after preset/remapper edits

**Status:** Open

## Symptom

In ShaderNoice, **MIDI envelope drivers** push parameter values from the timeline each frame (ADSR shape from arrangement notes, remapped to `outMin`/`outMax`). After editing envelope settings in the **parameter driver panel** — ADSR handles, track filter, remapper range, velocity-to-peak — the **canvas preview** and **live driver readouts** can stay on old behavior even though the editor UI shows the new settings.

Typical user-visible mismatch:

- Drag **Release** longer in the **ADSR envelope editor**; the curve handles move, but the **live shape needle** and driven shader parameter still follow the previous release time.
- Change **Out min / Out max** on a remapper card; the **live output** value on the card does not track the new range until something else “kicks” the runtime.
- While **paused** at a fixed timeline position, tweak ADSR; preview may not update at all until play, scrub, reconnect, or **full page reload** (reload always clears the bug because it resets in-memory cache).

**Terms:** *Graph* = saved node wiring + driver config. *Binding* = link from a float parameter to a MIDI remapper. *Preset* = track filter + ADSR. *Remapper* = output range only. *Transport time* = playhead position in seconds on the timeline.

## Environment

Any browser build with MIDI drivers and an imported arrangement snapshot (local dev and GitHub Pages). Reproducible while **paused**; also affects **playing** preview until cache is invalidated.

## Repro

1. Open a project with an arrangement snapshot (or **Fetch project** on the MIDI driver tab).
2. Attach a **MIDI envelope** to a float parameter (e.g. effect amount) with at least one note track selected.
3. **Pause** the timeline and scrub to a time **inside a note** (envelope not silent).
4. Open the **parameter driver panel** → **MIDI** tab; note the **live shape** / **live output** on the envelope card.
5. Drag **Release** (or **Attack**) to a clearly different value; release the handle.

**Expected:** Live readout and canvas-driven parameter immediately reflect the new ADSR at the current playhead.

**Actual:** Live readout and preview often stay on the **previous** envelope math. Scrubbing playhead, playing, disconnecting/reconnecting the binding, or **reloading the page** may suddenly apply the edit.

**Minimal data:** One float parameter, one MIDI binding, one preset with a single note track; instant attack/sustain for easier observation optional.

## Root cause

MIDI envelope evaluation uses a **module-level frame cache** (`midiEnvelopeFrameCache.ts`) keyed by arrangement snapshot and the **`midiEnvelopeBindings` array reference**. Preset and remapper edits update `midiEnvelopePresets` / `midiEnvelopeRemappers` on the graph but **reuse the same bindings array reference**, so the cache **does not rebuild** and keeps stale resolved ADSR + output range in `entries`.

Additionally, when transport time is unchanged, `syncMidiEnvelopeFrame` **returns early** without re-evaluating (unless `force` is true). Preset-only graph updates are classified as “position only” by `GraphChangeDetector`, so `RuntimeManager.setGraph` does **not** mark the preview dirty — combined with paused **~15 Hz** MIDI uniform cadence in `TimeManager`, paused edits are especially sticky.

There is **no** call to `invalidateMidiEnvelopeFrameCache()` from graph update paths outside the cache module itself.

## Key files

| File | Role |
| --- | --- |
| `src/utils/midiEnvelopeFrameCache.ts` | Owns cache invalidation/rebuild; only rebuilds when `cachedSnapshot !== snapshot` **or** `cachedBindingsRef !== bindings`; skips work when `transportTime === lastTransportTime` |
| `src/data-model/immutableUpdatesMidiEnvelope.ts` | `updateMidiEnvelopePreset` / `updateMidiEnvelopeRemapper` spread graph but leave `midiEnvelopeBindings` reference unchanged |
| `src/utils/changeDetection/GraphChangeDetector.ts` | `isOnlyPositionChange` ignores MIDI preset/remapper fields → preset edits skip runtime structure/dirty path |
| `src/runtime/RuntimeManager.ts` | `setGraph` updates `currentGraph` but only calls `applyGraphStructureChange` when structure changed; MIDI uniforms pushed via `pushMidiEnvelopeUniforms` |
| `src/runtime/runtime/TimeManager.ts` | Paused MIDI envelope pass throttled (`PAUSED_DRIVER_MIN_INTERVAL_MS`); needs dirty flag, timeline move, or playing |
| `src/lib/components/floating-panel/MidiDriverPanelContent.svelte` | Live shape/output via `syncMidiEnvelopeFrame` + `getMidiEnvelopeFramePresetShape` on RAF tick — inherits stale cache |

**Critical logic (cache rebuild guard):**

```ts
// midiEnvelopeFrameCache.ts — rebuild only on snapshot or bindings ref change
if (cachedSnapshot !== snapshot || cachedBindingsRef !== bindings) {
  rebuildBindingCache(graph, snapshot, bindings);
}
// Same playhead → skip re-eval unless force
if (!force && transportTime === lastTransportTime) return;
```

**Critical logic (preset patch leaves bindings ref):**

```ts
// immutableUpdatesMidiEnvelope.ts
return changed ? { ...graph, midiEnvelopePresets: next } : graph;
// midiEnvelopeBindings: same array reference as before
```

## Notes

- Envelopes are **JS-side uniforms**, not GLSL bake — **recompile is not required** for ADSR/range edits; this is a runtime cache + dirty-signaling gap, not a shader compile bug.
- Reload “fixes” the symptom by resetting module state; that is a workaround, not correct behavior.
- Likely fix direction: invalidate or rebuild cache when `midiEnvelopePresets`, `midiEnvelopeRemappers`, or resolved binding content changes; mark runtime dirty on those graph updates; optionally pass `force` when graph fingerprint changes at fixed transport time.
- Related product gap (separate work package): **retrigger policy** — see `docs/implementation/midi-envelope-retrigger-policy-v1/_OVERVIEW.md`.
