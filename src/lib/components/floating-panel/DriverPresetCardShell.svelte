<script lang="ts">
  /**
   * Shared preset card chrome for parameter driver panel assets (remappers, MIDI envelopes).
   * Section order: header → editor → sources (optional) → targets (optional).
   */
  import type { Snippet } from 'svelte';

  interface Props {
    selected?: boolean;
    /** Focused driver body: no inset panel-card chrome */
    embedded?: boolean;
    /** Listbox option semantics when the card is selectable in overview nav */
    selectable?: boolean;
    ariaLabel?: string;
    headerTitle?: Snippet;
    headerActions?: Snippet;
    editor: Snippet;
    sources?: Snippet;
    targets?: Snippet;
    onclick?: (e: MouseEvent) => void;
    onkeydown?: (e: KeyboardEvent) => void;
    class?: string;
  }

  let {
    selected = false,
    embedded = false,
    selectable = false,
    ariaLabel = 'Driver preset',
    headerTitle,
    headerActions,
    editor,
    sources,
    targets,
    onclick,
    onkeydown,
    class: className = '',
  }: Props = $props();

  const hasHeader = $derived(Boolean(headerTitle) || Boolean(headerActions));
</script>

<div
  class={['driver-preset-card-shell', className].filter(Boolean).join(' ')}
  class:panel-card={!embedded}
  class:is-embedded={embedded}
  class:selected
  role={selectable ? 'option' : undefined}
  aria-selected={selectable ? selected : undefined}
  tabindex={selectable ? 0 : undefined}
  aria-label={selectable ? ariaLabel : undefined}
  {onclick}
  {onkeydown}
>
  {#if hasHeader}
    <div class="header">
      {#if headerTitle}
        <div class="label-wrap" role="presentation" ondblclick={(e) => e.stopPropagation()}>
          {@render headerTitle()}
        </div>
      {/if}
      {#if headerActions}
        <div class="header-actions" role="presentation" ondblclick={(e) => e.stopPropagation()}>
          {@render headerActions()}
        </div>
      {/if}
    </div>
  {/if}

  <div class="editor-wrap">
    {@render editor()}
  </div>

  {#if sources}
    <div class="sources-section">
      {@render sources()}
    </div>
  {/if}

  {#if targets}
    <div class="targets-section">
      {@render targets()}
    </div>
  {/if}
</div>

<style>
  .driver-preset-card-shell {
    display: flex;
    flex-direction: column;
    width: 100%;
    box-sizing: border-box;
    padding-bottom: var(--pd-sm);
    cursor: default;

    &.is-embedded {
      padding-bottom: 0;
      background: transparent;
      border: none;
      border-radius: 0;

      .header {
        padding: var(--pd-sm) var(--pd-md) 0;
      }

      .editor-wrap {
        padding: var(--pd-sm) var(--pd-md) 0;
      }

      &:has(.header) .editor-wrap {
        padding-top: 0;
      }

      .sources-section,
      .targets-section {
        padding: var(--pd-md) var(--pd-md) var(--pd-sm);
      }
    }

    .header {
      display: flex;
      align-items: center;
      gap: var(--pd-sm);
      width: 100%;
      min-height: var(--size-md);
      padding: 0 var(--pd-sm);

      :global(.button) {
        border-radius: calc(var(--radius-md) - var(--pd-sm));
      }
    }

    .label-wrap {
      display: flex;
      align-items: center;
      flex: 1;
      min-width: 0;
      gap: var(--pd-sm);
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: var(--pd-xs);
      flex-shrink: 0;
    }

    .editor-wrap {
      display: flex;
      flex-direction: column;
      width: 100%;
      padding: 0 var(--pd-sm);
    }

    .sources-section {
      padding: var(--pd-md) var(--pd-sm) 0;
      border-top: 1px solid var(--color-gray-70);
      margin-top: var(--pd-md);
    }

    .targets-section {
      padding: 0 var(--pd-sm) var(--pd-sm);
    }
  }
</style>
