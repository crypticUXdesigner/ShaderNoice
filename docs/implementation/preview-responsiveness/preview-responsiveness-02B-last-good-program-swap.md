## Agent instructions (START HERE)

- Do not change shader semantics; only adjust how/when the preview swaps programs.
- Keep error reporting on the existing error handling path (no ad-hoc console-only errors).

## Overview

Keep rendering the **last known good** shader program while a new compilation is pending, and swap to the new program only when it is fully ready. This ensures the shell remains usable and the preview never “goes blank” during updates.

## Scope

### In
- Treat preview as “last-good frame/program + pending compile”.
- Swap policy:
  - if new compile fails, keep last-good program and show error state
  - if new compile succeeds, swap on a frame boundary

### Out
- Worker renderer migration
- Fancy UI; a simple “updating” indicator is enough if needed

## Dependencies

### Depends on
- `preview-responsiveness-01-preview-slice-invalidation.md`

### Provides
- Shell stays alive; preview stays usable even if new program creation stalls.

## Implementation tasks

1. **State model**
   - Store: `currentInstance` (last good), `pendingResult` (new compilation artifacts), `pendingError`.

2. **Swap boundary**
   - Perform instance creation and swap at a controlled point; ensure old instance is destroyed only after swap succeeds.

3. **Instrumentation (dev-only)**
   - Measure: “worker result received → swap completed”.

4. **Tests (where feasible)**
   - Worker reply success → instance swap called.
   - Worker reply error → instance remains, error reported.

## Completion

✅ Done when:
- Preview continues to render last-good output while compilation is pending.
- Swap is atomic and errors do not blank the preview.

### Final steps
- Run runtime tests and exercise manual repro (“add node while interacting with UI”).

