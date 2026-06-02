<script lang="ts">
  /**
   * Scrollable results area: no-results message or grouped node sections.
   * Used only inside NodePanelContent. Exposes resultsEl for scroll-into-view.
   */
  import { NodeIconSvg } from '../ui';
  import { getCategoryDefaultIcon } from '../../../utils/nodeSpecUtils';
  import { getCategorySlug } from '../../../utils/cssTokens';
  import type { NodeSpec } from '../../../types/nodeSpec';
  import NodePanelSection from './NodePanelSection.svelte';
  import NodePanelItem from './NodePanelItem.svelte';

  type DisplayMode = 'list' | 'grid';

  interface Group {
    category: string;
    nodes: NodeSpec[];
  }

  interface SubgroupCount {
    subgroupSlug: string;
    count: number;
  }

  export type Props = {
    resultsEl?: HTMLDivElement;
    groupedSpecs?: Group[];
    expandedCategories?: Set<string>;
    categoryCounts?: Map<string, number>;
    categorySubgroupCounts?: Map<string, SubgroupCount[]>;
    displayMode?: DisplayMode;
    onToggleCategoryExpand?: (category: string) => void;
    onDragStart?: (e: DragEvent, nodeType: string) => void;
    onDragEnd?: (e: DragEvent) => void;
    /** Optional "click to add" handler (e.g. add at canvas center). */
    addNode?: (nodeType: string) => void;
    [key: string]: unknown;
  };

  let {
    resultsEl = $bindable<HTMLDivElement | undefined>(undefined),
    groupedSpecs = [],
    expandedCategories = new Set(),
    categoryCounts = new Map(),
    categorySubgroupCounts = new Map(),
    displayMode = 'grid',
    onToggleCategoryExpand,
    onDragStart,
    onDragEnd,
    addNode,
  }: Props = $props();

  function isDividerStartCategory(category: string): boolean {
    return category === 'Inputs' || category === 'Blend' || category === 'Math';
  }
</script>

<div
  bind:this={resultsEl}
  class="results"
  class:is-list={displayMode === 'list'}
  class:is-grid={displayMode === 'grid'}
  role="region"
  aria-label="Node list"
>
  {#if groupedSpecs.length === 0}
    <div class="no-results">No nodes found</div>
  {:else}
    {#each groupedSpecs as group, index}
      {@const isExpanded = expandedCategories.has(group.category)}
      {@const totalCount = categoryCounts.get(group.category) ?? 0}
      {@const subgroupCounts = categorySubgroupCounts.get(group.category)}
      {@const startsDividerGroup =
        isDividerStartCategory(group.category) &&
        (index === 0 || groupedSpecs[index - 1]?.category !== group.category)}
      <div
        data-section-category={group.category}
        data-category={getCategorySlug(group.category)}
        class:divider-start={startsDividerGroup}
      >
        <NodePanelSection
          title={group.category}
          count={subgroupCounts?.length ? undefined : totalCount}
          subgroupCounts={subgroupCounts}
          expanded={isExpanded}
          onToggle={() => onToggleCategoryExpand?.(group.category)}
        >
          {#snippet headerIcon()}
            <NodeIconSvg identifier={getCategoryDefaultIcon(group.category)} />
          {/snippet}
          {#snippet children()}
            {#each group.nodes as spec (spec.id)}
              <NodePanelItem
                spec={spec}
                displayMode={displayMode}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                addNode={addNode}
              />
            {/each}
          {/snippet}
        </NodePanelSection>
      </div>
    {/each}
  {/if}
</div>

<style>
  .results {
    --results-fade-height: 6px;
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    gap: 0;
    scrollbar-width: none;
    -ms-overflow-style: none;
    mask-image: linear-gradient(
      to bottom,
      transparent 0%,
      black var(--results-fade-height)
    );
    -webkit-mask-image: linear-gradient(
      to bottom,
      transparent 0%,
      black var(--results-fade-height)
    );
  }

  .results::-webkit-scrollbar {
    display: none;
  }

  .divider-start {
    position: relative;
    margin-top: var(--pd-sm);
    padding-top: var(--pd-sm);
  }

  .divider-start::before {
    content: '';
    position: absolute;
    top: 0;
    left: var(--pd-sm);
    right: var(--pd-sm);
    border-top: 1px solid var(--color-gray-70);
    pointer-events: none;
  }

  /* List mode: section content is a flex column of items */
  .results.is-list :global(.panel-section .panel-section-content) {
    display: flex;
    flex-direction: column;
    gap: var(--pd-xs);
  }

  /* Grid mode: section content is a grid */
  .results.is-grid :global(.panel-section .panel-section-content) {
    display: grid !important;
    grid-template-columns: repeat(3, 1fr);
    grid-auto-rows: min-content;
    gap: var(--pd-md);
  }

  .no-results {
    padding: var(--pd-lg);
    text-align: center;
    font-size: var(--text-sm);
    color: var(--color-gray-80);
  }
</style>
