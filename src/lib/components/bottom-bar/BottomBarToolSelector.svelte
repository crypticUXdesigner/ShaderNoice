<script lang="ts">
  /**
   * BottomBarToolSelector - Canvas tool buttons (Cursor, Hand, Select, Add, Patch) for the bottom bar.
   */
  import { Button, ButtonGroup, IconSvg } from '../ui';
  import { graphStore } from '../../stores';
  import type { ToolType } from '../../stores';
  import { altOptionKeycapLabel } from '../../../utils/platformKeys';

  interface ToolDef {
    id: ToolType;
    icon: 'mouse-pointer' | 'hand' | 'lasso' | 'plus-square' | 'plug';
    shortcut: string;
    label: string;
  }

  interface Props {
    /** Currently effective tool (e.g. hand when spacebar held). */
    effectiveTool: ToolType;
    onToolChange?: (tool: ToolType) => void;
  }

  let { effectiveTool, onToolChange }: Props = $props();

  const tools: ToolDef[] = [
    { id: 'cursor', icon: 'mouse-pointer', shortcut: 'V', label: 'Cursor' },
    { id: 'hand', icon: 'hand', shortcut: 'H', label: 'Hand' },
    { id: 'select', icon: 'lasso', shortcut: 'S', label: 'Select' },
    { id: 'add', icon: 'plus-square', shortcut: 'A', label: 'Add' },
    { id: 'patch', icon: 'plug', shortcut: 'P', label: 'Patch' },
  ];

  function handleToolClick(tool: ToolType) {
    graphStore.setActiveTool(tool);
    onToolChange?.(tool);
  }
</script>

<div class="tool-selector-wrapper">
  <ButtonGroup class="tool-selector">
    {#each tools as tool}
      <Button
        variant="ghost"
        size="sm"
        mode="both"
        class={effectiveTool === tool.id ? 'is-active' : ''}
        aria-pressed={effectiveTool === tool.id}
        title={tool.id === 'add'
          ? `${tool.label}: ${altOptionKeycapLabel()}+click empty canvas with Cursor, or A to select Add tool`
          : `${tool.label} (${tool.shortcut})`}
        data-tool={tool.id}
        onclick={() => handleToolClick(tool.id)}
      >
        <IconSvg name={tool.icon} />
        {#if tool.id === 'add'}
          <span class="tool-keys-add">
            <kbd class="mod-key" title={`${altOptionKeycapLabel()} + click (when Cursor is active)`}
              >{altOptionKeycapLabel()}</kbd
            >
            <kbd class="letter-key" title="Select Add tool">A</kbd>
          </span>
        {:else}
          <span>{tool.shortcut}</span>
        {/if}
      </Button>
    {/each}
  </ButtonGroup>
</div>

<style>
  .tool-keys-add {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    font-family: var(--font-mono, ui-monospace, monospace);
    font-size: var(--text-2xs);
    line-height: 1.2;
    letter-spacing: 0.02em;
  }

  .mod-key {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1.25rem;
    padding: 1px 4px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-gray-70);
    background: var(--color-gray-40);
    color: var(--print-muted);
    font-size: inherit;
    font-weight: 500;
  }

  .letter-key {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1rem;
    padding: 1px 5px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-gray-80);
    background: var(--color-gray-50);
    color: var(--print-normal);
    font-size: inherit;
  }

  :global(.tool-selector .is-active) .mod-key,
  :global(.tool-selector .is-active) .letter-key {
    border-color: var(--color-gray-90);
  }
</style>
