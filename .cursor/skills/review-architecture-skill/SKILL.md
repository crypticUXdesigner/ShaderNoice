---
name: review-architecture-skill
description: Perform an architecture review using the existing /review-architecture workflow and feed findings into docs/implementation tasks. Use when assessing structure, boundaries, and technical debt.
---

# Review architecture skill

Structured pass per **`.cursor/commands/review-architecture.md`**—translate insights into deferrable WPs.

**Context:** **`review-architecture.md`**, **`project-conventions.mdc`**, area rules + **`docs/implementation/`** when spawning follow-ons.

---

## Flow

1. Internalize command output template (severity, effort **S|M|L**, area).
2. Map ownership boundaries (graph, runtime TS, shaders, **`src/lib`** UI)—flag leaks/mutations.
3. Capture coupling + duplication clusters with pragmatic remediation hypotheses.
4. Bundle related issues → candidate **`define-project`** seeds (mission + dependency hints).
5. After operator picks targets, hydrate **`docs/implementation/*`** via **`define-tasks`**.

## Checklist

Command honored • findings prioritized • WP proposals explicit • divergence logged if command/skills clash (**command wins**)
