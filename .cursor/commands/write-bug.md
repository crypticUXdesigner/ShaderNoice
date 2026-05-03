# Write bug (`docs/bug/`)

Capture **investigated** issues only — once you traced code paths enough to articulate symptoms + leverage points.

Twin skill: **`document-bug`** — follow identical structure via skill discovery.

Honor **`core/project-conventions.mdc`** (user-goals, immutable graph semantics).

---

## Self-contained (external reader)

The doc must stand alone: someone with **no access to this repository** (consultant, triage, another team) can **evaluate the situation** and give useful advice without cloning or searching the tree.

- **Product / surface:** What the user sees (screen, flow, preset, export path). Plain-language names; quote **visible UI strings** or control labels when they anchor repro.
- **Environment when relevant:** Browser + OS (or “any”), build/channel if it matters (e.g. local dev vs GitHub Pages).
- **Repro:** Short numbered steps, **expected vs actual**, and any **data** needed (minimal graph/preset description, not only “load project X”).
- **Evidence in the doc:** Paste or paraphrase **errors, logs, stack snippets**; describe screenshots. Do not assume the reader can run the app or open DevTools.
- **Code pointers:** **`Key files`** is required, but each entry should include a **one-line role** (“owns X for this symptom”). If the argument hinges on specific logic, add a **tiny excerpt** or pseudocode so the claim is verifiable without opening the file.
- **Terms:** Briefly define graph/runtime/shader jargon used in the report, or replace with plain-language behavior.

Avoid “see `Foo.ts`” with no summary of what `Foo` does for *this* bug.

---

## Sections

**Required:** title, status (**Open / Investigating / Fixed**), **Symptom**, **Root cause** (if known), **Key files** (each with role + self-contained context per above).

**Optional:** Architecture slice, hypotheses, failed attempts, debug recipe, **Background** (what ShaderNoice / this area is for) if the audience may be unfamiliar.

Prefer bullets; ≤~2 pages unless cross-cutting.

---

## Procedure

1. Lock repro + subsystem with requester context.
2. Add `docs/bug/<slug>.md` (**kebab-case**).
3. Populate template; extend **`docs/bug/README.md`** table when one exists.
