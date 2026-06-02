# MIDI envelope remappers v1 — band/remapper parity for note-hit drivers

## Mission

Split MIDI note-hit drivers into two shareable layers—matching audio **bands → remappers → parameter ports**:

1. **Envelope preset** — arrangement track filter + ADSR (+ velocity-to-peak); no output range.
2. **Envelope remapper** — `outMin` / `outMax` only; parameters connect here, not to the envelope preset.

Bindings reference **`remapperId`** (not `presetId`). Evaluation computes normalized ADSR level **once per envelope preset per transport sample**, then applies each remapper’s output range.

## Goals

- **Product:** Same driver-panel mental model as audio (`MidiDriverPanelContent` ≈ `AudioDriverPanelContent`): envelope sections + remapper cards with **Connect** on the remapper.
- **Data:** Serializable on `NodeGraph`; idempotent load migration from preset-level `outMin`/`outMax` + `presetId` bindings.
- **Runtime:** No behavior regression for migrated graphs; optional preset-level frame-cache dedupe for shared envelopes.
- **Docs:** Align **`docs/user-goals/12-parameter-drivers.md`** (fix “per binding” range copy).

## Success & constraints

| Must-have | Detail |
| --- | --- |
| User-goals | **`12-parameter-drivers.md`** — MIDI: envelope library + target ranges; connect on remapper card. |
| Audio parity | Do **not** nest MIDI remappers in `audioSetup`; keep graph fields separate from FFT setup. |
| Attach model | **Bindings** per port (not virtual-node wires) for v1 — same as current MIDI stack. |
| Checks | `npm run type-check && npm test && npm run lint && npm run build` green per completed task. |
| Preset sharing | One remapper → many parameter ports (like audio remapper → many connections). |

**Invariants:** Immutable graph updates; one MIDI driver binding per float port; driver exclusivity unchanged (`parameterDriverAttach.ts`).

**Out of scope (v1):** MIDI `inMin`/`inMax`; virtual-node `midi-signal:remap-*` connections; per-binding ADSR overrides; polyphonic voice policy changes.

## Architecture

```text
MidiEnvelopePreset (tracks + ADSR)
        │
        ├── MidiEnvelopeRemapper (outMin, outMax)
        │         ├── binding → Param A
        │         └── binding → Param B
        └── (more remappers on same preset)
```

**Anti-patterns:** Connect on envelope card; storing `outMin`/`outMax` on preset after migration; duplicating full envelope presets only to change output range.

**High-touch areas:** `midiEnvelopeTypes.ts`, `immutableUpdatesMidiEnvelope.ts`, `midiEnvelopeFrameCache.ts`, `MidiDriverPanelContent.svelte`, `serialization.ts`, `12-parameter-drivers.md`.

## Work items

| ID | Task | Status | Provides | Blocks |
| --- | --- | --- | --- | --- |
| 01 | [Data model + migration](./01-data-model-migration-midi-envelope-remappers-v1.md) | ✅ | Types, migration, serialize sanitize | 02 |
| 02 | [Immutable API + validation](./02-immutable-api-validation-midi-envelope-remappers-v1.md) | ✅ | CRUD, resolve, remapper connections helper | 03, 04, 05 |
| 03 | [Evaluator + frame cache](./03-evaluator-frame-cache-midi-envelope-remappers-v1.md) | ✅ | Preset-level level cache + remapper remap | 06 |
| 04 | [Driver panel UI](./04-driver-panel-ui-midi-envelope-remappers-v1.md) | ✅ | Band-style sections + remapper cards | 06 |
| 05 | [Attach / detach / delete](./05-attach-detach-delete-semantics-midi-envelope-remappers-v1.md) | ✅ | Connect remapper, delete confirms | 06 |
| 06 | [Docs + tests closeout](./06-docs-tests-closeout-midi-envelope-remappers-v1.md) | ✅ | User-goals + manual QA checklist | — |

**Execution order:** `01` → `02` → `03` → (`04` ∥ `05` after `02`; `05` should land with or before `04` for Connect wiring) → `06`.

Recommended branch flow: **`01` → `02` → `03` → `04`+`05` (same PR)** → **`06`**.

## Progress tracker

- **Overall:** **100%** — package **done** (2026-06-02).
- **Milestone A (model + runtime):** **01**–**03** ✅.
- **Milestone B (UX + semantics):** **04**–**05** ✅.
- **Milestone C (docs + verification):** **06** ✅.

## Notes & risks

- **Migration:** One default remapper per preset (`remapper-{presetId}`) when all bindings shared one preset and one out range; split remappers if legacy graphs had conflicting ranges on the same preset (document in migration).
- **Naming:** Code `MidiEnvelopeRemapper`; UI section **Target ranges** (audio panel keeps **Remappers**).
- **Performance:** Task **03** preset-level cache is in scope for v1 (cheap win once model splits).

### Task 01 notes (2026-06-02)

- `MidiEnvelopeRemapper` on graph; bindings use `remapperId`; preset `envelope` is ADSR-only.
- Idempotent migration `remapper-{presetId}` in `midiEnvelopeRemapperMigration.ts`; wired in `sanitizeGraphMidiEnvelopeBindings` + `migrateLegacyNodeGraph`.
- Minimal `resolveMidiEnvelopeBinding` / `updateMidiEnvelopeRemapper` + card `outputRange` prop so existing panel compiles until **04**.

### Task 02 notes (2026-06-02)

- Remapper CRUD: `addMidiEnvelopeRemapper`, `removeMidiEnvelopeRemapper`, `duplicateMidiEnvelopeRemapper` (reuses `duplicateRemapperName`); `connectMidiEnvelopeRemapperToParam` is the remapper-centric connect API.
- `getMidiEnvelopeRemapperConnections.ts` mirrors audio `getRemapperParameterConnections`; preset delete still cascades remappers + bindings.
- Validation: remapper collection + orphan remapper warnings; `validateGraph` triggers when remappers exist without presets/bindings.
- Tests: `midiEnvelopeRemapperApi.test.ts`, `getMidiEnvelopeRemapperConnections.test.ts`; preset-sharing tests use remapper-centric bind/connect.

### Task 03 notes (2026-06-02)

- Evaluator split: `evaluateMidiEnvelopePresetLevelAtTime` (shape + peak) → `remapMidiEnvelopeBindingOutput` with remapper `outMin`/`outMax`.
- Frame cache: `levelByPresetId` per `syncMidiEnvelopeFrame` tick; ADSR computed once per unique preset, remapper range applied per binding.
- Tests: shared-preset/different-remapper parity, disabled binding skipped, frame cache matches direct eval.

### Task 04 notes (2026-06-02)

- `MidiRemapperCard.svelte` — out-range `RemapRangeEditor`, Connect/duplicate/delete, target tags via `getMidiEnvelopeRemapperConnections`.
- `MidiDriverPanelContent` — band-style envelope sections + **Target ranges** list; `MidiEnvelopeCard` ADSR/tracks only (no Connect, no output range).
- Live needles: preset shape via `getMidiEnvelopeFramePresetShape`; remapped output per binding.
- `MidiDriverPanelProps`: `focusRemapperId` / `initialPresetId`; `ParameterDriverPanel` passes from current binding.

### Task 05 notes (2026-06-02)

- Connect/disconnect on remapper cards: `connectMidiEnvelopeRemapperToParam` + `prepareGraphForMidiDriverAttach`; preset-level `connectMidiEnvelopePresetToParam` removed from panel.
- Delete confirms: remapper `assetKind: 'remapper'`; envelope uses `getMidiEnvelopePresetConnections` (all child remappers).
- `addMidiEnvelopeBinding` unchanged (already binds default remapper); footer disconnect still unbinds binding only.

### Task 06 notes (2026-06-02)

- User-goals: **`12-parameter-drivers.md`** (MIDI preset vs target range, Connect on range card, disconnect/delete table); **`06-audio.md`** cross-ref + snapshot wording.
- UI label: **Target ranges** (panel + docs); README row marked **Done**.
- Checks: `npm run type-check && npm test && npm run lint && npm run build` green.
- Manual QA (automated coverage where noted):
  - Pre-migration graph → ranges preserved: `midiEnvelopeRemapperMigration` + sanitize tests.
  - Two remappers, one preset, two params, different scales: evaluator/frame-cache tests.
  - One remapper → two params; shared `outMin`/`outMax`: `getMidiEnvelopeRemapperConnections` + preset-sharing tests.
  - Delete remapper with 2 targets → confirm: delete semantics in panel + `removeMidiEnvelopeRemapper` tests.
  - Port bypass: unchanged driver path; no regressions in `npm test`.
