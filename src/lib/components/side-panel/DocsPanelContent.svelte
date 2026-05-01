<script lang="ts">
  /**
   * Content for the side panel "Docs" tab.
   * Lists all node docs and lets the user search + open HelpCallout.
   */
  import { onMount } from 'svelte';
  import type { NodeSpec } from '../../../types/nodeSpec';
  import type { HelpContent, HelpData } from '../../../utils/ContextualHelpManager';
  import { loadHelpData } from '../../../utils/ContextualHelpManager';
  import { SearchInput } from '../ui/input';
  import DocsPanelItem from './DocsPanelItem.svelte';

  interface Props {
    nodeSpecs?: NodeSpec[];
    onOpenNodeHelp?: (nodeType: string) => void;
  }

  let { nodeSpecs = [], onOpenNodeHelp }: Props = $props();

  let searchQuery = $state('');
  let selectedNodeType = $state<string | null>(null);
  let helpData = $state<HelpData | null>(null);

  onMount(() => {
    loadHelpData()
      .then((d) => {
        helpData = d;
      })
      .catch(() => {
        helpData = { helpItems: {}, categories: {} };
      });
  });

  type NodeDocEntry = {
    spec: NodeSpec;
    helpId: string;
    content: HelpContent | null;
  };

  const allEntries = $derived.by((): NodeDocEntry[] => {
    const items = helpData?.helpItems ?? {};
    const entries = nodeSpecs.map((spec) => {
      const helpId = `node:${spec.id}`;
      const content = (items[helpId] as HelpContent | undefined) ?? null;
      return { spec, helpId, content };
    });
    return entries.sort((a, b) => a.spec.displayName.localeCompare(b.spec.displayName));
  });

  function normalize(s: string): string {
    return s.toLowerCase().trim();
  }

  const filteredEntries = $derived.by((): NodeDocEntry[] => {
    const q = normalize(searchQuery);
    if (q === '') return allEntries;
    return allEntries.filter(({ spec, content }) => {
      if (normalize(spec.displayName).includes(q)) return true;
      if (normalize(spec.id).includes(q)) return true;
      if (normalize(spec.category).includes(q)) return true;
      if (spec.description && normalize(spec.description).includes(q)) return true;
      if (content?.tagline && normalize(content.tagline).includes(q)) return true;
      if (content?.description && normalize(content.description).includes(q)) return true;
      return false;
    });
  });

  $effect(() => {
    if (selectedNodeType != null) return;
    if (allEntries.length === 0) return;
    selectedNodeType = allEntries[0]!.spec.id;
  });

  function openHelp(nodeType: string) {
    selectedNodeType = nodeType;
    onOpenNodeHelp?.(nodeType);
  }
</script>

<div class="docs-panel-content">
  <div class="header">
    <div class="search">
      <SearchInput
        variant="primary"
        size="sm"
        placeholder="Search docs..."
        class="menu-input"
        ariaLabel="Search node documentation"
        bind:value={searchQuery}
        onEnter={() => {
          const first = filteredEntries[0];
          if (first) openHelp(first.spec.id);
        }}
      />
    </div>
    <div class="meta">
      <span class="count">{filteredEntries.length} nodes</span>
    </div>
  </div>

  <div class="body">
    <ul class="list" aria-label="Node documentation list">
      {#each filteredEntries as entry (entry.spec.id)}
        {@const isActive = entry.spec.id === selectedNodeType}
        <li>
          <DocsPanelItem
            spec={entry.spec}
            isActive={isActive}
            hasDocs={entry.content != null}
            onActivate={() => openHelp(entry.spec.id)}
          />
        </li>
      {/each}

      {#if filteredEntries.length === 0}
        <li class="empty" aria-live="polite">
          <div class="empty-title">No matches</div>
          <div class="empty-sub">Try a different search term.</div>
        </li>
      {/if}
    </ul>
  </div>
</div>

<style>
  .docs-panel-content {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  .header {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: var(--pd-sm);
    padding: var(--pd-md);
    border-bottom: 1px solid var(--divider);
  }

  .search {
    display: flex;
    align-items: center;
    gap: var(--pd-md);
    height: var(--size-md);
    flex-shrink: 0;
    padding: 0;
  }

  .meta {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--print-normal);
    font-size: var(--text-xs);
    padding: 0 var(--pd-md);
  }

  .body {
    flex: 1;
    min-height: 0;
    display: flex;
    padding: 0;
    overflow: hidden;
  }

  .list {
    --results-fade-height: 6px;
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: var(--pd-xs);
    overflow: auto;
    margin: 0;
    padding-left: 0;
    list-style: none;
    padding: var(--pd-md);
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

  .list::-webkit-scrollbar {
    display: none;
  }

  .list li {
    margin: 0;
  }

  .empty {
    margin-top: var(--pd-sm);
    padding: var(--pd-md);
    border-radius: var(--radius-md);
    background: var(--ghost-bg);
  }

  .empty-title {
    font-weight: 700;
    color: var(--print-highlight);
    font-size: var(--text-sm);
  }

  .empty-sub {
    margin-top: var(--pd-2xs);
    color: var(--print-subtle);
    font-size: var(--text-sm);
  }

</style>
