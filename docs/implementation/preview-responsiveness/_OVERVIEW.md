## Preview responsiveness work package

### Mission
Keep the node editor **visibly responsive** during structural edits by eliminating unnecessary preview recompiles and minimizing main-thread stalls on WebGL program replacement.

### Goals
- **Shell responsiveness**: common edits (add disconnected node, move nodes, rename/label) do not trigger preview compile/apply work.
- **Preview correctness**: when the output slice changes, preview updates correctly; when it doesn’t, preview can remain stale but accurate relative to the unchanged output slice.
- **Measurability (dev-only)**: stable User Timing marks/measures to compare median/p95/max for “edit → preview ready”.

### Constraints
- Graph remains **immutable** (data-model owns updates).
- Runtime/compilation treat graph as **read-only**.
- Instrumentation is **dev-only** (no production logging).

### Scope
- **In**: reachability-based compile invalidation, compile/apply coalescing, program caching, optional `KHR_parallel_shader_compile` path (feature-detected).
- **Out**: OffscreenCanvas renderer migration, WebGPU port, major shader architecture redesign.

### Work grid

| Task | Status | Provides | Blocks |
| --- | --- | --- | --- |
| `preview-responsiveness-01-preview-slice-invalidation.md` | 🟢 | Preview slice: idle nodes, idle-only connection deltas, idle param updates skipped | `02A`, `02B` |
| `preview-responsiveness-02A-coalesce-structural-edits.md` | 🟢 | Coalesce compile kicks (immediate + deferred rAF) | `03`, `04` (optional) |
| `preview-responsiveness-02B-last-good-program-swap.md` | 🟢 | Keep last-good instance until first render succeeds (rollback) | `04` (optional) |
| `preview-responsiveness-03-program-cache-by-hash.md` | 🟢 | Cache by shader source (LRU+refcount) | — |
| `preview-responsiveness-04-parallel-shader-compile-extension.md` | 🟢 | KHR path: pending program retries + defer LINK_STATUS until ready | — |

