# Cleanup docs (`docs/`)

Use when **`docs/`** has stale implementation notes, resolved bugs, misplaced files, or **architecture prose that may have drifted from code**. Goal: **smaller, truthful tree** — fewer wrong paths for agents, less scroll cost for the human.

**Scope:** Everything under **`docs/`** may be a candidate. **Edits and deletes require human confirmation** whenever purpose, completion, or retention is not obvious from the file itself.

---

## Principles

1. **Prefer truth over volume** — If the codebase and tests are the source of truth, docs should point there or record *decisions* that are not obvious from code.
2. **One unclear item → one short block** — For each ambiguous file or cluster: **recommendation** (delete / move / keep / shrink), **one easy question** if needed, optional **both**. Do not bury the human in long analysis.
3. **Moves** — Only move when a **clear target folder already exists** (e.g. a loose plan belongs under `docs/implementation/<slug>/` next to its `_OVERVIEW.md`). Do not invent new top-level taxonomies in this pass.
4. **Deletes** — Prefer delete only when: status is clearly “done/superseded”, content is duplicated by `docs/user-goals/`, `.cursor/rules/`, or code, and **no open pointers** from `_OVERVIEW`, skills, or commands (grep repo if unsure).

---

## Pass order (high churn → high care)

| Area | Typical role | Cleanup bias |
| --- | --- | --- |
| **`docs/implementation/`** | Specs, multi-step **`_OVERVIEW` + task** packages, baselines (e.g. a11y), wiring that must not drift | **High** — delete or shrink when delivered; keep **`docs/implementation/README.md`** index accurate |
| **`docs/bug/`** | Investigated bugs; pairs with `/review-bug` | **High** — remove or fold after fix verified and loop closed |
| **`docs/` root** (loose `*.md`) | Plans or analysis not yet filed | **Medium** — file under `docs/implementation/` (or a subfolder with `_OVERVIEW`) or delete if superseded |
| **`docs/architecture/`** | High-level behavior, seams, navigation without reading every file | **Review for accuracy** (see § Architecture) — **low blind delete**; prefer updates, “superseded by …”, or splitting stable invariants into `.cursor/rules/` |
| **`docs/design/`** | UX / visual guidance | **Low delete** — treat like product spec unless explicitly retired |
| **`docs/user-goals/`** | Canonical UX and behavior expectations | **Delete only with explicit per-file human yes** — otherwise propose edits only |

---

## Architecture folder (`docs/architecture/`) — freshness pass

**Purpose:** Let humans and agents understand **system shape, control flow, and invariants** without deep code archaeology — **only if claims match the current code**.

On each `/cleanup-docs` run that touches docs (or when the human asks for architecture-only):

1. **Inventory** — List `docs/architecture/**/*.md` with stated scope (from title / intro).
2. **Spot-check vs code** — For each doc, sample the **main claims** (mutability, who owns the graph, worker boundaries, pipeline order). Grep or open the referenced `src/**` paths; flag **contradictions**, **fixed issues still written as open**, and **missing major new seams**.
3. **Per-file outcome** — For each file: **accurate / needs light edit / needs section rewrite / superseded** (with suggested replacement pointer into rules or code).
4. **Stable invariants** — If a paragraph is **policy-stable** and agents should obey it every time, consider **promoting** it to `.cursor/rules/**` (small `.mdc` with globs) and leaving `docs/architecture/` as narrative + diagrams.

Do **not** assume wrongness without evidence; prefer adding a short **“Last reviewed (YYYY-MM)”** or **“Historical: pre-…”** header when the narrative is still valuable but partially dated.

---

## Future: richer structure or visuals (feasibility — consult the human)

Pick based on **who maintains** it and **what drifts fastest**:

| Option | What you get | Maintenance / feasibility |
| --- | --- | --- |
| **Markdown + Mermaid** in `docs/architecture/` | Flow / component graphs in-repo, renders on GitHub and in many editors | **Low cost** — same as today; agents edit well; still manual drift unless paired with `/cleanup-docs` |
| **Small “index” MD** + links | One screenful map to *the* canonical files per subsystem | **Very low** — high leverage for navigation |
| **YAML/JSON “module map”** (owners, `src` roots, forbidden edges) | Machine-readable; could lint in CI | **Medium** — needs a schema + discipline; could write a small `node` script to validate paths exist |
| **Import-graph tools** (e.g. **dependency-cruiser**, **madge**) | Auto **dependency** graphs (not behavior) | **Medium setup** — great for coupling; does **not** explain runtime behavior or async flows |
| **TypeDoc / TSDoc** site | API surface from comments | **Good for libraries**; often **noisy** for app internals unless you curate entrypoints |
| **Diagrams-as-code** (D2, Structurizr, PlantUML) | Polished diagrams, CI → SVG | **Medium** — second format to learn; best when visuals change rarely |
| **“Living” rules in `.cursor/rules/`** | Always-on agent constraints next to globs | **Best for invariants**; keep `docs/architecture/` for **why** and **navigation** |

**Fully automatic “behavior from code”** (accurate sequence/state diagrams without human curation) is **hard**: static analysis sees structure, not full runtime. Practical compromise: **auto import graph** + **hand-curated** architecture MD reviewed on a schedule or via this command.

When the human wants to invest: propose **one** pilot (usually **Mermaid in one architecture file** or **dependency-cruiser HTML** on `src/runtime`) before adopting a second system.

---

## Execution checklist

1. **Inventory** — List `docs/**` (or the subtree the human asked for) with one-line purpose per file.
2. **Classify** — Done spec, active task package, bug, policy doc, random notes, duplicate.
3. **Grep** — Before delete: search repo for basename and significant headings; note `AGENTS.md`, commands, skills, `_OVERVIEW` links.
4. **Architecture pass** — Run § Architecture when requested or when any `docs/architecture/` file is stale on inspection.
5. **Propose** — Table or bullet list: path → action (delete / move → target / keep / edit summary).
6. **Ask** — Only where classification is unclear; one question per topic.
7. **Execute** — After human replies: apply moves/deletes/edits in git-friendly chunks; update any README / `_OVERVIEW` tables you touched.

---

## Anti-patterns

- Deleting **`docs/user-goals/`** without explicit human confirmation per file.
- Deleting **`docs/architecture/`** because it is long — **update or mark superseded** instead unless the human explicitly asked to remove that file.
- Promoting large narrative blocks into **`.cursor/rules/`** — rules should stay **tight**; link out to architecture docs for story and diagrams.
