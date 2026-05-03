---
name: review-performance-skill
description: Run a structured performance review using the /review-performance workflow and propose follow-up tasks. Use when evaluating runtime, UI, or export performance beyond a single bug.
---

# Review performance skill

Repository-wide perf review scaffolding from **`.cursor/commands/review-performance.md`** — pair with **`runtime-performance-scan`** for engine hot paths.

**Context:** **`review-performance.md`**, **`compilation.mdc`**, **`runtime-performance-scan`**.

---

## Flow

1. Mirror command-required reporting headings.
2. Select representative journeys (canvas edits, dense graphs, timeline+audio interplay, exports).
3. Layer evidence: profiler traces, FPS heuristics, export timings, Reactivity/Vite notes as applicable.
4. Collate hypotheses with **impact × frequency × effort**.
5. Funnel prioritized bundles into **`define-project` / `define-tasks`** when execution needed.

## Checklist

Scenarios enumerated • hotspots named • user-goals-aligned prioritization • follow-up backlog suggested

**Canon:** `/review-performance` text beats this SKILL if mismatched.
