---
name: review-node
description: Review a shader node by id/name with an end-user lens—discoverability, mental model, parameter clarity (including short parameter/group/layout labels so the node body grid does not break), panel/canvas flows, help text, and layout vs docs/user-goals. Reply with a 1–2 sentence evaluation and a bulleted list of recommended changes (or None). Use when the operator runs `/review-node` or asks for a structured node QA pass with a node identifier.
---

# Review node

Structured end-user review of **one** node (id or display name → **`NodeSpec.id`**).

**Canonical checklist:** `.cursor/commands/review-node.md` (sections 0–7, report format, checklist). **This skill is a thin runner** — do not duplicate that prose.

**Honor:** **`core/project-conventions.mdc`**, **`docs/user-goals/04-nodes-and-parameters.md`**, **`shaders/node-standards.mdc`** (parameter/group/layout brevity + **Port label rules**), **`frontend/help-discovery.mdc`**. Extra prompt constraints win for scope.

---

## Flow

1. Resolve target per command §0 (registry + `node-documentation.json`).
2. Walk command sections **1–7** (mental model → flows → help → parameters → layout → flexibility → user-visible impl only).
3. Reply in command **Report format**: 1–2 sentence **Evaluation** + **Recommended changes** bullets (or **None**).

## Checklist

Command followed • short labels / ports per **`node-standards`** • user-goals reflected • report format only (unless prompt asks for depth)
