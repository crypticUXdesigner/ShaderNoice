---
name: add-shader-node
description: Add or modify a shader node in src/shaders/nodes following node standards and docs. Use when introducing or changing shader nodes so specs, registry, documentation, and user-goals stay in sync.
---

# Add / change shader node

Ship GLSL-facing nodes without desyncing registry, compiler, docs, or UX guarantees.

**Context:** **`shaders/node-standards.mdc`**, **`feature-requirements.mdc`**, **`help-discovery.mdc`**, **`compilation.mdc`**.

---

## Flow

1. Read pertinent **`docs/user-goals`** (parameters/canvas/export) for behavioral guardrails.
2. Author **`NodeSpec`** + GLSL alongside peers in **`src/shaders/nodes`**.
3. Export through **`nodes/index.ts`** / central registries with stable ids/tags.
4. Mirror help entry **`node:<id>`** inside **`src/data/node-documentation.json`** (`help-discovery`).
5. Keep runtime/compiler consumers **read-only** on **`NodeGraph`**—express new data via spec fields.
6. Add/adjust shader tests + run **`npm run check`**.

## Checklist

Spec+registry • documentation JSON • user-goals honored • compilation graph RO • tests/check green
