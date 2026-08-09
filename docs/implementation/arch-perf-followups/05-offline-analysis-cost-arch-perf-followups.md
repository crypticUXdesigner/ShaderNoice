# 05 — Offline analysis hop / progressive — arch-perf-followups

## Agent instructions (START HERE)

Follow sections in order. Live and export audio-driven parameters must stay aligned. Do not break curve samplers.

## Overview

Address review **P5**: `OfflineAudioProvider` / analysis build uses **120 Hz** FFT over full clip length—expensive on long audio before preview/export feels ready. Lower cost for UI-only paths and/or progressive Tier B builds while preserving export correctness.

## Scope

### In

- Audit `EXPORT_ANALYSIS_RATE_HZ`, hop loops in `audioAnalysisBuildCore` / `OfflineAudioProvider`, and who consumes the curves (live vs export).
- Implement at least one:
  - Lower hop for UI/preview samplers with documented fidelity tradeoff, and/or
  - Progressive / chunked Tier B so UI is not blocked on full rebuild, and/or
  - Fingerprint reuse so export does not rebuild identical analysis.
- Tests for sampler alignment (or explicit dual-rate contract with conversion).
- Ensure worker PCM path still used; UI thread must not hard-block on full rebuild.

### Out

- Changing band UI chrome; rewriting Audiotool arrangement import.

## Dependencies

### Prerequisites

- **`_OVERVIEW.md`**; skim `docs/architecture/audio-reactivity.md` if needed.

### Provides

- Faster analysis ready-state on long clips.

### Blocks

- Nothing.

## Implementation tasks

1. Map call sites and rate constants; record current 120 Hz rationale.
2. Implement chosen strategy + tests.
3. Verify export frame uniforms match preview for a short fixture clip.
4. Note any intentional fidelity delta in `_OVERVIEW` Notes when done.

## Technical notes

- Prefer shared fingerprint (buffer hash + band config) for cache hits across preview→export.
- Do not drop bands or remap math—only hop/scheduling/caching.

## Completion

✅ Done when long-clip analysis cost is materially reduced on a documented path, live/export alignment is tested or explicitly contracted, and checks pass.

### Final steps

- Mark task **05** ✅ in **`_OVERVIEW.md`**.
