# Parameter drivers v1 — unified port-centric modulation

## Mission

Replace the split UX (audio signal picker + timeline-first automation) with one **parameter driver panel** opened from float parameter ports: **add**, **edit**, and **remove** **audio**, **animation**, and (v1 late) **MIDI envelope** drivers using the same shell. Graph wires and **`= + − ×`** input modes stay unchanged. Align shipped behavior with **`docs/user-goals/12-parameter-drivers.md`**.

## Goals

- **Primary:** Port double-click (or equivalent) opens **ParameterDriverPanel** for attach/edit/remove—not audio-only picker.
- **Audio:** Remapper attach/edit in panel; **left = filter/nav**, **main = config** with bands as section dividers (no oversized left config column).
- **Animation:** Add driver from port → lane + **default full-length region** → curve editor in panel; timeline panel **not required** for single-param authoring.
- **MIDI envelope (v1):** Note-hit → ADSR (+ out min/max) → parameter when **`arrangementSnapshot`** exists; monophonic/simple retrigger; velocity → peak optional in v1.
- **Secondary:** One **driver kind** per port (audio | animation | midi); graph connection + input modes still stack on animation base as today.

## Success & constraints

| Must-have | Detail |
| --- | --- |
| User-goals | **`12-parameter-drivers.md`** reflects shipped UX (drop **Current** labels where done). |
| Input modes | **`override` / `add` / `subtract` / `multiply`** unchanged for graph + audio wires. |
| Animation eval | Existing **`automationEvaluator`** + GLSL rules unchanged unless task explicitly lists a delta. |
| MIDI gate | No snapshot → MIDI driver UI disabled with clear copy. |
| Checks | `npm run type-check && npm test && npm run lint && npm run build` green per completed task. |
| Audiotool 05 | **DAW automation curves** (task 05 in **`audiotool-arrangement`**) remain **out of scope**—not the same as MIDI note envelopes. |

**Invariants:** Immutable graph updates; one graph wire per parameter port; no pixel-parity requirement across WebGL/WebGPU for new UI.

**Allowable v1 simplifications:** Timeline panel kept as optional overview (unchanged or lightly relabeled); polyphonic MIDI voice policy deferred to follow-up; driver binding storage may reuse virtual connections + `graph.automation` until task **04** adds MIDI sidecar fields.

## Architecture & design

```
Parameter port (double-click)
        │
        ▼
ParameterDriverPanel (shell: kind nav + main column)
        │
        ├── Audio ──► audioSetup remappers + virtual-node connection (existing)
        ├── Animation ──► graph.automation lane/region/curve (existing evaluator)
        └── MIDI envelope ──► new bindings + runtime evaluator (JS tick, like audio)
```

**Anti-patterns:** Second full-width sidebar for band config; requiring timeline panel to add animation; storing MIDI envelopes inside **`AudioRemapperEntry`**; baking ADSR into arrangement GLSL bake.

**High-touch areas:** `AudioSignalPicker*.svelte`, `NodeEditorCanvasWrapper.svelte` / `EventHandlerDeps`, `ParamPortWithAudioState.svelte`, `TimelineCurveEditor.svelte`, `immutableUpdatesAutomation.ts`, `parameterValueCalculator.ts`, `EffectiveValueUpdateRunner`, `serialization.ts`.

## Work items

| ID | Task | Status | Provides | Blocks |
| --- | --- | --- | --- | --- |
| 01 | [Driver panel shell + port routing](./01-driver-panel-shell-port-routing-parameter-drivers-v1.md) | ✅ | Panel chrome, port open/add/edit routing | 02A, 02B |
| 02A | [Audio driver panel layout](./02A-audio-driver-panel-layout-parameter-drivers-v1.md) | ✅ | Audio attach/edit in unified panel | 03 |
| 02B | [Animation driver from port](./02B-animation-driver-from-port-parameter-drivers-v1.md) | ✅ | Animation attach/edit in panel | 03 |
| 03 | [Driver exclusivity + port chrome](./03-driver-exclusivity-port-chrome-parameter-drivers-v1.md) | ✅ | One kind per port, unified port cues | 04, 05 |
| 04 | [MIDI envelope model + runtime](./04-midi-envelope-model-runtime-parameter-drivers-v1.md) | ✅ | Bindings serialize + evaluate at transport | 05 |
| 05 | [MIDI envelope UI + closeout](./05-midi-envelope-ui-closeout-parameter-drivers-v1.md) | ✅ | MIDI in panel; v1 package done | — |
| 06 | [Disconnect vs delete semantics](./06-disconnect-delete-semantics-parameter-drivers-v1.md) | ✅ | Unified remove vocabulary | 07 |
| 07 | [Unified focused driver header](./07-unified-focused-header-parameter-drivers-v1.md) | ✅ | Target + source header for all kinds | 09 |
| 08 | [MIDI envelope preset sharing](./08-midi-envelope-preset-sharing-parameter-drivers-v1.md) | ✅ | One preset → many params (audio parity) | 09 |
| 09 | [Overview, Swap, connect polish](./09-overview-swap-connect-polish-parameter-drivers-v1.md) | ✅ | Milestone C closeout | — |

**Execution order:** `01` → (`02A` ∥ `02B`) → `03` → `04` → `05` → **`06` → (`07` ∥ `08`) → `09`**.

## Progress tracker

- **Overall:** 100% — tasks 01–09 ✅ (v1 + milestone C UX unification shipped 2026-06-01).
- **Milestone A (shell + audio + animation):** tasks 01 ✅, 02A ✅, 02B ✅, 03 ✅.
- **Milestone B (MIDI):** task 04 ✅, task 05 ✅.
- **Milestone C (UX unification):** tasks 06–09 ✅ — see [UX review notes](#milestone-c-ux-unification-2026-06) below.

## Notes & risks

- **Data placement (locked for v1):** Audio + animation keep existing storage; MIDI bindings live in a **new serialized field** (e.g. `graph.midiEnvelopeBindings` or sibling on `SerializedGraphFile`)—**not** nested under `audioSetup` semantically even if colocated in JSON initially.
- **Compact audio picker:** Fold into same panel (header collapse), not a parallel popover family long term.
- **Curve editor reuse:** Embed `TimelineCurveEditor` in panel; confirm compile/render races match timeline modal behavior.
- **Exclusive drivers:** Attaching animation should disconnect audio virtual wire (and vice versa) with undo-safe immutable updates.

### Task 01 (2026-05-30)

- **`ParameterDriverPanel.svelte`** — left kind nav (Audio / Animation / MIDI stub) + main column; audio delegates to existing large/compact content; position key `parameter-driver-panel`.
- **`resolveDriverKindForParam.ts`** — edit-mode kind detection (audio connection vs evaluable automation lane).
- **`App.svelte`** — port double-click opens driver panel via `overlayBridge.showSignalPicker`; bottom-bar browse mode still uses `AudioSignalPicker`.

### Task 02A (2026-05-30)

- **`AudioDriverPanelContent.svelte`** — left band filter/nav (~148px); main column stacked band sections (divider + settings + remappers); scroll-to connected remapper on edit; replaces compact picker in port path.
- **`ParameterDriverPanel.svelte`** — audio kind always uses driver layout; header New band + audio disconnect wired; `{#key scrollSession}` remount for scroll-on-open.
- **`RemapperCard.svelte`** — connected-target highlight, power toggle, row disconnect for attached remapper.
- **`AudioSignalPicker.types.ts`** — `AudioDriverPanelProps`; browse panel unchanged (`AudioSignalPickerPanel` + `AudioSignalPickerLargeContent`).

### Task 02B (2026-05-30)

- **`immutableUpdatesAutomation.ts`** — `buildDefaultAutomationCurveForParam`, `resolveDefaultAutomationRegionDurationSeconds`, `addDefaultAutomationDriverForParam` (shared seeding with timeline).
- **`AnimationDriverPanelContent.svelte`** — add CTA, embedded `TimelineCurveEditor`, remove lane; transport/waveform hooks from App.
- **`ParameterDriverPanel.svelte`** — animation slot, float-only kind gate, disconnect/remove for animation drivers.
- **`TimelinePanel.svelte`** — `createRegion` uses shared curve seed helper.
- **`createDefaultAutomationRegion.test.ts`** — curve seed, duration resolve, add-driver flow.

### Task 03 (2026-05-30)

- **`parameterDriverAttach.ts`** — detach/prepare helpers; audio attach removes automation lane; animation attach removes audio virtual wire only (graph wires preserved).
- **`NodeEditorCanvasWrapper.svelte`** — exclusivity on audio connect (picker + drag-drop virtual nodes).
- **`AnimationDriverPanelContent.svelte`**, **`TimelinePanel.svelte`** — animation attach strips audio driver first.
- **`ParamPort.svelte`**, **`ParamPortWithAudioState.svelte`** — driver-kind icons/tooltips/a11y (“Double-click to edit driver”).
- **`TimelineHeaderControls.svelte`** — hint that drivers can be edited from parameter ports.
- **`docs/user-goals/12-parameter-drivers.md`** — milestone A UX marked shipped.

### Task 04 (2026-05-30)

- **`midiEnvelopeTypes.ts`**, **`immutableUpdatesMidiEnvelope.ts`** — `NodeGraph.midiEnvelopeBindings` sidecar on graph JSON; add/update/remove helpers; default ADSR + outMin/outMax.
- **`midiEnvelopeEvaluator.ts`** — ADSR state machine, last-note-wins monophonic policy, velocity-scaled output range, uniform collection helper.
- **`serialization.ts`**, **`validation.ts`** — sanitize/validate bindings; snapshot track-id warnings on deserialize.
- **`parameterDriverAttach.ts`** — MIDI detach + prepare helpers; audio/animation attach strips MIDI binding.
- **`resolveDriverKindForParam.ts`** — `'midi'` kind when binding present (audio > midi > animation).
- **`RuntimeManager.ts`**, **`ParamPortWithAudioState.svelte`**, **`EffectiveValueUpdateRunner.ts`**, **`parameterValueCalculator.ts`** — JS-side preview + panel live values (no GLSL bake).
- Tests: **`midiEnvelopeEvaluator.test.ts`**, **`midiEnvelopeSerialization.test.ts`**.

### Task 05 (2026-05-30)

- **`MidiDriverPanelContent.svelte`** — note-track left nav + main ADSR/out-range/velocity sections; attach/remove via panel; live output preview.
- **`ParameterDriverPanel.svelte`** — MIDI kind enabled (snapshot gate); disconnect + Delete key; delegates to MIDI content.
- **`ParamPort.svelte`** — `midi` driver kind icon (piano-keys) + violet port chrome + a11y.
- **`ParameterDriverPanel.stories.ts`**, **`ParamPort.stories.ts`** — MIDI layout screenshot reference stories.
- **`docs/user-goals/12-parameter-drivers.md`**, **`07-timeline-and-automation.md`**, **`docs/implementation/README.md`** — MIDI shipped; v1 package marked done.

### Task 07 (2026-06-01)

- **`DriverFocusedHeader.svelte`**, **`driverFocusedHeaderUtils.ts`** — shared Target + Source rows; live value (3 decimals); MIDI track chips with +N overflow; `Signal` prefix for audio.
- **`AudioSignalPickerCompact.svelte`** — focused header; removed duplicate param title from card body.
- **`AnimationDriverPanelContent.svelte`** — `Source: Transport` in unified header.
- **`MidiDriverPanelContent.svelte`**, **`MidiEnvelopeCard.svelte`** — header above embedded card (`hideTitleHeader`); delete in `headerActions`; `parameterTitle` on `MidiDriverPanelProps`.
- **`DriverFocusedHeader.stories.ts`**, **`DriverFocusedHeaderShowcase.svelte`** — per-kind + side-by-side Storybook reference.

### Task 08 (2026-06-01)

- **`midiEnvelopeTypes.ts`** — `MidiEnvelopePreset` + `MidiEnvelopeBinding` with `presetId`; `ResolvedMidiEnvelopeBinding` for evaluation.
- **`immutableUpdatesMidiEnvelope.ts`** — `addMidiEnvelopePreset`, `bindMidiEnvelopePresetToParam`, `updateMidiEnvelopePreset`, `removeMidiEnvelopePreset`; connect shares preset (no ADSR clone).
- **`midiEnvelopePresetMigration.ts`** — idempotent legacy inline-binding → preset+binding migration on deserialize / `migrateLegacyNodeGraph`.
- **`getMidiEnvelopePresetConnections.ts`**, **`MidiEnvelopeCard.svelte`**, **`MidiDriverPanelContent.svelte`** — preset list + connected-param secondary text (RemapperConnectionList parity).
- Tests: **`midiEnvelopePresetSharing.test.ts`**, updated serialization/connect tests.

### Task 09 (2026-06-01)

- **`ParameterDriverPanel.svelte`** — footer/toolbar **Swap** → **Browse** with kind-specific tooltips; `returnToFocusedEdit` for animation.
- **`MidiDriverPanelContent.svelte`** — overview **Connect** / **New** only in shell toolbar; nav filter-only; cards selection + badges (no card Connect).
- **`AnimationDriverPanelContent.svelte`** — overview **no shared preset library** copy + **Edit curve**; focused `compactDriverMode` on curve editor.
- **`TimelineCurveEditor.svelte`** — `compactDriverMode` + **Advanced** disclosure (snap, invert, keyframe delete).
- **`AudioDriverPanelContent.svelte`** — structured empty state; Connect stays on **RemapperCard**.
- **`docs/user-goals/12-parameter-drivers.md`**, **`docs/implementation/README.md`** — overview/browse pattern documented.

### Task 06 (2026-06-01)

- **`confirmDriverAssetDelete.ts`** — confirm when deleting remapper/envelope wired to multiple parameters.
- **`ParameterDriverPanel.svelte`** — footer **Remove curve** for animation; MIDI disconnect copy; no keyboard delete on focused audio.
- **`AudioSignalPickerCompact.svelte`** — removed focused header trash (disconnect via footer only).
- **`AnimationDriverPanelContent.svelte`** — single remove path in focused mode (footer); honest **Remove curve** copy.
- **`AudioDriverPanelContent.svelte`**, **`AudioSignalPickerLargeContent.svelte`**, **`MidiDriverPanelContent.svelte`**, **`MidiEnvelopeCard.svelte`** — delete vs disconnect labels and guarded deletes.
- **`docs/user-goals/12-parameter-drivers.md`** — disconnect/delete vocabulary table.

## Milestone C — UX unification (2026-06)

**Trigger:** Parameter driver panel ships three kinds in one shell, but parent/child semantics and remove affordances still feel like three products.

**Canonical model (target):**

```text
Sources → Driver preset → Binding to parameter
         (library)        (one per port)
```

| Kind | Preset library | Share preset across params | Disconnect |
| --- | --- | --- | --- |
| Audio | Remappers in `audioSetup` | Yes (one remapper, many wires) | Unbind wire |
| MIDI | Envelope presets on graph | Yes (one preset, many bindings) | Unbind |
| Animation | None (curve = binding) | N/A (1:1 lane) | Remove curve (data deleted) |

**Task map:**

| ID | Focus |
| --- | --- |
| **06** | Disconnect vs delete copy + behavior; stop focused audio trash deleting shared remappers |
| **07** | Unified focused header: target param + source row (band/tracks/transport) |
| **08** | MIDI preset/binding split or `presetId` — share like audio remapper |
| **09** | Overview/Swap/Browse honesty; dedupe Connect; animation editor chrome trim |

**Parallelism:** **07** and **08** can run after **06**; **09** closes milestone C.

**Follow-up:** Post-ship UX polish (connect-on-card, MIDI single-editor overview, audio band dedupe) → [`parameter-driver-panel-ux-v2/_OVERVIEW.md`](../parameter-driver-panel-ux-v2/_OVERVIEW.md). MIDI envelope **target ranges** (preset vs remapper split) → [`midi-envelope-remappers-v1/_OVERVIEW.md`](../midi-envelope-remappers-v1/_OVERVIEW.md).