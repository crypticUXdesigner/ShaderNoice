import { createRawSnippet } from 'svelte';

/** HTML snippet for Storybook CSF when a component expects `children: Snippet` (Svelte 5). */
export function storyTextSnippet(html: string) {
  return createRawSnippet(() => ({
    render: () => html,
  }));
}
