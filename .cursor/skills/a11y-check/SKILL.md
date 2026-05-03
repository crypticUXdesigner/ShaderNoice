---
name: a11y-check
description: Run the project accessibility check script and interpret results against the a11y baseline. Use when evaluating or changing accessibility to understand current regressions and propose fixes.
---

# A11y check

Run **`npm run a11y`** (`scripts/a11y.ts`) and reconcile output with the living baseline—notices **new** violations vs tolerated debt.

**Context:** `docs/implementation/a11y-baseline.md`, **`css-standards.mdc`**, **`keyboard-focus.mdc`**.

---

## Flow

1. Read baseline priorities + accepted deficits.
2. Execute script; capture grouped violations / warnings.
3. Bucket results → **baseline-expected** vs **fresh regression** (note rule id + surface).
4. Patch regressions with token-safe colors + disciplined focus stacks; rerun until clean **or** document blockers.
5. **Never** expand baseline casually—promote issues only with explicit rationale recorded in **`a11y-baseline.md`**.

## Exit criteria

Baseline consulted • command output archived • regressions fixed or flagged • baseline untouched unless intentional
