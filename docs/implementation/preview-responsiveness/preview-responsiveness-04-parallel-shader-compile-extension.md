## Agent instructions (START HERE)

- Feature-detect and keep a safe fallback path.
- Do not add hard dependency on the extension; treat it as opportunistic optimization.

## Overview

Use `KHR_parallel_shader_compile` when available to reduce main-thread stalls caused by synchronous status queries like `getProgramParameter(LINK_STATUS)`.

## Scope

### In
- Detect extension on WebGL2 context.
- If supported:
  - After `linkProgram`, poll `COMPLETION_STATUS_KHR` on a later frame instead of immediately querying `LINK_STATUS`.
  - Only once complete, query `LINK_STATUS` and proceed with uniform discovery/swap.
- Dev-only instrumentation comparing “link start → ready to swap” with and without extension.

### Out
- Changing generated shader code
- Deep GL pipeline overhaul

## Dependencies

### Depends on
- Works best with `preview-responsiveness-02B-last-good-program-swap.md` (so you can wait without blanking preview)

## Implementation tasks

1. **Extension plumbing**
   - Add a small abstraction to query `COMPLETION_STATUS_KHR` safely.

2. **Non-blocking readiness**
   - Replace immediate `getProgramParameter(LINK_STATUS)` with:
     - if extension present: schedule polls (rAF) until complete, then check link status.
     - else: existing immediate status check.

3. **Tests**
   - Unit test feature detection and state-machine transitions with mocked GL.

## Completion

✅ Done when:
- On supported browsers, program readiness is checked without a single large blocking query in the apply tick.
- Fallback behavior matches current correctness.

### Final steps
- Manual perf capture on Chrome/Edge; verify long task attribution changes.

