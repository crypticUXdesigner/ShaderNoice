# Review agent tooling (Cursor)

Audit **repo-local** Cursor setup: `.cursor/rules/*.mdc`, `.cursor/commands/*.md`, `.cursor/skills/**/SKILL.md`, **`AGENTS.md`**, optional **user hooks / Skills / plugins**. Goal: sharper applicability, fewer tokens, fresher workflows.

Prefer `@`-ing those trees + whichever extra config the operator lists. Anchor “today” when verifying external docs timeliness.

Tie remediation guidance to **`writing-rules.mdc`**.

---

## Deliverable outline

Kick off with **`## Review summary` (≤5 bullets)**, then:

1. **Inventory** — category • path • role; rules annotate `alwaysApply` / `globs` / approximate lines; commands ↔ implied `/`; skills’ invoke story.
2. **Effectiveness** — duplication / collisions / stale globs / broad rules / secrets hygiene / command-vs-skill misfits.
3. **Best-practice deltas** — 5–10 high-signal ideas for TS+Svelte monorepos; label **official Cursor docs** vs **community habit**; flag deprecated vibes.
4. **Plan** — **Now (~30 m)** • **Next (½ day)** • **Later**; only micro templates for hypothetical new files (no walls of text).
5. **Questions (≤5)** — only blocking clarifications.

Tone: ruthlessly actionable; cite uncertainty plainly (esp. undocumented Agent UI behavior).

Constraints: incremental diffs—not wholesale repo churn unless unavoidable.
