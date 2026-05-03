# Analyze Shadertoy parity

Judge if an external shader clones with **today’s node library**. When impossible, isolate missing nodes ONLY (no architectural detours).

**Inputs:** Shadertoy URL **or** pasted GLSL/host snippet.

Honor **`project-conventions.mdc`**, **`shaders/node-standards.mdc`** whenever new nodes emerge.

---

## Response shape

| Step | Output |
| --- | --- |
| 1 | **Replicable?** (**Yes**/No). If Yes → wiring cheat sheet & caveats |
| 2 | If No → bullet **missing primitives** (+ one-liner rationale each) |
| 3 | If No → drive **`define-project`** (mission = close gaps) immediately followed by **`define-tasks`** (strictly additive nodes/specs)

---

Workflow: dissect uniforms + flow → diff vs registry → synthesize verdict → (**if**) spawn project docs via skills’ templates (`define-project`, `define-tasks` SKILL bodies).
