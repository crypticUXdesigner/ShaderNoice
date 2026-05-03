<script lang="ts">
  /**
   * Editor overlay for editing node label (click node header name).
   * Uses the shared Input Svelte component. Backdrop click commits.
   */
  import { tick } from 'svelte';
  import type { Action } from 'svelte/action';
  import { Input } from '../ui';

  interface Props {
    visible: boolean;
    x: number;
    y: number;
    minWidth: number;
    label: string | undefined;
    onCommit: (label: string | undefined) => void;
    onCancel: () => void;
  }

  let {
    visible,
    x,
    y,
    minWidth,
    label,
    onCommit,
    onCancel,
  }: Props = $props();

  let inputValue = $state('');

  const syncLabelOverlay: Action<
    HTMLDivElement,
    { visible: boolean; label: string | undefined; setInput: (v: string) => void }
  > = (_node, _p) => {
    let prevVis = false;
    return {
      update(np) {
        if (np.visible && !prevVis) {
          np.setInput(np.label ?? '');
          tick().then(() => {
            const el = _node.querySelector('input');
            el?.focus();
            el?.select();
          });
        }
        prevVis = np.visible;
      },
    };
  };

  function handleCommit() {
    const trimmed = inputValue.trim() || undefined;
    onCommit(trimmed);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCommit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  }

  function handleBackdropClick() {
    handleCommit();
  }
</script>

{#if visible}
  <div
    class="canvas-label-edit-overlay-backdrop"
    role="presentation"
    onclick={handleBackdropClick}
    onkeydown={(e) => e.key === 'Escape' && onCancel()}
  ></div>
  <div
    class="canvas-label-edit-overlay"
    style="left: {x}px; top: {y}px; min-width: {minWidth}px;"
    role="dialog"
    aria-label="Edit node label"
    use:syncLabelOverlay={{
      visible,
      label,
      setInput: (v) => {
        inputValue = v;
      },
    }}
  >
    <Input
      type="text"
      variant="primary"
      size="lg"
      value={inputValue}
      oninput={(e) => {
        inputValue = (e.currentTarget as HTMLInputElement).value;
      }}
      onblur={() => handleCommit()}
      onkeydown={handleKeydown}
      class="canvas-label-edit-input"
    />
  </div>
{/if}

<style>
  .canvas-label-edit-overlay-backdrop {
    position: fixed;
    inset: 0;
    z-index: 999;
    background: var(--search-dialog-overlay);
  }

  .canvas-label-edit-overlay {
    position: fixed;
    z-index: 1000;
    transform: translate(-50%, -70%);
    box-sizing: border-box;
  }

  .canvas-label-edit-overlay :global(.input) {
    width: 100%;
  }
</style>
