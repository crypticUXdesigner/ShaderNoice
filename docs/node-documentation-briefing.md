# Node documentation — outline briefing (user-facing)

This briefing defines how to write and structure **user-facing** node documentation. It applies to entries in `src/data/node-documentation.json` that are shown in the **Guide** (help callout) when a user selects a node and clicks Help or uses “Read Guide” from the context menu.

**Audience:** Anyone adding or editing node docs. **Scope:** Only what the user sees in the Guide UI; not shader/spec or internal tooling.

---

## 1. Where it appears

- **Trigger:** One node selected → Help button or right‑click → “Read Guide”.
- **UI:** Floating “Guide” panel (draggable) with:
  - **Headline** — icon (from node spec), **title**, **tagline**
  - **Setup example** — optional mini graph (when `setupExampleGraph` is set)
  - **Description** — main body text
  - **Inputs** — collapsible list: port name/label, type pill, description, optional “suggested” nodes
  - **Outputs** — same structure
  - **Controls** — collapsible list of parameters: name + description
  - **Examples** — optional bullet list of short text examples
  - **More detail** — optional `<details>` with **advanced** text
  - **Used by** — auto-derived when `titleType === 'type'` (for type help, not node help)
  - **Related** — list of related nodes/types from **relatedItems**

**Icon and category/color** come only from the **NodeSpec** (node registry), not from the doc JSON. Do not add `icon` or `category` to doc entries.

---

## 2. Document ID

- **Key format:** `node:<nodeTypeId>` (e.g. `node:noise`, `node:color-map`).
- **Node type id** must match the node’s `id` in the shader/node registry so the app can resolve the spec for port labels and headline styling.

---

## 3. Required and optional fields (used by the UI)

| Field | Used in UI | Guidance |
|-------|------------|----------|
| **title** | Headline (h2) | Short display name (e.g. “Noise”, “Color Map”). Can match or slightly rephrase the node’s display name. |
| **titleType** | Logic (e.g. “Used by”) | Use `"node"` for node docs. Use `"type"` only for port-type help (e.g. `type:float`). |
| **tagline** | Headline subtitle | One short sentence: what the node is for and what you get (e.g. “Creates a random-looking pattern from coordinates…”). |
| **description** | Main body | 1–3 sentences: what it does, main parameters, and a concrete “connect to X then Y” so the user can get a visible result. |
| **inputs** | Inputs section | Array of port objects (see §4). Omit or `[]` if no inputs. |
| **outputs** | Outputs section | Array of port objects (see §4). Omit or `[]` if no outputs. |
| **parameters** | Controls section | Array of `{ name, description }` (see §5). Omit or `[]` if no controls. |
| **setupExampleGraph** | Mini graph | Optional. Structured graph (nodes + connections) for the Setup example mini graph. If present and all node types exist in the registry, the graph is shown. |
| **examples** | Examples list | Optional. Array of strings; each is one bullet (e.g. “Use with Time for animated noise.”). |
| **advanced** | “More detail” block | Optional. Extra technical or expert note; shown in a `<details>`. |
| **relatedItems** | Related section | Optional. Array of IDs: `"node:<id>"` or `"type:<typeName>"`. Resolved to node names + icons in the UI. |

**Removed / do not use:**  
`whatYouSee`, `quickExample` (text), `icon`, `category` are not rendered. Parameters have only `name` and `description`. (Use `setupExampleGraph` for the Setup example mini graph.)

---

## 4. Ports (inputs / outputs)

Each port object can have:

- **name** (required) — Must match the node spec port name (e.g. `in`, `out`, `a`, `b`).
- **type** (required) — Port type (e.g. `float`, `vec2`, `vec4`). Shown as a type pill.
- **description** (required) — One sentence: what this port is and what to connect (or where to connect it).
- **label** (optional) — Override for display; if omitted, the UI can use the spec’s label so the Guide matches the node header.
- **suggestedSources** (inputs only) — Optional. Array of IDs (`"type:float"`, `"node:uv-coordinates"`, etc.) shown as “suggested” nodes that can feed this input.
- **suggestedTargets** (outputs only) — Optional. Array of node IDs this output can sensibly connect to.

---

## 5. Parameters (Controls)

Each parameter object has:

- **name** (required) — Must match the parameter name in the node spec (e.g. “Scale”, “Mode”, “Octaves”).
- **description** (required) — What the control does and how it affects the result. Include the “visual effect” in this single description (e.g. “Higher = larger blobs; lower = finer grain.”).

One entry per control; order can follow the spec or a logical reading order.

---

## 6. Setup example graph

- **setupExampleGraph** (optional):
  - **nodes:** `[{ "id": "<graph-local-id>", "type": "<nodeTypeId>" }, ...]`
  - **connections:** `[{ "from": "<node-id>", "fromPort": "<port>", "to": "<node-id>", "toPort": "<port>" }, ...]`

Use short, stable `id`s (e.g. `a`, `b`, `c`). Every `type` must exist in the node registry; otherwise the mini graph is not shown. Keep the graph minimal (e.g. UV → Noise → Color Map → Output). Type: `SetupExampleGraph` (nodes: `SetupExampleGraphNode[]`, connections: `SetupExampleGraphConnection[]`).

---

## 7. Tone and content rules (user-facing)

- **Plain language:** Avoid jargon where possible; explain terms if needed.
- **Action-oriented:** Say what to connect and what the user will see (e.g. “Connect to Color Map to see it as grayscale”).
- **Consistent:** Port and parameter names must match the node spec so labels and types line up.
- **Brief:** Tagline one sentence; description a few sentences; parameter descriptions one or two sentences.
- **Inclusive:** “You” and “Connect X to Y” is fine; keep it scannable (bullets, short paragraphs).

---

## 8. Checklist for a new or updated node doc

- [ ] Entry key is `node:<nodeTypeId>` and matches the registry.
- [ ] **title**, **titleType** (`"node"`), **tagline**, **description** are set and concise.
- [ ] **inputs** / **outputs**: each port has `name`, `type`, `description`; names match the spec; optional `suggestedSources` / `suggestedTargets` where helpful.
- [ ] **parameters**: each control has `name` and `description`; names match the spec.
- [ ] **setupExampleGraph** (if used): valid nodes + connections; all node types in registry.
- [ ] **examples** / **advanced** / **relatedItems** optional but useful where they add value.
- [ ] No `icon`, `category`, `whatYouSee`, or `quickExample` (text) in the entry; parameters use only `name` and `description`.

---

## 9. Related

- **User goals:** [10-help-and-discovery.md](./user-goals/10-help-and-discovery.md)
- **Data:** `src/data/node-documentation.json`
- **Types:** `HelpContent`, `HelpPort`, `HelpParameter` in `src/utils/ContextualHelpManager.ts`
- **UI:** `HelpCallout.svelte` → `HelpCalloutContent.svelte` and subcomponents (`HelpCalloutHeadline`, `HelpCalloutPortsSection`, `HelpCalloutParametersSection`, `SetupExample`).
