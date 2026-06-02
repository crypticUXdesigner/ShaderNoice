# 06 — Disconnect vs delete semantics — parameter-drivers-v1

## Agent instructions (START HERE)

Milestone **C** (UX unification). Follow sections in order. Preserve immutable graph / `audioSetup` update paths; record undo on attach/detach/delete like today.

**Context:** UX review (2026-06) — three driver kinds share one panel shell but **Disconnect**, **Delete**, and header trash mean different things per kind. This task aligns **behavior and copy** before header/layout polish (**07**).

## Overview

Establish one vocabulary across audio, animation, and MIDI envelope drivers:

| Action | Meaning |
| --- | --- |
| **Disconnect** | Remove driver from **this parameter port** only. Preset / curve data may remain elsewhere. |
| **Delete** | Remove the **preset asset** from the project (library). Warn when other parameters still use it. |

**Animation exception (document, do not fight):** curves have no shared preset library — removing the driver **is** deleting the curve. Use distinct copy (“Remove curve”), not “Disconnect.”

## Scope

### In

- **Audio (focused):** Header trash must **not** delete a shared remapper while editing one parameter. Trash → delete only from overview/library context, or replace with non-destructive control. Footer **Disconnect** = remove virtual wire only (unchanged).
- **Animation (focused):** Remove duplicate remove controls — pick **one** primary remove affordance (footer **Remove curve** or header trash, not both). Rename footer **Disconnect** → **Remove curve** (or equivalent) when lane data is destroyed.
- **MIDI (focused):** Footer **Disconnect** = `unbindMidiEnvelopeBindingForParam` (keep preset). Header trash = **Delete envelope** (remove binding record from graph). Ensure copy matches behavior.
- **Keyboard Delete/Backspace** in panel: map to **Delete preset** only when safe; never delete shared audio remapper from focused param view without confirmation.
- Update **`docs/user-goals/12-parameter-drivers.md`** §3 (edit/remove flows) with the unified vocabulary table + animation exception.

### Out

- Shared header component (**07**).
- MIDI preset sharing across params (**08**).
- Overview layout / Swap relabel (**09**).

## Dependencies

### Prerequisites

- Tasks **01–05** shipped (parameter drivers v1).

### Provides

- Consistent disconnect/delete semantics and copy for **07** header work.

### Blocks

- **07** (focused header should reflect final action names).

## Implementation tasks

1. Audit all remove/disconnect entry points:
   - `ParameterDriverPanel.svelte` (footer, toolbar)
   - `AudioSignalPickerCompact.svelte`, `AudioDriverPanelContent.svelte`, `RemapperCard.svelte`
   - `AnimationDriverPanelContent.svelte`
   - `MidiDriverPanelContent.svelte`, `MidiEnvelopeCard.svelte`
2. **Audio focused:** Change header trash to **Disconnect-only** or remove it; move remapper **Delete** to overview `RemapperCard` (with multi-target warning via `getRemapperParameterConnections`).
3. **Animation focused:** Single remove path; relabel actions; footer button text ≠ “Disconnect” when data is destroyed.
4. **MIDI focused:** Verify trash = delete binding, footer = unbind; align `aria-label` / `title` strings.
5. Add confirmation when deleting audio remapper or MIDI envelope preset that is connected to **>1** parameter (minimal dialog or inline confirm — match existing overlay patterns).
6. Manual matrix: audio remapper on 2 params → focused trash/disconnect on one param leaves remapper + other wire intact; animation remove deletes lane; MIDI disconnect leaves unbound preset in overview list.
7. Update **`12-parameter-drivers.md`** disconnect/delete subsection.

## Technical notes

- `detachAudioDriverForParam` / `unbindMidiEnvelopeBindingForParam` / `removeAutomationLane` already encode the right data semantics — this task is primarily UX wiring + copy.
- `registerDeleteHandler` in focused shell: should invoke **Delete preset**, not disconnect, and only when overview-safe or confirmed.

## Completion

✅ Done when focused audio trash cannot silently delete a shared remapper; animation uses one remove control with honest copy; MIDI disconnect vs delete match labels; multi-target delete warns; user-goals updated; **`npm run type-check && npm test && npm run lint && npm run build`** green.

### Final steps

- Mark **06** ✅ in **`_OVERVIEW.md`**.
