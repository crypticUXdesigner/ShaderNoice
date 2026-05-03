# Node documentation content guide

This guide defines how to write and edit user-facing node documentation in `src/data/node-documentation.json`. Follow it for consistent, clear, and learnable help. It applies to all node help entries (tagline, description, inputs, outputs, parameters, examples, advanced).

---

## Tone and voice

- Use **second person** ("you") and **concrete, actionable** language.
- Prefer **"Connect X to Y to get Z"** over "This node can be used for Z."
- Avoid vague lead-ins like **"Ideal for…"** or **"Useful for…"** without a concrete example. If you use them, add at least one sentence that says what to connect or what the user sees.
- Keep sentences short. One idea per sentence where possible.

---

## Parameter descriptions

- Every parameter **must** state what the user **sees or hears** (effect or visual/audio impact).
- If the parameter is a **fallback when a port is unconnected**, say so and add **one line on effect** (e.g. "Set to 0.5 to shift the result by half" or "Larger values = stronger effect").
- **Not allowed:** A parameter description that only says "Used when unconnected" or "Used for input b when nothing is connected" with no mention of effect. Add at least one line that explains what changing the value does (e.g. "Higher values speed up the animation").

---

## Examples (the `examples` array)

- Provide **2–3 short bullets** per node in the `examples` array.
- Each bullet is **one concrete use case** in plain language (e.g. "Combine two patterns with different opacity," "Animate a mask over time," "Drive a pattern from UV and feed it to Color Map").
- **Not** a full tutorial sentence—enough to spark a next step. The user should be able to try the idea immediately.
- Vary examples by node type so similar nodes (e.g. Add vs Multiply) don’t repeat the same bullets.

---

## Advanced (the `advanced` field)

- **Optional.** Use for short technical notes only when they add value.
- Good uses: **when to choose X vs Y** (e.g. UV vs Fragment Coords, or one noise mode vs another), a **formula or algorithm note**, or an **expert tip**.
- Keep to **one short paragraph**. No long essays.
- **Omit** if the main description already covers the idea. Don’t duplicate.

---

## Clarity rule

- Each node should have **at least one concrete wiring or "often used with" cue** where it makes sense: either in the main description or in port descriptions.
- Example: "Connect UV Coords to Noise, then Noise to Color Map, then to Output." Or: "Often used with Distance and Color Map for radial gradients."
- **Weak entries** (e.g. only "Ideal for…" with no concrete wiring) must be raised to this standard. Add one sentence that says what to connect or what typically connects here.

---

## Port descriptions (inputs and outputs)

- Keep the existing pattern: **what the port is**, **what to connect** (or what connects here), and (where helpful) **what you get**.
- `suggestedSources` and `suggestedTargets` stay as-is; no new rules beyond consistency with the tone and clarity above.
- Port text should align with the clarity rule: when relevant, mention a typical connection (e.g. "Connect UV Coords, or Translate/Scale for shifted or zoomed input").

---

## Do not

- **Do not** shorten or remove an existing description or tagline when improving an entry. Only add or refine.
- **Do not** introduce new JSON keys. Use only the existing HelpContent shape (e.g. `examples`, `advanced`, `parameters`, etc.).
- **Do not** use jargon (e.g. "FBM", "SDF", "raymarch") without a **one-line explanation** in the same entry (e.g. "SDF (signed distance function): a value that encodes distance to a shape").

---

## Reference

- Node spec and checklist: `.cursor/rules/shaders/node-standards.mdc`
- Help and context menu: `.cursor/rules/frontend/help-discovery.mdc`
- User goals for help: `docs/user-goals/10-help-and-discovery.md`
- Data: `src/data/node-documentation.json`
