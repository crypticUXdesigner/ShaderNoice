<script lang="ts">
  import { Badge, Button, NodeIconSvg } from '../ui';
  import type { DriverConnectionTargetDisplay } from './driverTargetDisplay';

  interface Props {
    targets: readonly DriverConnectionTargetDisplay[];
    activeNodeId?: string;
    activeParamName?: string;
    onReveal?: (nodeId: string, paramName: string) => void;
    /** Section label (default "Targets"). */
    sectionLabel?: string;
    class?: string;
  }

  let {
    targets,
    activeNodeId,
    activeParamName,
    onReveal,
    sectionLabel = 'Targets',
    class: className = '',
  }: Props = $props();

  function isActive(target: DriverConnectionTargetDisplay): boolean {
    return target.nodeId === activeNodeId && target.paramName === activeParamName;
  }
</script>

{#if targets.length > 0}
  <div class="driver-connection-targets {className}" role="presentation">
    <div class="targets-header">
      <span class="targets-label">{sectionLabel}</span>
    </div>
    <ul class="targets-tags" aria-label={sectionLabel}>
      {#each targets as target (target.nodeId + ':' + target.paramName)}
        {@const active = isActive(target)}
        <li data-category={target.categorySlug}>
          <span
            class="badge-wrapper"
            data-subgroup={target.subgroupSlug || undefined}
          >
            <Badge class="driver-target-badge{active ? ' is-active' : ''}">
              <Button
                variant="ghost"
                size="xs"
                mode="both"
                class="target-tag-btn"
                title={onReveal ? `Reveal ${target.fullTitle} in node editor` : target.fullTitle}
                disabled={!onReveal}
                aria-label={onReveal ? `Reveal ${target.fullTitle} in node editor` : target.fullTitle}
                onclick={(e) => {
                  e.stopPropagation();
                  onReveal?.(target.nodeId, target.paramName);
                }}
              >
                <span class="target-icon" aria-hidden="true">
                  <NodeIconSvg identifier={target.nodeIconIdentifier} />
                </span>
                <span class="target-param">{target.paramLabel}</span>
              </Button>
            </Badge>
          </span>
        </li>
      {/each}
    </ul>
  </div>
{/if}

<style>
  .driver-connection-targets {
    padding: var(--pd-md) var(--pd-md) var(--pd-sm);
    border-top: 1px solid var(--color-gray-70);
    margin-top: var(--pd-md);
  }

  .targets-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--pd-sm);
    margin-bottom: var(--pd-xs);
  }

  .targets-label {
    font-size: var(--text-sm);
    font-weight: var(--font-weight-medium);
    color: var(--color-gray-110);
  }

  .targets-tags {
    display: flex;
    flex-wrap: wrap;
    gap: var(--pd-sm);
    margin: 0;
    padding: 0;
    list-style: none;

    li {
      max-width: 100%;
    }
  }

  .badge-wrapper {
    display: inline-flex;
    max-width: 100%;
  }

  .targets-tags :global(.driver-target-badge.badge) {
    display: inline-flex;
    align-items: center;
    box-sizing: border-box;
    max-width: 100%;
    min-height: var(--size-sm);
    height: auto;
    padding: 0;
    font-weight: var(--font-weight-medium);
    letter-spacing: normal;
    transition:
      filter var(--motion-effects-fast-duration) var(--motion-effects-fast-easing),
      box-shadow var(--motion-effects-fast-duration) var(--motion-effects-fast-easing);
  }

  .targets-tags :global(.driver-target-badge.badge.is-active) {
    box-shadow: 0 0 0 1px color-mix(in srgb, currentColor 55%, var(--color-gray-50) 45%);
  }

  .targets-tags li:has(.target-tag-btn:hover:not(:disabled)) :global(.driver-target-badge.badge) {
    filter: brightness(1.08);
  }

  .targets-tags :global(.target-tag-btn.button.xs.ghost) {
    display: inline-flex;
    align-items: center;
    gap: var(--pd-xs);
    min-width: 0;
    max-width: 100%;
    padding: var(--pd-2xs) var(--pd-sm);
    border-radius: inherit;
    color: inherit;
    font-weight: inherit;
  }

  .targets-tags :global(.target-tag-btn.button.xs.ghost:hover:not(:disabled)),
  .targets-tags :global(.target-tag-btn.button.xs.ghost:active:not(:disabled)) {
    background: transparent;
    color: inherit;
  }

  .target-icon {
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;

    :global(svg) {
      width: var(--icon-size-sm);
      height: var(--icon-size-sm);
    }
  }

  .target-param {
    min-width: 0;
    max-width: 10rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: var(--text-xs);
    line-height: 1;
  }
</style>
