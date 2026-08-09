# 01 — App.svelte feature modules — arch-perf-followups

## Agent instructions (START HERE)

Follow sections in order. Extract **wiring only**—preserve behavior. Do not invert export dialog mounting here (**02**).

Respect **`_OVERVIEW.md`**: immutable graph; runtime still receives graph via callbacks.

## Overview

Continue decomposing `src/lib/App.svelte` (~2.1k LOC) into `src/lib/app/` feature modules (audiotool, undo/history, runtime listeners, preview compile UI sink wiring, etc.) so the shell stays a thin composer.

## Scope

### In

- Inventory current responsibilities in `App.svelte` (list in PR/notes).
- Extract ≥2 cohesive modules (prefer building on `editorRuntimeBootstrap.ts`, `appExportSession.ts`, `graphRevisionListeners.ts`).
- Keep public app behavior: store ↔ runtime callbacks, undo, export entry, audiotool connect.
- Smoke: app boots; graph edit still recompiles; parameter tweak updates uniforms.

### Out

- Full redesign of shell UX; moving UndoRedoManager package location (optional note only).
- Export orchestrator Svelte unmount (**02**).

## Dependencies

### Prerequisites

- **`arch-perf-followups/_OVERVIEW.md`**

### Provides

- Thinner App for future features.

### Blocks

- Soft conflict with **02** if both edit export entry—coordinate.

## Implementation tasks

1. Map sections of `App.svelte` to candidate modules.
2. Extract first module + wire imports; type-check.
3. Extract second module; remove dead locals from App.
4. Targeted tests if modules are pure; otherwise manual smoke checklist in completion notes.

## Technical notes

- Prefer plain `.ts` modules over new mega-components.
- Do not import runtime into unrelated UI modules; keep DI/factory patterns.

## Completion

✅ Done when `App.svelte` is materially thinner (≥2 extractions modules landed), behavior preserved, and `npm run type-check` (+ relevant tests) pass.

### Final steps

- Mark task **01** ✅ in **`_OVERVIEW.md`**.
