---
name: runtime-performance-scan
description: Perform a focused performance review of runtime and compilation paths. Use when optimizing or investigating performance to identify hot paths, issues, and concrete follow-up tasks.
---

# Runtime performance scan

Deep dive on **`src/runtime` + compilation** hotspots—feeds **`review-performance-skill`** agendas.

**Context:** **`compilation.mdc`**, **`project-conventions.mdc`**, relevant perf briefing docs if referenced.

---

## Flow

1. Enumerate loops (render tick, shader compile, exporter inner loops).
2. Hunt allocations/clone churn inside those loops; respect graph RO contract when caching derived state.
3. Note algorithmic smells (nested graph walks lacking early exit, O(n²) lookups).
4. Cross-check **`docs/user-goals`** urgency (interactive UX > rare admin paths unless trivial wins exist).
5. Emit prioritized backlog (**title, impact, rough cost**).
6. Optional safe micro-win patches + **`npm run check`**.

## Deliverable

Hot path bullets • prioritized mitigations • optional immediate tiny patches
