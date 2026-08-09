# 04A — GLSL incremental / hash-skip — arch-perf-followups

## Agent instructions (START HERE)

Prefer landing [`arch-perf-remediation` task 02](../arch-perf-remediation/02-compile-contract-arch-perf-remediation.md) first (compile-contract). Do not claim incremental success if the path still full-emits every time.

## Overview

Implement review **P3** for WebGL: make `NodeShaderCompiler.compileIncremental` **reuse or hash-skip** unchanged sections instead of only gating then re-emitting everything. WebGPU path is **04B**.

## Scope

### In

- Audit current `compileIncremental` (execution-order checks, then full collect/emit).
- Implement one concrete strategy (document choice):
  - **Hash-skip:** if affected slice’s emitted bodies match previous hashes → return previous `CompilationResult` (or shallow-updated metadata), or
  - **Section reuse:** regenerate only affected node bodies + dependents; splice into prior shader string / function table.
- Keep fallback to full `compile()` on validation failure, order breaks, connection changes per CompilationManager policy.
- Tests: param-only change on one node skips full rebuild work (assert via spies/hashes); connection change still full.

### Out

- Worker payload slim (remediation **03**).
- WebGPU incremental (**04B**).

## Dependencies

### Prerequisites

- Soft: remediation **02** + **07** (tighter affected sets).
- **`_OVERVIEW.md`**

### Provides

- Real GLSL incremental/hash-skip for **04B** patterns to mirror.

### Blocks

- **04B** (should reuse hashing helpers where possible).

## Implementation tasks

1. Instrument what “full emit” means today; pick hash-skip vs splice.
2. Implement + unit tests with fixtures.
3. Wire CompilationManager to trust non-null incremental results.
4. Measure or log (dev-only) skipped vs full in tests.

## Technical notes

- Uniform layout / `paramLayout` must stay consistent when skipping.
- Audio virtual nodes / bypass still force correct invalidation.

## Completion

✅ Done when a documented param-only edit path avoids full GLSL re-emit (proven by test), fallbacks remain safe, and compiler tests pass.

### Final steps

- Mark task **04A** ✅ in **`_OVERVIEW.md`**; unblock **04B**.
