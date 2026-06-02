# Parameter driver panel UX v2 — library layout & connect parity

## Mission

Close the **post–milestone C** UX gaps in the unified **parameter driver panel**: one overview anatomy (nav → single editor), **Connect on the asset** (primary), shared empty states and card chrome, and less redundant audio band UI. Builds on shipped **`parameter-drivers-v1`**; does not change driver data models, evaluators, or exclusivity rules.

**Source:** Agent UX review (2026-06) of `ParameterDriverPanel` + Audio / Animation / MIDI tab content.

## Goals

- **Overview:** Left library column **filters/selects**; main column edits **one** asset at a time (audio band section or MIDI envelope preset)—not a scroll of full duplicate editors.
- **Connect:** **Primary `Connect` on the preset card** (remapper / envelope) for audio and MIDI overview; remove overview **toolbar Connect** for MIDI. Animation keeps honest **Add / Edit curve** exception (no shared library).
- **Card chrome:** Shared section order and header actions: **Connect | Disconnect | Duplicate (if any) | Delete**; shared **Targets** list component for remappers and MIDI.
- **Audio bands:** Drop duplicate **Attack/Release** row above spectrum; default **one band** in main (optional “all bands”); optional collapse of heavy **band analysis** (spectrum/FFT) so remappers stay primary.
- **Empty states:** One visual pattern (icon, title, copy, primary CTA) across kinds; audio empty states get primary actions like MIDI/animation.
- **Docs:** Update **`docs/user-goals/12-parameter-drivers.md`** to match shipped interaction matrix.

## Success & constraints

| Must-have | Detail |
| --- | --- |
| User-goals | **`12-parameter-drivers.md`** reflects connect-on-card + overview selection model. |
| Invariants | Immutable graph/audioSetup updates; driver exclusivity unchanged; animation still 1:1 lane per port. |
| Task 09 intent | Finishes **Connect dedupe** called out in **`parameter-drivers-v1/09`** (toolbar vs card)—without reopening v1 task files. |
| Checks | `npm run type-check && npm test && npm run lint && npm run build` green per completed task. |

**Out of scope:** New driver kinds; MIDI polyphony; timeline panel redesign; band/remapper data-model changes; port bypass toggle (**`parameter-driver-bypass-on-node`**).

## Architecture

```text
ParameterDriverPanel (shell unchanged)
        │
        ├── DriverPanelEmptyState (shared)
        ├── DriverPresetCardShell (shared chrome)
        │
        ├── AudioDriverPanelContent ── band nav → ONE band section → RemapperCard(s)
        ├── MidiDriverPanelContent ── preset nav → ONE MidiEnvelopeCard
        └── AnimationDriverPanelContent ── empty / no-library / curve (exception)
```

**High-touch files:** `ParameterDriverPanel.svelte`, `AudioDriverPanelContent.svelte`, `MidiDriverPanelContent.svelte`, `MidiEnvelopeCard.svelte`, `RemapperCard.svelte`, `RemapperConnectionList.svelte`, `DriverConnectionTargetTags.svelte`, `FrequencyRangeEditor.svelte`, `AnimationDriverPanelContent.svelte`, `docs/user-goals/12-parameter-drivers.md`.

## Work items

| ID | Task | Status | Provides | Blocks |
| --- | --- | --- | --- | --- |
| 01 | [Shared panel primitives](./01-shared-panel-primitives-parameter-driver-panel-ux-v2.md) | ✅ | `DriverPanelEmptyState`, `DriverPresetCardShell` | 02A, 02B, 03, 04, 05 |
| 02A | [Connect on card](./02A-connect-on-card-parameter-driver-panel-ux-v2.md) | ✅ | Primary Connect on remapper/envelope; no MIDI toolbar Connect | 06 |
| 02B | [MIDI overview single selection](./02B-midi-overview-single-selection-parameter-driver-panel-ux-v2.md) | ✅ | Nav selects one preset editor in main | 06 |
| 03 | [Audio overview layout](./03-audio-overview-layout-parameter-driver-panel-ux-v2.md) | ✅ | One band default, deduped smoothing, optional analysis collapse | 06 |
| 04 | [Unify Targets UI](./04-unify-targets-ui-parameter-driver-panel-ux-v2.md) | ✅ | Remappers use `DriverConnectionTargetTags` | 06 |
| 05 | [Empty states wiring](./05-empty-states-wiring-parameter-driver-panel-ux-v2.md) | ✅ | All kinds use shared empty pattern + audio CTAs | 06 |
| 06 | [Docs + Storybook closeout](./06-docs-storybook-closeout-parameter-driver-panel-ux-v2.md) | ✅ | user-goals + regression stories | — |

**Execution order:** `01` → (`02A` ∥ `02B` ∥ `03` ∥ `04` ∥ `05`) → `06`.

**Parallelism note:** `02B` should land **with or after** `02A` so the single MIDI card exposes **Connect** in the main column. `03`–`05` can run in parallel once **01** is done; avoid conflicting edits in the same Svelte file in one PR when possible (`MidiDriverPanelContent` = 02A+02B; `AudioDriverPanelContent` = 03+05).

## Progress tracker

- **Overall:** **100%** — package complete 2026-06-02 (tasks **01**–**06**).
- **Milestone A (primitives):** task **01** ✅ — `DriverPanelEmptyState.svelte`, `DriverPresetCardShell.svelte`, Storybook showcases, exports in `floating-panel/index.ts`. Fixed `DriverFocusedHeader.stories.ts` sample target (`categorySlug` / `subgroupSlug`) for `tsc`.
- **Milestone B (overview + connect):** tasks **02A** ✅, **02B** ✅, **03** ✅, **04** ✅, **05** ✅ — `RemapperCard` primary Connect + header action order; MIDI overview toolbar is **New envelope** only; `MidiDriverPanelContent` main column shows **one** `MidiEnvelopeCard` via `editorPreset` + filter sync. **03:** `AudioDriverPanelContent` defaults to first band (not All bands); **All bands** in nav footer; duplicate Attack/Release + FFT rows removed; **Band analysis** `PanelSection` collapsed by default with `FrequencyRangeEditor` (single attack/release + FFT surface). **04:** `RemapperCard` uses `DriverConnectionTargetTags` (same as MIDI); call sites resolve via `resolveDriverConnectionTargetDisplay`; `RemapperCard.stories` — 0/1/2+ targets + active highlight. **05:** `DriverPanelEmptyState` wired in `AudioDriverPanelContent` (primary **New band** via `onNewBand`), `MidiDriverPanelContent` (overview + focused **Browse** via `onBrowseOverview`; nav duplicate hint removed), `AnimationDriverPanelContent`; props in `AudioSignalPicker.types.ts`.
- **Milestone C (docs):** task **06** ✅ — `docs/user-goals/12-parameter-drivers.md` (overview selection, connect-on-card, Targets, band analysis); `ParameterDriverPanelUxV2.stories.ts` regression stories; implementation README marked done.

## Notes & risks

- **RemapperConnectionList** may remain for non–driver-panel surfaces until migrated; task **04** scopes driver-panel remapper cards only.
- **FrequencyRangeEditor** still owns attack/release when band analysis is expanded—task **03** removes only the duplicate row in `AudioDriverPanelContent`.
- **Focused mode** behavior is mostly unchanged; regression-test focused audio compact + MIDI embedded card + animation curve footer.
