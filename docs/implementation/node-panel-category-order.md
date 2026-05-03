# Node panel — category browse order

## Why this doc exists

Browse order for **node categories** in the library is duplicated in two UI entry points. If they diverge, user goals and UX feel inconsistent.

## Canonical order (current product)

Section order when grouping node types by `spec.category` (unknown categories sort last among themselves):

1. Distort  
2. Patterns  
3. Shapes  
4. SDF  
5. Blend  
6. Mask  
7. Effects  
8. Audio  
9. Inputs  
10. Output  
11. Math  
12. Utilities  

This matches **`docs/user-goals/03-node-panel.md`** and the arrays in:

- `src/lib/components/side-panel/NodePanelContent.svelte` — `CATEGORY_ORDER`
- `src/lib/components/editor/AddNodePicker.svelte` — `CATEGORY_ORDER` (compact add picker)

## Implementation should

- Treat the two `CATEGORY_ORDER` arrays as **one contract**: any product change updates **both** (or refactor to a shared module, e.g. `src/utils/nodePanelCategoryOrder.ts`, imported by both components).

## Done when

- Order is defined once, or a comment in both files points to a single exported constant; user-goals 03 stays in sync.
