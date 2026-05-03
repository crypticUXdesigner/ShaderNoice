## Agent instructions (START HERE)

Follow this task top-to-bottom. Keep changes minimal and localized. Do not add new UI affordances. Do not introduce per-parameter opt-outs in this task. Clamp only float parameters. Do not mutate graphs in runtime/compilation.

## Overview

Hard-enforce float parameter ranges in generated GLSL so the shader always uses a value within the parameter spec’s `min/max` range, even when driven by a connected signal.

## Scope

### In

- Clamp **final effective float parameter expression** (after override/add/subtract/multiply composition).
- Use spec-provided `min/max` (explicit values are already present for all float params in node specs).

### Out

- Any UI changes.
- Any automation-specific policy differences.
- Any changes to stored config values.

## Dependencies

### Provides

- Shader compilation produces in-range values for all float parameters.

### Blocks

- `parameter-range-clamp-03-tests-and-regression.md` (needs clamp semantics to be stable).

## Implementation tasks

1. Find the place where float parameter expressions are finalized for node codegen (currently: `src/shaders/compilation/FloatParamExpressions.ts` and/or the caller that injects expressions into `$param.*`).
2. Introduce a small helper that wraps the final GLSL expression with `clamp(expr, min, max)` when `paramSpec.type === 'float'`.
   - Use `paramSpec.min` / `paramSpec.max` directly.
   - If either is missing (should not happen in current node specs), fall back to `0.0` / `1.0` to match current default-range policy.
3. Ensure the clamp is applied to:
   - Connected case: override/add/subtract/multiply.
   - Unconnected case: uniform / default literal (still fine to clamp).
4. Keep codegen readable: prefer generating `clamp((<expr>), <min>, <max>)` with parentheses around `<expr>` to avoid precedence surprises.

## Technical notes

- The UI uses `computeEffectiveParameterValue` to derive effective values for connected params; that will be clamped in task 02 so UI == shader.
- Clamp must be applied after combining config + input in non-override modes; clamping only the input var would not match intended semantics.

## Completion

Acceptance: buildFloatParamExpressions (or equivalent compile-time param expression path) produces clamped GLSL for float params such that overriding/combining a connected input cannot exceed spec min/max at runtime.

Final steps:

- Run the shader compilation unit tests relevant to float param expressions (see `src/shaders/compilation/FloatParamExpressions.test.ts`).

