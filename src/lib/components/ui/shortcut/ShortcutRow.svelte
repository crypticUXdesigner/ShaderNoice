<script lang="ts">
  import type { ShortcutKeys } from './shortcutTypes';

  interface Props {
    action: string;
    keys: ShortcutKeys;
  }

  let { action, keys }: Props = $props();

  const parts = $derived(Array.isArray(keys) ? keys : keys.parts);
  const joiner = $derived(Array.isArray(keys) ? '' : (keys.joiner ?? ''));
  const joinerSymbol = $derived(joiner.trim());
  const showJoiner = $derived(joinerSymbol === '/');
</script>

<dt class="action">{action}</dt>
<dd class="keys" aria-label={`Shortcut: ${parts.join(joiner)}`}>
  <span class="keycaps">
    {#each parts as part, i (part)}
      <span class="keycap">{part}</span>
      {#if i < parts.length - 1}
        {#if showJoiner}
          <span class="joiner" aria-hidden="true">{joinerSymbol}</span>
        {/if}
      {/if}
    {/each}
  </span>
</dd>

<style>
  .action {
    margin: 0;
    color: var(--print-normal);
  }

  .keys {
    margin: 0;
    display: flex;
    justify-content: flex-start;
  }

  .keycaps {
    display: inline-flex;
    align-items: center;
    gap: var(--pd-2xs);
    font-family: var(--font-mono, ui-monospace, monospace);
    color: var(--color-yellow-110);
    white-space: nowrap;
  }

  .keycap {
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-gray-70);
    background: var(--color-gray-30);
    font-size: var(--text-xs);
    line-height: 1.3;
    letter-spacing: 0.01em;
  }

  .joiner {
    opacity: 0.6;
    font-size: var(--text-xs);
    line-height: 1;
  }
</style>
