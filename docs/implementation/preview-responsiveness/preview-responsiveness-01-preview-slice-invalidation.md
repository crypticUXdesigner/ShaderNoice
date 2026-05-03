## Agent instructions (START HERE)

- Follow sections in order; keep changes small and testable.
- Respect graph immutability boundaries (`src/data-model/**` owns updates; runtime/compilation read-only).
- Keep instrumentation **dev-only** and based on existing `previewPerformanceMarks.ts`.

## Overview

Define a stable notion of the **preview slice** (the minimal set of nodes/connections that can affect the preview output) and use it to avoid recompiles for **idle** graph edits.

This extends the initial “skip recompile for disconnected nodes” behavior into a complete policy that also covers:
- Parameter edits on idle nodes
- Changes that affect reachability (connection edits)
- Output node changes / missing output

## Scope

### In
- Compute preview slice reachable set from `finalOutputNodeId`, including **parameter connections** (not only port connections).
- Centralize “should recompile?” decision in runtime (CompilationManager), with a small, testable helper.
- Add unit tests covering:
  - add disconnected node → no compile
  - edit parameter on disconnected node → no compile
  - connect a previously disconnected node into the output slice → compile
  - change that removes output slice node → compile

### Out
- OffscreenCanvas/WebGL-in-worker changes
- UI changes (badges/toasts) beyond existing behavior

## Dependencies

### Provides
- A single, well-specified “idle edit” classification used consistently for compile scheduling.

### Blocks
- `preview-responsiveness-02A-*`
- `preview-responsiveness-02B-*`

## Implementation tasks

1. **Define preview slice reachability**
   - Decide what edges count:
     - port connections (inputs)
     - parameter connections (live parameter inputs)
   - Treat virtual sources (e.g. `audio-signal:*`) as leaf nodes.

2. **Apply slice logic to compile scheduling**
   - Structural changes: skip compile when added/changed nodes are outside slice and no reachability change occurred.
   - Parameter changes: if the changed node+param is outside slice, skip compile and (if applicable) skip uniform update.

3. **Tests**
   - Add/extend runtime unit tests around CompilationManager scheduling decisions.

## Technical notes

- `CompilationResult.metadata.finalOutputNodeId` is the best stable “root” for reachability. If missing, default to “always compile”.
- Be conservative for connection edits until reachability change detection is correct.

## Completion

✅ Done when:
- Idle edits (disconnected node add + param tweak) do **not** trigger compile/apply.
- Connecting that node into the output slice **does** trigger compile/apply.
- Tests cover these scenarios and pass.

### Final steps
- Run targeted vitest for the affected runtime tests.

