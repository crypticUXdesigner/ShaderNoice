---
name: add-audio-node
description: Add or modify audio-related nodes and graph pieces while keeping audio setup, serialization, and validation consistent. Use when working on audio nodes, bands, or signal graph structure.
---

# Add audio graph surface

Extend audio-related graph data without breaking **`audioSetup`** contracts, serialization, or undo.

**Context:** **`graph-updates.mdc`**, **`serialization.mdc`**, audio chapters in **`docs/user-goals/`**, **`project-conventions.mdc`**.

---

## Flow

1. Inventory current structs/helpers (`audioSetupTypes`, migrations, validation, tests).
2. Design immutable-friendly fields + connection semantics; escalate structural shifts to **`graph-safe-refactor`**.
3. Implement via pure helpers—no sneak mutations outside data-model seams.
4. If disk format changes → pair with **`data-model-migration`** (serialize → migrate → `validateGraph`).
5. Extend validation/tests (`*.test.ts`) for bands, envelopes, presets loading.
6. Sync UI under **`src/lib/**/audio*`** + JSON presets referencing audio.

## Checklist

Immutable writes • serialization parity • validation/tests • presets/UI exercised when user-visible
