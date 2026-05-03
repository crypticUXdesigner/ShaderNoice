---
name: refactor-svelte
description: Refactor existing Svelte components while preserving behavior and adhering to Svelte, structure, CSS, and help/keyboard rules. Use when splitting large components or modernizing reactivity.
---

# Refactor Svelte UI

Split/refresh components without breaking shortcuts, docs affordances, or visual contracts.

**Context:** **`svelte-standards.mdc`**, **`component-structure.mdc`**, **`css-standards.mdc`**, **`help-discovery.mdc`**, **`keyboard-focus.mdc`**.

---

## Flow

1. Inventory responsibilities: props, stores, timers, shortcuts, **`node-documentation`** touchpoints.
2. Redraw boundaries per **component-structure**; forbid circular barrels.
3. Modernize reactive plumbing to runes + typed callbacks—no creeping legacy patterns.
4. Preserve help surfaces (exactly-one-node flows) per **help-discovery**.
5. Revalidate keyboard guarding + spacebar semantics after splits.
6. Keep tokenized styling; dedupe duplicated CSS thoughtfully.
7. Manual smoke critical flows + **`npm run check`**.

## Non-goals

Silent shortcut regressions • mystery global state • unscoped token drift
