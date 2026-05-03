<script lang="ts">
  /**
   * Editor overlay for editing a numeric parameter value (double-click value on canvas).
   * Uses the shared Input Svelte component.
   */
  import { tick } from 'svelte';
  import type { Action } from 'svelte/action';
  import { Input } from '../ui';

  interface Props {
    visible: boolean;
    x: number;
    y: number;
    width: number;
    height: number;
    value: number;
    paramType: 'int' | 'float';
    onCommit: (value: number) => void;
    onCancel: () => void;
  }

  let {
    visible,
    x,
    y,
    width,
    height,
    value,
    paramType,
    onCommit,
    onCancel,
  }: Props = $props();

  let inputValue = $state('');

  const syncParamOverlay: Action<
    HTMLDivElement,
    {
      visible: boolean;
      value: number;
      paramType: 'int' | 'float';
      setInput: (v: string) => void;
    }
  > = (_node, _p) => {
    let prevVis = false;
    return {
      update(np) {
        if (np.visible && !prevVis) {
          const displayValue =
            np.paramType === 'int' ? Math.round(np.value).toString() : Number(np.value).toFixed(3);
          np.setInput(displayValue);
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
    const num = parseFloat(inputValue);
    if (!Number.isNaN(num)) onCommit(num);
    else onCancel();
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
</script>

{#if visible}
  <div
    class="canvas-parameter-value-overlay"
    style="left: {x}px; top: {y}px; width: {width}px; height: {height}px;"
    role="dialog"
    aria-label="Edit parameter value"
    use:syncParamOverlay={{
      visible,
      value,
      paramType,
      setInput: (v) => {
        inputValue = v;
      },
    }}
  >
    <Input
      type="number"
      variant="primary"
      size="lg"
      value={inputValue}
      oninput={(e) => {
        inputValue = (e.currentTarget as HTMLInputElement).value;
      }}
      onblur={() => handleCommit()}
      onkeydown={handleKeydown}
      class="canvas-parameter-value-input"
    />
  </div>
{/if}

<style>
  .canvas-parameter-value-overlay {
    position: fixed;
    z-index: 1000;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .canvas-parameter-value-overlay :global(.input) {
    width: 100%;
    height: 100%;
    text-align: center;
  }
</style>
