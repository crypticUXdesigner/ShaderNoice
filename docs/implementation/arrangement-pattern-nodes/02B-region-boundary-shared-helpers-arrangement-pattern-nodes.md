# 02B — Region boundary bake + shared shader helpers — arrangement-pattern-nodes

## Agent instructions (START HERE)

Follow sections in order. **Depends on 01.** Can run **parallel with 02A** after 01 completes. Read **`_OVERVIEW.md`** and `packArrangementRegionsForGlsl.ts`.

## Overview

Emit **region start/end boundary events** and **per-track energy bins** at compile time, plus **shared GLSL/WGSL math helpers** used by all arrangement pattern nodes.

## Scope

### In

- **New module(s):** `src/shaders/arrangement/pattern/` (suggested exports):

| Export | Purpose |
| --- | --- |
| `packArrangementRegionBoundariesForGlsl()` | From each packed region → two events `{time, trackRow, kind, isEnd}`; sort by time; cap **256** events |
| `packArrangementTrackEnergyBinsForGlsl()` | Per track × time bin: energy, mean pitch, max velocity (max **16** tracks in shader loop) |
| `findBoundaryIndexRangeForWindow()` | Binary search for boundaries near playhead |
| `buildRegionPatternGlslBake()` / Wgsl variant | Per-node suffix constants |
| `emitArrangementPatternHelpersGlsl()` / `Wgsl()` | Shared functions: `arrPatternSaturate`, `arrPatternTau`, `arrPatternHash11`, `arrPatternHash22`, `arrPatternClampLength`, `arrPatternPitchToAngle`, `arrPatternPitchClassColor`, `arrPatternTrackOrderNorm` |

- **Kind filter param prep:** Export `readRegionKindFilterOptions()` reading int param `-1` = all, `0/1/2` = note/audio/pattern — used by tasks **05**, **07A**.

- **Tests:** `regionBoundaryBake.test.ts`, `arrangementPatternHelpers.test.ts` (compile-only or string snapshot for helper signatures).

- **Integration:** Register helpers once in `FunctionGenerator` / `WgslMvpCompiler` `requireHelper('arrangement-pattern-shared', …)` when first consumer lands — stub registration OK in this task with empty consumer.

### Out

- Note time bins (02A).
- Individual pattern node specs.

## Dependencies

### Prerequisites

- **01**

### Provides

- Boundary + track energy bakes; shared helpers for **05**, **06C**, **07A**, and all nodes using hash/pitch color.

### Blocks

- **05**, **06C**, **07A**

## Technical notes

- Boundary times: `startSeconds` and `startSeconds + durationSeconds` from filtered regions only.
- `trackRow` normalized 0…1 matches existing `trackRowNormalized` in region packer.
- Helper names must be unique in WGSL (`arrPattern_` prefix).

## Completion

✅ Done when boundary pack tests pass, helper emitters produce valid GLSL/WGSL snippets, and **`npm run type-check && npm test && npm run build`** green.

### Final steps

- Update `_OVERVIEW.md` row **02B** → ✅ + date.
