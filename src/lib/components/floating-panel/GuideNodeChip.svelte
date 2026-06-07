<script lang="ts">
  /**
   * Shared node pill for guide navigation (Related, port suggestions).
   */
  import { NodeIconSvg } from '../ui';
  import type { NodeSpec } from '../../../types/nodeSpec';
  import { getNodeIcon } from '../../../utils/nodeSpecUtils';

  interface Props {
    nodeSpec: NodeSpec;
    /** When set, renders as a button that opens that node's guide. */
    onOpen?: (nodeType: string) => void;
  }

  let { nodeSpec, onOpen }: Props = $props();
</script>

{#if onOpen}
  <button
    type="button"
    class="chip"
    title={nodeSpec.displayName}
    aria-label={`Open guide for ${nodeSpec.displayName}`}
    onclick={() => onOpen?.(nodeSpec.id)}
  >
    <NodeIconSvg identifier={getNodeIcon(nodeSpec)} />
    <span class="label">{nodeSpec.displayName}</span>
  </button>
{:else}
  <div class="chip is-static" title={nodeSpec.displayName}>
    <NodeIconSvg identifier={getNodeIcon(nodeSpec)} />
    <span class="label">{nodeSpec.displayName}</span>
  </div>
{/if}

<style>
  .chip {
    display: inline-flex;
    align-items: center;
    gap: var(--pd-sm);
    padding: var(--pd-xs) var(--pd-sm);
    border: none;
    border-radius: var(--radius-sm);
    background: var(--ghost-bg);
    color: var(--ghost-print);
    font: inherit;
    font-size: var(--text-sm);
    line-height: 1.2;
    cursor: default;
    outline: none;
    transition:
      background var(--motion-effects-fast-duration) var(--motion-effects-fast-easing),
      color var(--motion-effects-fast-duration) var(--motion-effects-fast-easing);
  }

  .chip:hover,
  .chip:focus-visible {
    background: var(--secondary-bg-hover);
    color: var(--secondary-print-hover);
  }

  .chip:focus-visible {
    box-shadow: 0 0 0 2px var(--color-blue-100);
  }

  .chip.is-static {
    pointer-events: none;
  }

  .label {
    white-space: nowrap;
    color: currentColor;
  }
</style>
