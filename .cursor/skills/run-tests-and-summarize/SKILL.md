---
name: run-tests-and-summarize
description: Run project checks (including verify:pages for full GitHub Pages CI parity) and summarize by area. Use when asked to run tests, check the branch, or validate before commit/PR.
---

# Run tests + summarize

Execute npm scripts (`verify:pages`, `check`, narrower slices if operator constrains scope) → bucket failures intelligently.

**Context:** **`core/testing.mdc`**, **`prepare-commit.md`**, **`package.json` scripts**.

---

## Flow

1. Read requested depth (lite **`check`** vs full **`verify:pages`** mirrors deploy job).
2. Run chosen scripts; persist stdout/stderr highlights.
3. Cluster failures → **data-model**, **shader/runtime**, **`src/lib` UI**, tooling scripts, etc.—note probable regression vs endemic flake when obvious.
4. Emit next actions (“fix X before push”, “track debt Y”).

## Output

Scripts used • failing clusters + files • readiness verdict • pointer to **`prepare-commit-skill`** for merge gate narration
