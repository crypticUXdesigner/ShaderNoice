## Agent instructions (START HERE)

- Cache must be bounded (avoid unbounded GPU memory growth).
- Correctness first: wrong-program reuse is worse than recompiling.

## Overview

Introduce a small **WebGL program cache** keyed by a stable hash of the compiled shader sources so undo/redo and preset toggles can reuse already-linked programs, avoiding repeated link stalls.

## Scope

### In
- Stable cache key: hash of `BASE_VERTEX_SHADER + fragmentShaderSource` (or compile result hash).
- Bounded LRU (small N, e.g. 5–20) with explicit `destroy()` when evicted.
- Hook points in `ShaderInstance` or `CompilationManager` so it’s easy to bypass in tests.

### Out
- Cross-session persistence
- Caching across different GL contexts

## Dependencies

### Depends on
- none (can land independently), but benefits from `02B` swap model

### Provides
- Faster undo/redo, preset switching, and toggling between recent graph states.

## Implementation tasks

1. **Key + cache data structure**
   - Decide hash function (cheap, deterministic).
   - Store: compiled shaders/program + uniform locations metadata as needed.

2. **Integration**
   - On new compile result: check cache, reuse program if present; otherwise create and insert.
   - On destroy/context loss: clear cache.

3. **Tests**
   - Same shader source compiled twice → second uses cache path (no `linkProgram` in mocked env).
   - Cache eviction destroys evicted resources.

## Completion

✅ Done when:
- Repeated compilation of identical shader source does not relink.
- Cache is bounded and evicts cleanly.

### Final steps
- Run runtime tests; do a manual undo/redo perf capture.

