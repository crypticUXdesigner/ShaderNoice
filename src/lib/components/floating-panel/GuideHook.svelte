<script lang="ts">
  /**
   * Compact hint callout for optional HelpContent.hook (calm reading surface, not sys-warn HUD).
   */
  interface Props {
    hook: string;
    class?: string;
  }

  let { hook, class: className = '' }: Props = $props();

  const trimmedHook = $derived(hook.trim());
</script>

{#if trimmedHook}
  <aside class="guide-hook {className}" aria-label={trimmedHook}>
    <span class="guide-hook-label">Hint</span>
    <p class="guide-hook-text">{trimmedHook}</p>
  </aside>
{/if}

<style>
  .guide-hook {
    display: flex;
    flex-direction: column;
    gap: var(--pd-xs);
    padding: var(--pd-sm) var(--pd-md);
    border: 1px solid var(--layout-message-info-border);
    border-radius: var(--radius-sm);
    background: var(--layout-message-info-bg);
    color: var(--print-highlight);
  }

  .guide-hook-label {
    font-size: var(--text-2xs);
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--layout-message-color);
  }

  .guide-hook-text {
    margin: 0;
    font-size: var(--text-sm);
    line-height: 1.5;
  }
</style>
