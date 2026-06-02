# MIDI envelope retrigger policy v1 — configurable note-on behavior

## Mission

Today every MIDI envelope preset uses **monophonic last-note-wins**: the newest note-on fully retriggers ADSR from that note’s start, even when the previous envelope is still high or in a long **release**. Users report visible “overrides” with slow releases and overlapping notes. This package adds a **preset-level retrigger policy** so authors can choose last-note-wins (default, unchanged) or behaviors that **preserve or max-hold** envelope level when a new note arrives while the current level is still higher.

## Goals

- **Primary:** Enum (or equivalent) on `MidiEnvelopePreset` / envelope definition — at minimum **`lastNoteWins`** (default) and **`holdIfHigher`** (new note does not drop below current evaluated level; attack only if new target exceeds current).
- **Runtime:** Implement policy in `midiEnvelopeEvaluator.ts` without breaking frame-cache “one ADSR eval per preset per transport sample” contract; update `midiEnvelopeFrameCache.ts` if policy needs cross-note state (document choice).
- **UI:** Compact control on `MidiEnvelopeCard` / ADSR section with short helper copy (musical names, not engine jargon).
- **Docs:** Align `docs/user-goals/12-parameter-drivers.md` with policy options and default.
- **Tests:** Vitest for overlapping notes + long release — contrast v1 last-note-wins vs new policy on same fixture.

**Secondary (optional in v1):** **`legato`** — skip attack when retriggering while previous note held (sustain phase); defer if it needs note-off overlap semantics beyond snapshot notes.

## Success & constraints

| Must-have | Detail |
| --- | --- |
| Backward compatible | Missing field → **`lastNoteWins`**; existing graphs and presets behave identically |
| Immutable graph | Policy stored on preset; updates via `immutableUpdatesMidiEnvelope.ts` + `serialization.ts` sanitize |
| Monophonic v1 | Still one active voice per preset at transport time `t`; no polyphonic voice stack |
| Performance | No per-frame full note rescan regression; frame cache remains valid hot path |
| Checks | `npm run type-check && npm test && npm run lint && npm run build` green per completed task |

**Allowable behavior change:** Only when user selects a non-default policy on a preset. Default preset factory and migrated graphs stay last-note-wins.

**Out of scope:** True polyphony (multiple simultaneous envelope levels summed/max’d per note); GLSL bake; per-binding policy override; MIDI note-off from live input (arrangement snapshot only).

**Invariants:** Driver exclusivity unchanged; remapper `outMin`/`outMax` applied after normalized shape; velocity-to-peak unchanged unless policy explicitly documents interaction.

## Architecture & design

```
Arrangement notes (snapshot) + transport time t
        │
        ▼
findActiveNote* (policy may consider prior note / current level)
        │
        ▼
computeAdsrLevelAtTime (+ optional max/hold vs previous sample)
        │
        ▼
midiEnvelopeFrameCache (preset-level dedupe — may need level carry or two-note window)
        │
        ▼
remapMidiEnvelopeBindingOutput → shader uniform / panel live readout
```

**Integration seams:** `midiEnvelopeEvaluator.ts`, `midiEnvelopeFrameCache.ts`, `midiEnvelopeTypes.ts`, `serialization.ts`, `MidiEnvelopeCard.svelte`, `docs/user-goals/12-parameter-drivers.md`.

**Anti-patterns:** Ad-hoc “if release long” heuristics; breaking cache invalidation (coordinate with bug fix for preset staleness); policy on remapper instead of preset; unbounded note history scan per frame.

**Dependency:** Fix or harden **`docs/bug/midi-envelope-config-staleness.md`** before or in parallel with UI policy work so panel edits and policy changes apply immediately in preview.

## Work packages

| ID | Task | Status | Provides | Blocks |
| --- | --- | --- | --- | --- |
| — | *(filled by define-tasks)* | — | — | — |

## Progress

- **Overall:** 0%
- **Milestone A (model + eval):** —
- **Milestone B (UI + user-goals):** —

## Notes & risks

- **Policy naming (draft):** `lastNoteWins` | `holdIfHigher` | (optional later) `legato` — finalize in task 01 with UX copy.
- **`holdIfHigher` semantics:** At note overlap, output level = `max(currentLevelAtT, adsrNewNoteAtT)`; attack/decay of new note only raises level, never cuts it until natural decay/release of the winning segment — specify edge cases (same pitch restrike, velocity change) in task spec.
- **Frame cache:** Policy may require evaluating previous active note at `t` or storing last emitted level; avoid O(n) scan per binding per frame.
- **Staleness bug:** New policy is useless in panel if preset edits still read stale cache — link fix in WP 01 or prerequisite task.
- **User expectation:** Document that all policies remain **monophonic**; dense arpeggios still share one envelope contour.
