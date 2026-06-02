# 01 — Driver panel shell + port routing — parameter-drivers-v1

## Agent instructions (START HERE)

Follow sections in order. Respect **immutable graph** updates and existing **`handleSignalPickerClick`** call chain until you replace it deliberately.

Do **not** refactor audio remapper layout (**02A**) or embed curve editor (**02B**) in this task—only shell + routing + kind selection stub.

## Overview

Introduce **`ParameterDriverPanel`** (or rename/evolve `AudioSignalPickerPanel`) as the single floating surface for parameter drivers. Wire parameter port double-click to open it in **add** mode (no driver) or **edit** mode (detect audio connection or evaluable automation lane). Provide kind navigation: **Audio**, **Animation**, **MIDI envelope** (disabled stub with “requires arrangement import” copy).

## Scope

### In

- New or refactored panel shell under `src/lib/components/floating-panel/`:
  - Props: `targetNodeId`, `targetParameter`, `getGraph`, `onGraphUpdate`, `onClose`, audio/runtime deps as needed.
  - Layout skeleton: **narrow left** (kind list + future filter slot), **main** (placeholder slot per kind).
  - Header: parameter label, **Disconnect driver** (no-op/disabled until kind attached), close.
- Replace **`handleSignalPickerClick`** routing in `EventHandlerDeps` / `App.svelte` / canvas wrapper so port double-click opens **driver panel** (keep behavior equivalent for “already audio-connected” → edit audio kind).
- Detect **edit mode** driver kind:
  - Audio: existing virtual-node connection on param.
  - Animation: lane with evaluable regions for `(nodeId, paramName)`.
  - Default add mode: kind chooser when none attached.
- Stories or minimal manual test notes for panel open/close positioning (`floatingPanelPosition.ts`).

### Out

- Audio remapper main-column layout (**02A**).
- Creating automation lane from panel (**02B**).
- MIDI runtime (**04**).
- Removing **`AudioSignalPicker.svelte`** entirely (may delegate to new panel in this task if thin wrapper).

## Dependencies

### Prerequisites

- User-goals **`12-parameter-drivers.md`** (intent reference).

### Provides

- Stable panel API and port entry for **02A**, **02B**.

### Blocks

- **02A**, **02B** until shell merges.

## Implementation tasks

1. Add **`ParameterDriverPanel.svelte`** (+ barrel export) with left/main layout and kind tabs.
2. Implement **`resolveDriverKindForParam(graph, nodeId, paramName)`** helper (audio | animation | null) for edit routing.
3. Route canvas **`onPortClickForSignalPicker`** → open driver panel with target param; preserve strict double-click behavior on `ParamPort`.
4. MIDI tab: visible, disabled, tooltip/copy per user-goals gate.
5. **`npm run type-check`**, **`npm run build`** green; smoke: double-click port opens panel, close dismisses, reopen on same port restores kind.

## Technical notes

- Reuse **`FloatingPanel`** chrome and anchor positioning from audio picker where possible.
- **`ParamPortWithAudioState`** unchanged except call site name if needed; port a11y label may say “Double-click to manage driver” in a follow-up (**03**).

## Completion

✅ Done when port double-click opens the **unified driver panel** (not legacy audio-only large picker as the primary path), kind navigation works, edit mode selects audio or animation when present, and build passes.

### Final steps

- Mark task **01** ✅ in **`_OVERVIEW.md`**; unblock **02A** / **02B**.
