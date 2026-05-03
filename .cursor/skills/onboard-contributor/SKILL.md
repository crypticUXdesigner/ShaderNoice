---
name: onboard-contributor
description: Onboard a new contributor or agent session to this repo. Use when someone is starting work in the ShaderNoice (shadernoice) project or needs a quick orientation to docs, rules, and skills.
---

# Onboard contributor

Fast orientation: **where truth lives** + **how work ships** (graph, shaders, Svelte, automation).

**Touchstone docs:** `README.md`, **`AGENTS.md`**, **`project-conventions.mdc`**, `docs/user-goals/`, `docs/implementation/README.md`, `docs/architecture/`, `docs/onboarding-checklist.md`.

---

## Tour script

1. **README** — product pitch, stack, `npm run dev`.
2. **AGENTS + rules** — `.cursor/rules/**`, globs vs always-on; emphasize immutable graph + data-model ownership.
3. **User goals** — map product surface → `docs/user-goals/*` file; behavior changes start with the right doc.
4. **Implementation tasks** — `docs/implementation/` (`_OVERVIEW` + tasks when used); bridge to **`define-*` / `implement-task` / `review-project`** skills.
5. **Code layout** — `src/data-model` (writes), `src/ui` (canvas TS), `src/lib` (Svelte), `src/shaders` + `node-documentation.json`.
6. **Automation** — `.cursor/commands` (checklists) vs `.cursor/skills` (repeatable guard-railed flows); highlight `prepare-commit`, review/bug commands.
7. **Next** — run app once, peek a live `_OVERVIEW` + task to feel cadence.

## Quick checklist

- [ ] README + AGENTS skimmed
- [ ] `docs/onboarding-checklist.md` opened
- [ ] `project-conventions.mdc` + `docs/user-goals/README.md` eyeballed
- [ ] Sample `_OVERVIEW` + task read
- [ ] Key src trees + `.cursor/{commands,skills}` located
