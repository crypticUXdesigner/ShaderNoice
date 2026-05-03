# Graph undo / redo — implementation plan

## Status (as of authoring)

- **`UndoRedoManager`** (`src/ui/editor/UndoRedoManager.ts`) implements a bounded stack (50 entries), `pushState`, `undo`, `redo`, `canUndo`, `canRedo`.
- **`App.svelte`** registers `graphStore.setGraphChangedListener` so **every graph mutation pushes** a snapshot onto the manager.
- **No production path calls `undo()` or `redo()`** — users cannot revert changes today despite history being recorded.

User goals: **`docs/user-goals/11-undo-redo-and-keyboard.md`**.

## Goal

- **Ctrl/Cmd+Z** restores the previous graph (and integrated view state stored on the graph).
- **Ctrl/Cmd+Shift+Z** restores the next state when available.
- Shortcuts respect the same guards as other canvas shortcuts (not when typing in inputs; follow existing dialog rules from `KeyboardShortcutHandler` / app `isDialogVisible`).
- **Clear history** when the graph is replaced wholesale (preset load, full paste, hub resolve) — already happens via `undoRedoManager.clear()` in those flows; re-verify after wiring undo that `pushState` does not run with stale listener ordering.

## Design notes

1. **Single choke point**  
   Prefer handling Z / Shift+Z in one place (e.g. extend `KeyboardShortcutHandler` with `onUndo` / `onRedo`, or a small dedicated module) so behavior stays consistent with Delete/copy/paste.

2. **Apply restored graph**  
   On undo/redo: obtain `NodeGraph | null` from the manager; if non-null, call the same path used elsewhere to replace graph + notify runtime (e.g. `graphStore.setGraph`, runtime `loadGraph`, selection sync, canvas `setGraph` / fit if needed). Avoid duplicating a fragile subset of updates.

3. **Listener feedback loop**  
   `setGraph` will trigger `setGraphChangedListener` → `pushState`. You must **suppress the next push** when the graph change originated from undo/redo (e.g. a boolean flag, or temporarily detach listener, or pass a cause through the store). Otherwise every undo pushes a duplicate snapshot and breaks the stack.

4. **Audio setup**  
   User goals state undo may not track **audio setup** separately. Do **not** expand scope unless product explicitly asks: undo restores **graph** (and view state on graph) only; audio panel changes remain outside history unless later specified.

5. **UI (optional second phase)**  
   Top bar or menu entries for Undo/Redo can call the same handlers and use `canUndo` / `canRedo` for disabled state.

## Verification

- Add unit/integration coverage where practical: after N edits, undo N times matches initial graph; redo restores; edit after undo truncates redo branch (manager already does this).
- Manual: parameter tweak, node add, connection add — each undo step visible on canvas and in preview.

## Files to touch (expected)

- `src/ui/editor/canvas/KeyboardShortcutHandler.ts` — add Z / Shift+Z (with modifier checks).
- `src/lib/App.svelte` — wire callbacks to `undoRedoManager`, apply graph, suppress push-on-restore.
- Possibly `src/lib/stores/graphStore.svelte.ts` — optional `setGraphFromUndoRedo` or `pushUndo: boolean` if cleaner than a flag in `App`.

## Done when

- **`docs/user-goals/11-undo-redo-and-keyboard.md`** matches shipped behavior (user-invokable undo/redo).
- This doc is updated (status section) or removed if fully superseded by a task package under `docs/implementation/`.
