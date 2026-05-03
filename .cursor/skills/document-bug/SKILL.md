---
name: document-bug
description: Create a structured bug report using the existing /write-bug command format. Use when you have investigated an issue and need a clear doc under docs/bug/.
---

# Document bug

Thin wrapper over **`.cursor/commands/write-bug.md`** — capture post-investigation truth in **`docs/bug/`**.

**Context:** **`write-bug.md`**, **`error-handling.mdc`**, **`project-conventions.mdc`**.

---

## When

Observable defect + minimal repro understood well enough to orient another engineer.

## Steps

1. Collect **Symptom**, **Subsystem** (canvas/audio/etc.), **Repro**, **Suspected layer** (data-model/runtime/shader/ui/tooling).
2. Mirror **`write-bug.md`** naming + mandatory sections verbatim discipline — including **Self-contained (external reader)** (product surface, env if needed, evidence inlined, key files with one-line roles / tiny excerpts).
3. Author **`docs/bug/<slug>.md`**, extend **`docs/bug/README.md`** index when present.
4. Cross-link active **`docs/implementation/**`** specs if intertwined (Notes sections both sides). For external readers, summarize what the linked work covers; do not rely on links alone.

## Checklist

- [ ] Repro deterministic & short; expected vs actual stated in the doc.
- [ ] Key files listed **with role per file**; excerpts or quotes where needed so non-repo readers can follow.
- [ ] Hypotheses separated from verified facts.
- [ ] No repo-only assumptions: errors/logs/UI copy in-doc; jargon defined or avoided.

> **Maintenance:** Command file wins if instructions diverge—update this SKILL to stay a shallow mirror.
