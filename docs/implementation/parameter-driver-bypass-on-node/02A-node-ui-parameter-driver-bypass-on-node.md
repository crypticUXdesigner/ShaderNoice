# 02A — Node UI — parameter-driver-bypass-on-node

## Agent instructions (START HERE)

Follow sections in order. Depends on task **01** (`getParamDriverBypassState`, `setParamDriverBypass`, store actions). Do **not** remove panel power buttons here—that is **02B**.

Match **node header Power** interaction patterns (stop propagation on canvas drag layer, `aria-pressed`, dimmed icon). Follow **`svelte-standards.mdc`**, **`css-standards.mdc`**, **`design-system.mdc`**.

## Overview

Add a **driver bypass power toggle** on the node parameter row **above the port circle**, visible only when the port is shown and a bypass target exists. When bypassed, keep **connected** param-cell styling but **dimmed** port + row chrome.

## Scope

### In

- **Layout** (`ParamCell.svelte`, `ParameterCell.svelte`)
  - New slot/stack in left column: **label → power toggle → port row**
  - Toggle renders only when `showPort === true` **and** `hasBypassTarget` from task **01**
- **Control**
  - Reuse `IconSvg name="power"` + dimmed state (mirror `NodeHeader.svelte` / node power)
  - Labels: e.g. “Power — bypass driver for this parameter” / “Power — driver bypassed” (kind-aware copy optional)
  - `onclick` / capture handlers prevent node drag and port double-click side effects
- **State wiring**
  - `ParamPortWithAudioState.svelte`: derive bypass from **01** helpers; pass to `ParameterCell`
  - `NodeBody.svelte` / `Node.svelte` / `NodeEditorCanvasWrapper.svelte`: callback `onParamDriverBypassToggle(nodeId, paramName, bypassed)` → `graphStore` + runtime graph reload as needed
- **Visual feedback**
  - `ParamPort.svelte` + param-cell CSS: `data-bypassed` or class when bypassed—**connected colors, reduced opacity** (use `--opacity-disabled` or tokenized dimming—not disconnected idle state)
  - Peak meter / live value: do not show driver-driven motion when bypassed (static config display)
  - Update a11y on port + toggle (`aria-pressed`, tooltip)
- **Stories** (optional but preferred): `ParamPort.stories.ts` or `ParameterCell` story showing bypassed connected state

### Out

- Panel power removal (**02B**)
- Bug doc (**03**)
- Toggle on `showPort={false}` params
- Fixing animation+wire stacking product rule

## Dependencies

### Prerequisites

- Task **01** complete (bypass helpers + evaluators).

### Provides

- Shipped port-centric bypass UX on canvas nodes.

### Blocks

- None (package ships with **02B**).

## Implementation tasks

1. Add power toggle snippet/component above port row; gate on `showPort && hasBypassTarget`.
2. Plumb bypass state + toggle handler from canvas wrapper through `NodeBody` → `ParamPortWithAudioState` → `ParameterCell`.
3. Implement dimmed-connected styling on param cell and port when `bypassed`.
4. Ensure undo snapshot on toggle; verify preview updates when bypassing animation (recompile path).
5. Manual smoke: audio, animation, MIDI, and graph wire each bypass on/off from node; double-click port still opens driver panel.
6. Run **`npm run type-check && npm run lint && npm run build`**.

## Technical notes

- **Conflicts with 02B:** None if 02B only touches floating-panel files; coordinate if shared types move.
- **Mode button:** Stays on port row; power sits **above** port (user request).
- **Graph wires:** Toggle appears when any connection targets the param (not only virtual audio nodes).

## Completion

✅ Done when every bypass target kind can be toggled from the node row (visible port only), bypassed rows look connected-but-dimmed, effective values/static display match task **01** behavior, and build passes.

### Final steps

- Mark task **02A** ✅ in **`_OVERVIEW.md`**; update progress tracker when **02B** also ✅.
