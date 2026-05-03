---
name: add-svelte-component
description: Add a new Svelte component following project standards for structure, runes, props, and CSS. Use when creating UI components so they live in the right folder and respect Svelte, TypeScript, CSS, and keyboard-focus rules.
---

# Add Svelte component

Create **`src/lib/**/*.svelte`** pieces that obey structure, tokens, shortcuts, and Svelte 5 ergonomics.

**Context:** **`svelte-standards.mdc`**, **`component-structure.mdc`**, **`css-standards.mdc`**, **`keyboard-focus.mdc`**, **`project-conventions.mdc`**.

---

## Flow

1. Pick folder via **component-structure** (feature slice vs **`lib/components/ui`** primitive).
2. Define minimal typed **`$props`**, callbacks, snippets—no legacy **`$:`** patterns.
3. Style with nested tokenized CSS; avoid leaky globals unless documented shared sheet.
4. Wire focus + shortcut guards consistent with dialogs/inputs overlays.
5. Integrate upstream; **`npm run check`**.

## Checklist

Correct tree • runes idioms • tokens + nesting • shortcut safety • lint/typeclean
