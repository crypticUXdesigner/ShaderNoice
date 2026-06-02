<script lang="ts">
  import { Button, NodeIconSvg } from '../ui';
  import type { DriverTargetDisplay } from './driverTargetDisplay';

  interface Props {
    target: DriverTargetDisplay;
    onReveal?: (nodeId: string, paramName: string) => void;
    class?: string;
  }

  let { target, onReveal, class: className = '' }: Props = $props();

  const revealEnabled = $derived(Boolean(onReveal));
</script>

<Button
  variant="ghost"
  size="sm"
  class="driver-target-nav {className}"
  title={revealEnabled ? `Reveal ${target.fullTitle} in node editor` : target.fullTitle}
  disabled={!revealEnabled}
  aria-label={revealEnabled ? `Reveal ${target.fullTitle} in node editor` : target.fullTitle}
  onclick={() => onReveal?.(target.nodeId, target.paramName)}
>
  <span class="target-icon" aria-hidden="true">
    <NodeIconSvg identifier={target.nodeIconIdentifier} />
  </span>
  <span class="target-param">{target.paramLabel}</span>
</Button>

<style>
  :global(.driver-target-nav.button.ghost.sm) {
    display: inline-flex;
    align-items: center;
    gap: var(--pd-xs);
    min-width: 0;
    max-width: 100%;
    padding-inline: var(--pd-sm);
    color: var(--color-gray-120);
  }

  .target-icon {
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;

    :global(svg) {
      width: var(--icon-size-sm);
      height: var(--icon-size-sm);
    }
  }

  .target-param {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: var(--text-sm);
    font-weight: var(--font-weight-medium);
    line-height: 1;
  }
</style>
