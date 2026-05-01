<script lang="ts">
  import { type Readable } from 'svelte/store';
  import { Button, Message } from '../ui';

  interface Props {
    progress: Readable<{ current: number; total: number }>;
    onCancel?: () => void;
  }

  let { progress, onCancel }: Props = $props();

  let progressValue = $state({ current: 0, total: 0 });
  $effect(() => {
    const unsub = progress.subscribe((v) => {
      progressValue = v;
    });
    return unsub;
  });
</script>

<div class="overlay">
  <div class="modal frame">
    <div class="title">Exporting video…</div>
    <div class="text">Frame {progressValue.current} / {progressValue.total}</div>
    {#snippet importantHeading()}Keep this tab focused{/snippet}
    <Message inline variant="info" heading={importantHeading}>
      Keep this browser tab in focus. If you switch tabs or minimize the window, export can become very slow and audio may go out of sync.
    </Message>
    <div class="actions">
      <Button variant="secondary" size="md" onclick={onCancel}>Cancel</Button>
    </div>
  </div>
</div>

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: var(--search-dialog-overlay, rgba(0, 0, 0, 0.5));
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10001;

    .modal {
      display: flex;
      flex-direction: column;
      gap: var(--pd-lg);
      width: min(90vw, 600px);
      min-width: min(320px, 90vw);
      /* Box model / visual from layer .frame */

      .title {
        font-size: var(--text-lg);
        font-weight: 600;
        color: var(--color-gray-95);
      }

      .text {
        font-size: var(--text-md);
        color: var(--color-gray-80);
      }

      .actions {
        align-self: flex-end;
      }
    }
  }
</style>
