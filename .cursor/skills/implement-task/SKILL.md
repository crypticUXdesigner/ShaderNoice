---
name: implement-task
description: Implement a single task file end-to-end; verify with build and tests; update _OVERVIEW progress. Use when implementing one task from docs/implementation.
---

# Implement task

Deliver one WP markdown spec without scope creep → **`npm run build` + tests** green → **_OVERVIEW** honest.

**Context:** **`project-workflow.mdc`**, **`project-conventions.mdc`**, plus any `.cursor/rules/**` intersecting touched paths.

---

## Inputs

Supply **`docs/implementation/<name>/_OVERVIEW.md`** + concrete **`…/-NN-task.md`** (same folder as the overview).

## Flow

1. Read task **Dependencies** + acceptance statements; stall if predecessors unfinished.
2. Execute **Implementation tasks** verbatim order; forbid UX/runtime drift unless bullet allows.
3. Verify (`npm run build`, targeted tests); iterate until bullets satisfied.
4. Mark task ✅ in `_OVERVIEW` (progress %, date, terse Notes referencing files/decisions).

## Guardrails

- Build/tests clean **before + after**.
- Extend docs/rules **only** if the task text demands it—otherwise `_OVERVIEW` deltas only.
