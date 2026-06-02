# 03 — Driver exclusivity + port chrome — parameter-drivers-v1

## Agent instructions (START HERE)

Depends on **02A** and **02B**. Immutable updates only; record undo on driver attach/detach like connection changes.

## Overview

Enforce **one primary driver kind per parameter port** (audio **or** animation **or** future MIDI). Unify port affordances: icons, tooltips, a11y (“Double-click to edit driver”), disconnect in panel. Clarify timeline panel as **optional overview** (no UX regression for multi-lane editing).

## Scope

### In

- **`attachDriverKind`** helpers (or equivalent):
  - Adding **audio** remapper disconnects evaluable **animation** lane for that param (remove lane or strip evaluable regions—pick one, document).
  - Adding **animation** disconnects **audio** virtual connection for that param.
- Panel **Add** flow when other kind exists: prompt or auto-replace with single confirm (keep copy short—user-goals: remove-then-add, not wizard).
- **`ParamPort` / `ParamPortWithAudioState`**: consistent driven-state visuals; tooltips reference driver kind name.
- Header **Disconnect driver** in panel fully wired for audio + animation.
- Timeline panel: add helper text or doc comment in **`TimelineHeaderControls`** (“You can also edit from the parameter port”)—no mandatory redesign.
- Update **`docs/user-goals/12-parameter-drivers.md`**: flip **Current/Target** for shipped items (audio + animation port path).

### Out

- MIDI exclusivity (**05** adds third kind).
- Deprecating timeline panel entirely.

## Dependencies

### Prerequisites

- **02A**, **02B**.

### Provides

- Product-intent **one driver per port** for shipped kinds.

### Blocks

- **04**, **05** (MIDI should assume exclusivity helpers exist).

## Implementation tasks

1. Implement detach/attach orchestration in one module (e.g. `src/utils/parameterDriverAttach.ts`).
2. Wire exclusivity into audio connect and animation add paths (panel + any remaining legacy entry points).
3. Port chrome + a11y pass on **`ParamPort.svelte`**.
4. Panel disconnect for both kinds; verify undo restores prior driver state.
5. Manual matrix: audio→animation, animation→audio, disconnect, graph wire + animation base + input modes still work.

## Technical notes

- **`computeEffectiveParameterValue`** stacking unchanged: animation base + audio wire with multiply/add/etc.
- Do not break presets with both lane and audio on same param—migration not required if attach-time exclusivity is forward-only; optional warning on load in validation (Out unless trivial).

## Completion

✅ Done when only one of audio/animation drivers can be active per param, port UI reflects kind, disconnect works from panel, input modes with graph wires still work, user-goals updated for milestone A, build green.

### Final steps

- Mark **03** ✅; milestone A complete in **`_OVERVIEW.md`**.
