# 04B — WebGPU compile hash-skip — arch-perf-followups

## Agent instructions (START HERE)

Requires **04A** hashing/reuse helpers where practical. Today `compileIncremental` returns `null` for `backend === 'webgpu'`—replace that with a safe hash-skip or equivalent.

## Overview

Stop WebGPU preview/export compile from **always** taking the full `compile()` path when only a small param/structure slice changed and WGSL output is unchanged.

## Scope

### In

- `NodeShaderCompiler.compileIncremental` WebGPU branch: hash-skip against previous WGSL/pass-plan artifacts when safe.
- `WgslMvpCompiler` hooks as needed for section digests (do not weaken `supported: false` reporting).
- Tests: unchanged WGSL hash → incremental returns prior result; unsupported graphs still fail clearly.
- CompilationManager WebGPU path uses incremental when `tryIncremental` is true.

### Out

- Expanding WGSL node coverage.
- Pass-plan executor sharing (remediation **04\***).

## Dependencies

### Prerequisites

- **04A**

### Provides

- Lower WebGPU edit-to-preview latency on small edits.

### Blocks

- Nothing; **06** docs.

## Implementation tasks

1. Define digests for WGSL main + pass-plan blobs.
2. Implement skip path; keep MVP determinism (no partial wrong splice).
3. Tests for skip + forced full (connection / allowlist miss).
4. Confirm worker + main-thread paths both honor incremental results.

## Technical notes

- Prefer hash-skip over string splicing for WGSL MVP risk.
- Pass-plan graphs: skip only when plan descriptor + upstream digests match.

## Completion

✅ Done when WebGPU incremental/hash-skip can return non-null on a safe fixture, full path remains for unsafe cases, and tests pass.

### Final steps

- Mark task **04B** ✅ in **`_OVERVIEW.md`**.
