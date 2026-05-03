## Agent instructions (START HERE)

Follow this task top-to-bottom. Add tests that lock in the clamping behavior. Keep tests small and focused. Prefer colocated Vitest tests already in the repo.

## Overview

Add regression tests ensuring float parameter effective values are clamped consistently across compilation and UI calculation paths.

## Scope

### In

- Tests for compilation-time GLSL expression clamping.
- Tests for UI-time effective value clamping.

### Out

- Performance work.
- New UI behavior or indicators.

## Dependencies

### Requires

- `parameter-range-clamp-01-compiler-clamp-final-effective.md`
- `parameter-range-clamp-02-ui-clamp-effective-parameter-value.md`

## Implementation tasks

1. Extend `src/shaders/compilation/FloatParamExpressions.test.ts` (or the most appropriate compilation test file) with cases that:
   - Use a float param spec with explicit `min/max` (e.g. `0..1`).
   - Connect an upstream variable and confirm the generated expression includes `clamp(` around the final effective expression for:
     - `override`
     - `add`
     - `subtract`
     - `multiply`
2. Extend `src/utils/parameterValueCalculator.test.ts` with cases that:
   - Set a config value, connect an input value outside the range, and assert the returned effective value is clamped to `min/max` for each mode.
   - Include at least one “extreme” input (very large magnitude) to ensure UI math stays finite and clamped.
3. Run:
   - `npx vitest run src/shaders/compilation/FloatParamExpressions.test.ts`
   - `npx vitest run src/utils/parameterValueCalculator.test.ts`

## Completion

Acceptance: tests fail without clamping and pass with clamping; they cover all input modes and verify both shader-expression generation and effective-value calculation clamp to spec min/max.

Final steps:

- Update the work package checklist in `docs/implementation/parameter-range-clamp/_OVERVIEW.md` to mark tasks complete when merged/landed.

