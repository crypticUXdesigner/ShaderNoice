# Review bug (`docs/bug/` → fix)

Investigate **`docs/bug/*`**, derive **minimal** corrective change. Skill twin **`investigate-and-fix-bug`**.

**Gate:** articulate **Symptom → Cause → Mitigation ↔ Symptom** before coding. Abort if proposed diff doesn’t explain the logged symptom.

**Reality:** You **cannot** run the shipped app — never mark **Fixed** / claim reproduction without user sign-off (`Fix proposed — needs verification` status only).

Honor **`project-conventions.mdc`** + area rules + relevant **`docs/user-goals/`** so UX contracts stay intact.

---

## Self-contained handoff

Updates to **`docs/bug/*`** and any **PR description** should stay readable for someone **without** ongoing repo context (same bar as **`/write-bug`** — see **Self-contained (external reader)** there): recap **symptom vs expected**, restate **repro** if the doc was thin, paste or quote **evidence** again when the causal chain changes, and list **touched files with one-line roles** so sign-off does not depend on spelunking.

If the original report assumed in-tree knowledge, **enrich it** while fixing — do not leave only “see commit” or bare paths.

---

## Investigation loop

1. Start at observable breakage; walk upstream until you can name owning layer (**data-model / runtime / shaders / ui**).
2. State falsifiable predictor (“If cause is ___, file X shows ___”) — disprove & iterate before fixing.
3. Minimal repro narrative keeps search cone tight.

---

## Execution order

1. Read target report (symptoms, guesses, logs).
2. Trace + confirm layer + hypothesis (#1–#3).
3. Document chain (symptom, cause, causal sentence, mitigation promise) — **inside PR / bug markdown**, written so an **external reader** can follow cause → fix intent without opening every cited file (roles, short excerpts where the claim needs them).
4. Apply **smallest** diff; forbid drive-by refactors.
5. Update report: Root cause/mitigation bullets, **self-contained** verification recipe (steps + expected outcome; note browser/build if relevant), **`Fix proposed — needs verification`**.

**Never:** speculative patches, orthogonal cleanups, self-approved **Fixed**, skipping validation chain.
