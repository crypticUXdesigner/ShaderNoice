---
name: export-pipeline-check
description: Verify and update image/video export behavior and UI against export rules and user-goals. Use when touching export code or UI to ensure resolution limits, progress, audio semantics, and WebCodecs handling are correct.
---

# Export pipeline check

Guard **`src/video-export`** + UI surfaces against regressions for stills, timelines, codecs, UX feedback.

**Context:** **`domain/export.mdc`**, **`feature-requirements`** (export/audio/timeline slices), **`compilation.mdc`**.

---

## Flow

1. Re-read **`export.mdc`** + **`docs/user-goals`** intersecting chapters.
2. Map UI controls → exporter parameters → runtime (graph remains RO, errors dismissible).
3. Enforce min/max/resolution combos with UI validation + surfaced failures.
4. Progress overlays cancellable + honest frame counts.
5. **WebCodecs** path: capability probe + user-visible failure; deterministic encode loops.
6. **`npm run check`** (+ targeted manual exports: still, short vid ± audio).

## Verification matrix

Clamp rules • progress/error UX • audio vs timeline semantics • codec fallback • lint/tests clean
