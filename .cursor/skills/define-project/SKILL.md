---
name: define-project
description: Align on project mission, goals, and success criteria; output one _OVERVIEW.md. Use when starting a multi-step project before breaking into tasks.
---

# Define project

Produce **`docs/implementation/<slug>/_OVERVIEW.md`** (≤≈80 lines) so **`define-tasks`** can carve work without reopening fundamentals.

**Context:** **`project-workflow.mdc`**, **`workpkg-hygiene.mdc`**.

---

## Input

Slug + briefing (infer missing pillars with **minimal** Q&A).

## `_OVERVIEW` skeleton

1. **Mission** — trigger + thesis (1 graf).
2. **Goals** — primary + optional secondary (concrete).
3. **Success & constraints** — measurable must-haves, explicit invariants (“no behavior change” unless listed).
4. **Architecture & design** — integration seams + anti-patterns (short).
5. **Work packages** — placeholder rows (filled by **`define-tasks`**).
6. **Progress** — % + table scaffold.
7. **Notes** — decisions & risks.

**No dependency ASCII art** — dependencies live in future task frontmatter.

## Steps

1. Normalize slug + scope with user.
2. Draft sections 1–4 + empty WP table.
3. Create **`docs/implementation/<slug>/`** and write `_OVERVIEW.md` there; ready handoff to **`define-tasks`**.

## Quality bar

Success criteria = verifiable predicates (tests, tooling, UX checks). Call out allowable behavior deltas explicitly.
