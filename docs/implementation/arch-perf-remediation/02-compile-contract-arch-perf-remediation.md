# 02 — Compile-contract extraction — arch-perf-remediation

## Agent instructions (START HERE)

Follow sections in order. Move **types only** first; keep runtime behavior unchanged. Do not slim worker payloads here (**03**).

Respect **`_OVERVIEW.md`**: shaders must not import `runtime/types` for IR after this task.

## Overview

Extract compile IR / pass-plan / preview-mask / param-layout types from `src/runtime/types.ts` into a **neutral module** that both `src/shaders/` and `src/runtime/` import. Stop the upward dependency **shaders → runtime**.

## Scope

### In

- New module e.g. **`src/shaders/compilation/compileContract.ts`** or **`src/compile-contract/`** (prefer one folder; document choice in Notes on close of task).
- Move (or re-export during transition): `CompilationResult`, `WebGpuPassPlan`, `PreviewDependencyMask`, `ParamLayout`, related `UniformMetadata` / texture desc types used by compilers, `CompileTargetOptions` / `RenderBackendKind` if they are compile-facing.
- Update imports in:
  - `src/shaders/NodeShaderCompiler.ts`
  - `src/shaders/compilation/WgslMvpCompiler.ts`
  - `src/shaders/compilation/previewDependencyMask.ts` (+ tests)
  - `src/runtime/CompilationManager.ts`, `workerMessages.ts`, render backends, etc.
- Keep **`src/runtime/types.ts`** re-exporting moved types temporarily **or** update all call sites in one PR — prefer **re-export shim** for one release window if touch count is huge; delete shim in **08** if left.
- Tests: existing compiler / CompilationManager suites still green.

### Out

- Worker payload shape changes (**03**).
- Pass-plan runtime consolidation (**04***).
- Changing WGSL MVP coverage.

## Dependencies

### Prerequisites

- **`_OVERVIEW.md`**

### Provides

- Neutral compile IR for **03** and future worker typing.

### Blocks

- **03** (should import contract from new home).

## Implementation tasks

1. Inventory types in `runtime/types.ts` referenced from `src/shaders/`.
2. Create neutral module; move types; add `runtime/types` re-exports if needed.
3. Point shader imports at the new module (no `runtime/types` from shaders).
4. Fix runtime/export imports as needed; run type-check + compiler tests.

## Technical notes

- Prefer `import type` everywhere for IR.
- Avoid moving runtime-only interfaces (`IAudioManager`, render backend hosts) into the contract module.
- Update `docs/architecture/graph-and-platform-boundaries.md` briefly in **08**, not necessarily here.

## Completion

✅ Done when shaders compile IR imports resolve outside `runtime/types`, behavior unchanged, and `npm run type-check && npm test` (compiler + runtime compilation suites) pass.

### Final steps

- Mark task **02** ✅ in **`_OVERVIEW.md`**; unblock **03**.
