---
name: prepare-commit-skill
description: Run full pre-push chores so the branch passes GitHub Actions (GitHub Pages deploy on main). Use when the user asks to prepare a commit, prepare a PR, merge readiness, deploy readiness, “CI green”, “chore before push”, or anything similar — execute checks and git hygiene, not just a single test command.
---

# Prepare commit / PR

Mirror **`.github/workflows/deploy.yml`** locally so **`main`** stays publishable.

**Canonical text:** `.cursor/commands/prepare-commit.md` • **Driver script:** `npm run verify:pages`.

---

## Triggers

“Ship”, “PR ready”, “CI green”, “pre-push chores”, etc.—unless user explicitly scopes smaller.

## Execution

1. **Lockfile churn?** Run **`npm ci`** when `package.json` / `package-lock.json` moved; repair lock before continuing.
2. **Always** run **`npm run verify:pages`** (audit high → check → build → storybook build). Capture failures with crisp remediation bullets.
3. **Optional:** Playwright/a11y ONLY on request — CI treats a11y as **non-blocking**.
4. **Docs hygiene (when docs changed):** If this work touched `docs/**`, run `/cleanup-docs`.

## Git sanity

Committed lockfile whenever deps shift; **`git status`** clean of `dist/`, `storybook-static/`, secrets, local env dumps.

## Report back

Pass/fail for step 2 (and lockfile step), readiness verdict for **`main`**, follow-up chores if any, plus a short **copy/paste changelog** (3–7 bullets of the most relevant changes).

## Maintenance contract

Workflow adds **required** steps → extend **`verify:pages`**, then **`prepare-commit.md`**, then this skill.
