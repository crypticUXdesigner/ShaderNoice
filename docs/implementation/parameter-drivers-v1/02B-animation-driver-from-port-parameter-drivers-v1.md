# 02B — Animation driver from port — parameter-drivers-v1

## Agent instructions (START HERE)

Depends on **01**. Do **not** change **`automationEvaluator`** rules unless a bug is found. Use **`immutableUpdatesAutomation`** helpers only.

Embedding curve editor: match timeline modal compile-on-commit behavior (drag preview local state, commit on pointerup).

## Overview

**Animation** kind in driver panel: **Add animation** creates **`addAutomationLane`** + one **default region** spanning `[0, automation.durationSeconds]` (or transport duration) seeded from current param value; embed **`TimelineCurveEditor`** in the panel main area for edit. User can add/edit/remove animation **without opening timeline panel**.

## Scope

### In

- Animation kind slot in **`ParameterDriverPanel`**:
  - No lane / empty lane: **Add animation driver** CTA → lane + region + flat or two-keyframe curve at current param value (match **`TimelinePanel.createRegion`** seeding logic—extract shared helper if duplicated).
  - Evaluable lane: embed **`TimelineCurveEditor`** with same props as timeline modal (`getGraph`, `onGraphUpdate`, waveform optional, seek hooks if cheap).
  - **Remove animation driver**: remove lane (or last evaluable region + lane if empty)—document chosen behavior in code comment.
- Panel receives **`getTimelineState`**, **`onSeek`**, waveform deps as needed for curve editor parity.
- Float params only; disable Animation kind with tooltip when param is not float (mirror timeline Add Lane filter).

### Out

- Timeline panel removal/redesign (**03** may add copy only).
- Multi-region advanced authoring UI (split/loop)—existing timeline panel remains for power users until follow-up.
- Driver exclusivity vs audio (**03**).

## Dependencies

### Prerequisites

- **01** driver panel shell.

### Provides

- Port-centric animation authoring per user-goals **07** / **12**.

### Blocks

- **03** exclusivity rules should land after this + **02A**.

## Implementation tasks

1. Extract **`createDefaultAutomationRegionForParam(graph, nodeId, paramName)`** (or similar) shared with timeline if useful.
2. Implement Animation kind UI: add / edit / remove lane from panel.
3. Embed **`TimelineCurveEditor`**; verify panel resize/scroll does not break SVG hit-testing.
4. Manual: add animation from port, add keyframe, play transport, param follows curve; remove driver restores static param display.
5. Vitest: helper for default region seed if extracted (optional if logic is thin).

## Technical notes

- **`automationLaneHasEvaluableRegions`** gates port **`timelineDriven`** cue—should turn on after add.
- Recompile: region curve commits must use same graph update path as timeline editor.

## Completion

✅ Done when user can **add, edit, and remove** animation for a float param from **driver panel only** (timeline panel not required), evaluation matches existing lane rules, build + tests green.

### Final steps

- Mark **02B** ✅ in **`_OVERVIEW.md`**.
