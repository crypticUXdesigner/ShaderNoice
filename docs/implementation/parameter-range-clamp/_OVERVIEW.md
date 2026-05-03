---
title: Parameter range clamp (hard enforcement)
status: active
owner: runtime+compiler
---

## Mission

Ensure **float parameter ranges are hard-enforced** so that:

- The **shader always uses** a value within the parameter spec’s min/max range.
- The **UI live display** (knob/value) shows the **same effective value** the shader uses and never renders out-of-range geometry.

This work package intentionally **ignores special-casing for automation** for now; clamping is applied to the final effective value.

## Goals

- Clamp final effective float parameter values to spec `min/max` for:
  - Graph connections into parameter ports (override/add/subtract/multiply).
  - Audio-connected parameter ports (same effective value rule).
- Keep **stored config values** (`node.parameters[paramName]`) behavior unchanged (they are already snapped on edit paths); clamp only affects **effective** values used for rendering and live display.
- Keep behavior deterministic and consistent between compilation and UI.

## Non-goals

- New UI affordances or “clamped” indicators.
- Per-parameter opt-out (allowed later, not part of this initial implementation).
- Special policy differences for automation vs connections (track separately if needed).

## Key decisions (already made)

- Default range policy is effectively `0..1`, but current node specs already declare explicit `min/max` for all float params in `src/shaders/nodes/`.
- Apply clamping to **all float parameters** (no opt-out for now).
- Accept behavior change for graphs that relied on out-of-range modulation.

## Work plan

| ID | Task | Provides | Blocks |
|---:|------|----------|--------|
| 01 | Clamp in shader compilation for float params | Shader always in-range | — |
| 02 | Clamp effective value in UI calculation path | UI matches shader | — |
| 03 | Tests + regression coverage | Confidence + guardrails | 01, 02 |

## Progress

- [ ] 01 implemented
- [ ] 02 implemented
- [ ] 03 implemented

