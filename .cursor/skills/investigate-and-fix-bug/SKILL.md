---
name: investigate-and-fix-bug
description: Investigate a documented bug, identify root cause, implement a minimal fix, and verify behavior using the /review-bug workflow. Use when you have or create a bug report and want a disciplined root-cause+fix pass.
---

# Investigate & fix bug

Clone of **`.cursor/commands/review-bug.md`** — read that file **first**; this skill only routes energy.

**Context:** **`review-bug.md`**, **`error-handling.mdc`**, **`project-conventions.mdc`**, domain rules touched by investigation.

---

## Preconditions

Stable write-up under **`docs/bug/`** (else run **`document-bug`**).

## Flow

1. Ingest symptom, repro, earlier hypotheses — correct doc if narrative wrong.
2. Apply **review-bug** investigation doctrine (symptom ↔ layer ↔ falsifiable predictions) without claiming you launched the desktop app unless you truly did.
3. Document causal chain before editing code; reject fixes that fail to explain reported behavior.
4. Land **minimal** patch honoring immutability/runtime/read-only contracts.
5. Tests / `npm run check` as feasible; tune/add regression coverage around failure mode.
6. Update bug doc: root cause, files (each with **one-line role**), **self-contained** human verification recipe per **`review-bug.md`** / **`write-bug`**, status **`Fix proposed — needs verification`** (never self-serve **Fixed**).

## Checklist

- [ ] Layer + file-level root cause identified.
- [ ] Diff tightly scoped.
- [ ] Automated checks updated when practical.
- [ ] Report narrates verification for human operator; PR/bug text **external-reader safe** (symptom, repro, evidence, roles — not path-only handoff).

> **Maintenance:** Command supersedes skill text on conflict.
