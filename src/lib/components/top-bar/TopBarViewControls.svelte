<script lang="ts">
  /**
   * Top bar center section: view mode (Node | Split | Full).
   */
  import { Button, ButtonGroup } from '../ui';
  import type { ViewMode } from '../editor/types';

  interface Props {
    viewMode: ViewMode;
    setViewMode: (mode: ViewMode) => void;
  }

  let { viewMode, setViewMode }: Props = $props();
</script>

<div class="top-bar-view-controls">
  <ButtonGroup class="top-bar-view-mode-group" role="group" ariaLabel="View mode">
    <Button
      variant="ghost"
      size="sm"
      class={viewMode === 'node' ? 'is-active' : ''}
      onclick={() => setViewMode('node')}
      title="Node (1) — Node editor with small shader preview"
    >
      <span class="view-label">Node</span>
      <span class="view-shortcut">1</span>
    </Button>
    <Button
      variant="ghost"
      size="sm"
      class={viewMode === 'split' ? 'is-active' : ''}
      onclick={() => setViewMode('split')}
      title="Split (2) — Node editor and shader preview side by side"
    >
      <span class="view-label">Split</span>
      <span class="view-shortcut">2</span>
    </Button>
    <Button
      variant="ghost"
      size="sm"
      class={viewMode === 'full' ? 'is-active' : ''}
      onclick={() => setViewMode('full')}
      title="Shader (3) — Shader fills viewport"
    >
      <span class="view-label">Shader</span>
      <span class="view-shortcut">3</span>
    </Button>
  </ButtonGroup>
</div>

<style>
  .top-bar-view-controls {
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: center;
    min-width: 0;
  }

  :global(.top-bar-view-mode-group) {
    display: inline-flex;
    align-items: stretch;
  }

  .view-shortcut {
    margin-left: 0.45em;
    font-family: var(--font-mono);
    font-size: var(--bottom-bar-tool-shortcut-font-size, 0.75rem);
    opacity: var(--bottom-bar-tool-shortcut-opacity, 0.7);
    line-height: 1;
  }
</style>
