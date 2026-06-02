<script lang="ts">
  /** Storybook: default, selected, connected, and embedded card chrome. */
  import DriverPresetCardShell from './DriverPresetCardShell.svelte';
  import { Button, IconSvg } from '../ui';
</script>

<div class="showcase">
  <DriverPresetCardShell ariaLabel="Default preset card">
    {#snippet headerTitle()}
      <span class="demo-title">Band A: Glow</span>
    {/snippet}
    {#snippet headerActions()}
      <Button variant="ghost" size="sm" mode="icon-only" title="Delete" aria-label="Delete preset">
        <IconSvg name="trash" variant="line" />
      </Button>
    {/snippet}
    {#snippet editor()}
      <div class="demo-editor" role="img" aria-label="Editor placeholder">Editor</div>
    {/snippet}
    {#snippet targets()}
      <p class="demo-section-label">Targets</p>
      <p class="demo-target">Color · Amount</p>
    {/snippet}
  </DriverPresetCardShell>

  <DriverPresetCardShell selected ariaLabel="Selected preset card">
    {#snippet headerTitle()}
      <span class="demo-title">Band B: Pulse</span>
    {/snippet}
    {#snippet headerActions()}
      <Button variant="primary" size="sm" mode="both" title="Connect" aria-label="Connect preset">
        <IconSvg name="plug" variant="line" />
        Connect
      </Button>
    {/snippet}
    {#snippet editor()}
      <div class="demo-editor" role="img" aria-label="Editor placeholder">Editor</div>
    {/snippet}
  </DriverPresetCardShell>

  <DriverPresetCardShell connected ariaLabel="Connected preset card">
    {#snippet headerTitle()}
      <span class="demo-title">Envelope: Lead</span>
    {/snippet}
    {#snippet headerActions()}
      <Button variant="warning" size="sm" mode="both" title="Disconnect" aria-label="Disconnect preset">
        <IconSvg name="circle-x" variant="filled" />
        Disconnect
      </Button>
    {/snippet}
    {#snippet editor()}
      <div class="demo-editor" role="img" aria-label="Editor placeholder">Editor</div>
    {/snippet}
    {#snippet targets()}
      <p class="demo-section-label">Targets</p>
      <p class="demo-target">Bloom · Intensity</p>
    {/snippet}
  </DriverPresetCardShell>

  <DriverPresetCardShell embedded ariaLabel="Embedded preset body">
    {#snippet editor()}
      <div class="demo-editor" role="img" aria-label="Editor placeholder">Focused editor</div>
    {/snippet}
  </DriverPresetCardShell>
</div>

<style>
  .showcase {
    display: flex;
    flex-direction: column;
    gap: var(--pd-md);
    width: min(100%, 420px);
    padding: var(--pd-md);
  }

  .demo-title {
    font-size: var(--text-sm);
    font-weight: var(--font-weight-medium);
    color: var(--color-gray-120);
  }

  .demo-editor {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 72px;
    border-radius: var(--radius-sm);
    background: var(--color-gray-50);
    color: var(--color-gray-100);
    font-size: var(--text-xs);
  }

  .demo-section-label {
    margin: 0 0 var(--pd-xs);
    font-size: var(--text-sm);
    font-weight: var(--font-weight-medium);
    color: var(--color-gray-110);
  }

  .demo-target {
    margin: 0;
    font-size: var(--text-xs);
    color: var(--color-gray-100);
  }
</style>
