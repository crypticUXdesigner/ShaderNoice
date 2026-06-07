<script lang="ts">
  /**
   * One section of the help callout: inputs or outputs list with optional suggestions.
   * Used by HelpCalloutContent for both Inputs and Outputs.
   */
  import { Tag } from '../ui';
  import { resolveRelatedItems } from '../../../utils/ContextualHelpManager';
  import type { HelpPort } from '../../../utils/ContextualHelpManager';
  import type { NodeSpec } from '../../../types/nodeSpec';
  import { getPortTypeDisplayLabel } from '../../../ui/editor';
  import GuideNodeChip from './GuideNodeChip.svelte';

  const SUGGESTION_CHIP_LIMIT = 5;

  /** Port may include hideLabel when output label is redundant (e.g. single-output input nodes). */
  interface Props {
    ports: (HelpPort & { hideLabel?: boolean })[];
    nodeSpecs: Map<string, NodeSpec>;
    getSuggestions: (port: HelpPort) => string[] | undefined;
    /** Opens the guide for another node type (suggested node chips). */
    onOpenNodeHelp?: (nodeType: string) => void;
  }

  let { ports, nodeSpecs, getSuggestions, onOpenNodeHelp }: Props = $props();

  let suggestionsExpanded = $state<Record<string, boolean>>({});

  function toggleSuggestions(portName: string) {
    suggestionsExpanded = {
      ...suggestionsExpanded,
      [portName]: !suggestionsExpanded[portName],
    };
  }
</script>

<div class="ports">
  <div class="list">
    {#each ports as port}
      {@const resolved = resolveRelatedItems(getSuggestions(port) ?? [], nodeSpecs)}
      {@const showAll = suggestionsExpanded[port.name] ?? false}
      {@const visibleNodes = showAll
        ? resolved.nodes
        : resolved.nodes.slice(0, SUGGESTION_CHIP_LIMIT)}
      {@const hiddenCount = resolved.nodes.length - visibleNodes.length}
      <div class="item">
        <div class="left">
          {#if !port.hideLabel}
            <span class="name">{port.label ?? port.name}</span>
          {/if}
          <Tag size="xs" type={port.type}>{getPortTypeDisplayLabel(port.type)}</Tag>
        </div>
        <div class="right">
          <div class="description">{port.description}</div>
          {#if resolved.nodes.length > 0}
            <div class="suggestions">
              <span class="suggestions-label">Suggested</span>
              <div class="items">
                {#each visibleNodes as nodeSpec (nodeSpec.id)}
                  <GuideNodeChip {nodeSpec} onOpen={onOpenNodeHelp} />
                {/each}
                {#if hiddenCount > 0}
                  <button
                    type="button"
                    class="show-more"
                    onclick={() => toggleSuggestions(port.name)}
                  >
                    +{hiddenCount} more
                  </button>
                {:else if showAll && resolved.nodes.length > SUGGESTION_CHIP_LIMIT}
                  <button
                    type="button"
                    class="show-more"
                    onclick={() => toggleSuggestions(port.name)}
                  >
                    Show less
                  </button>
                {/if}
              </div>
            </div>
          {/if}
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  .ports {
    display: flex;
    flex-direction: column;
    gap: var(--pd-md);

    .list {
      display: flex;
      flex-direction: column;
      gap: var(--pd-md);
    }

    .item {
      display: flex;
      flex-direction: row;
      align-items: flex-start;
      gap: var(--pd-md);
    }

    .left {
      flex-shrink: 0;
      width: 120px;
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: var(--pd-md);

      .name {
        font-weight: 600;
        font-family: var(--font-mono);
        font-size: var(--text-xs);
        color: var(--print-highlight);
      }
    }

    .right {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: var(--pd-sm);

      .description {
        font-size: var(--text-sm);
        line-height: 1.5;
        color: var(--print-highlight);
      }

      .suggestions {
        display: flex;
        flex-direction: column;
        gap: var(--pd-xs);
      }

      .suggestions-label {
        font-size: var(--text-2xs);
        font-weight: 600;
        color: var(--print-normal);
        text-transform: uppercase;
        letter-spacing: 0.03em;
      }

      .items {
        display: flex;
        flex-wrap: wrap;
        gap: var(--pd-xs);
        align-items: center;
      }

      .show-more {
        padding: var(--pd-xs) var(--pd-sm);
        border: none;
        border-radius: var(--radius-sm);
        background: transparent;
        color: var(--print-normal);
        font: inherit;
        font-size: var(--text-xs);
        cursor: default;
        outline: none;
      }

      .show-more:hover,
      .show-more:focus-visible {
        color: var(--print-highlight);
        background: var(--ghost-bg);
      }

      .show-more:focus-visible {
        box-shadow: 0 0 0 2px var(--color-blue-100);
      }
    }
  }
</style>
