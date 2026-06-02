# 02B — Panel cleanup — parameter-driver-bypass-on-node

## Agent instructions (START HERE)

Follow sections in order. Depends on task **01** (bypass must work from node UI before removing panel controls). Do **not** re-add bypass elsewhere in the panel.

Keep disconnect/delete flows intact; only remove **power / connection-disabled toggle** affordances.

## Overview

Remove duplicate **driver bypass power** buttons from the floating parameter driver panel and related audio remapper UI now that bypass lives on the node above the port.

## Scope

### In

- **`AudioSignalPickerCompact.svelte`**
  - Remove header power button and `handleConnectionPowerClick`
  - Drop unused `connectionDisabled` UI wiring if only used for power (keep prop if still needed for read-only state elsewhere—prefer remove dead props)
- **`AudioDriverPanelContent.svelte`**
  - Remove connection power toggle paths (`handleConnectionPowerToggle`, remapper card power props if passed for bypass)
- **`RemapperCard.svelte`**
  - Remove `connectionDisabled`, `onConnectionPowerToggle`, power button in header
  - Clean call sites in browse/large picker if they passed those props
- **`ParameterDriverPanel.svelte`**
  - Remove `connectionDisabled` pass-through to compact audio slot if no longer consumed
- **`AudioSignalPicker.types.ts`**
  - Trim types (`connectionDisabled`, power callbacks) no longer referenced
- **Stories / tests**
  - Update any Storybook or snapshot tests that asserted panel power button

### Out

- Node UI (**02A**)
- Changing disconnect / swap / delete behavior
- Bug doc (**03**)

## Dependencies

### Prerequisites

- Task **01** (bypass API).
- Task **02A** should be implemented first or in parallel **before merge** so users retain bypass affordance (avoid shipping 02B alone).

### Provides

- Single source of truth for bypass UX (node port row).

### Blocks

- None.

## Implementation tasks

1. Remove power toggle UI and handlers from compact audio driver panel content.
2. Remove power from `AudioDriverPanelContent` and `RemapperCard`; fix all prop call sites.
3. Delete unused types and `set-connection-disabled` panel-only paths if nothing else emits them from panel (node UI may still use store directly—**App.svelte** `onSelect` handler for `set-connection-disabled` can remain if node uses same payload).
4. Grep for `connectionDisabled`, `onConnectionPowerToggle`, `handleConnectionPower` in floating-panel + audio components; leave node path intact.
5. Run **`npm run type-check && npm run lint && npm run build`**.

## Technical notes

- **`set-connection-disabled` event type** in `types/editor.ts` may still be used by canvas wrapper—do not delete the type if node toggle reuses it.
- Browse-mode **`AudioSignalPickerPanel`** / large layout: confirm no stray power buttons on remapper cards in non-port contexts.

## Completion

✅ Done when no floating-panel or remapper card shows a driver bypass power control; node toggle is the only bypass entry; build passes.

### Final steps

- Mark task **02B** ✅ in **`_OVERVIEW.md`**; set package progress to 100% when **01**, **02A**, **02B**, and **03** are all ✅.
