# 01 — Codebase architecture map — arrangement-pattern-nodes

## Agent instructions (START HERE)

Follow sections in order. **No dependencies.** Read **`_OVERVIEW.md`** and the research brief at `docs/research/midi-arrangement-visuals-research-brief.md`. This task is **documentation + decisions only** — do not implement nodes yet.

## Overview

Confirm how arrangement data flows into shaders today and record **locked integration decisions** so tasks **02A–08** do not re-discover the same seams.

## Scope

### In

- **Read and verify** (update `_OVERVIEW.md` Architecture / Locked decisions if drift found):

| Area | Files to inspect |
| --- | --- |
| Snapshot contract | `src/audiotool/arrangement/types.ts`, `buildArrangementSnapshot.ts` |
| Storage / import | `src/data-model/audioSetupTypes.ts`, `serialization.ts`, audio panel import |
| Region bake | `src/shaders/arrangement/packArrangementRegionsForGlsl.ts`, `arrangement-lanes.ts` |
| Note bake | `src/shaders/arrangement/packArrangementNotesForGlsl.ts`, `arrangement-notes.ts` |
| GLSL injection | `src/shaders/compilation/FunctionGenerator.ts` (`{{ARRANGEMENT_*_BAKE}}`) |
| WGSL cases | `src/shaders/compilation/WgslMvpCompiler.ts` (`arrangement-lanes`, `arrangement-notes`) |
| Preview loop clamp | `src/runtime/arrangement/arrangementNotesPreviewLoop.ts`, `arrangementNotesVisibleRange.ts` |
| Track filter UI | `src/lib/components/node/parameters/ArrangementTrackFilter.svelte` |
| Tests / fixture | `NodeShaderCompiler.test.ts`, `packArrangementNotesForGlsl.test.ts`, `__fixtures__/spike-arrangement-raw.json` |
| Pattern reference | `stripes.ts`, `radial-pulse.ts` (non-MIDI event patterns) |

- **Document in `_OVERVIEW.md`** (short bullets, not a novel):

  1. **Missing snapshot behavior:** compile with empty bake → zero output (cite test: `compiles with empty bake when snapshot is missing`).
  2. **Center control:** params `centerX`/`centerY` with `parameterUI: 'coords'` (not vec2 port v1).
  3. **Recompile triggers:** snapshot import, track filter, and any compile-time bake param (match `CompilationManager` audio fingerprint).
  4. **Performance budget table:** max loop counts per node class (onset window 512, boundaries 128, active sites 24, tracks 16).
  5. **File placement:** new modules under `src/shaders/arrangement/pattern/` (or extend `src/shaders/arrangement/` if fewer files).

- **Optional:** Add `docs/implementation/arrangement-pattern-nodes/integration-checklist.md` (≤60 lines) listing copy-paste steps every node task repeats (registry, WGSL allow-list, compile test stub).

### Out

- Shader implementation, bakes, or node specs.

## Dependencies

### Provides

- Verified architecture map + locked decisions for **02A**, **02B**.

### Blocks

- **02A**, **02B**

## Completion

✅ Done when `_OVERVIEW.md` reflects verified codebase facts, integration checklist exists (in overview or sidecar), and no open blocking questions remain for bake module layout.

### Final steps

- Update `_OVERVIEW.md` row **01** → ✅ + date.
