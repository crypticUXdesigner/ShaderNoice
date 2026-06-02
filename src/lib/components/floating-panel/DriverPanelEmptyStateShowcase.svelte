<script lang="ts">
  /** Storybook: empty state with primary CTA snippet. */
  import DriverPanelEmptyState from './DriverPanelEmptyState.svelte';
  import { Button, IconSvg } from '../ui';
</script>

<DriverPanelEmptyState
  icon="waveform"
  driverKind="audio"
  title="No audio remaps yet"
  copy="Add a remap on a frequency band, then connect it to this parameter."
  secondaryHint="Optional: open the audio setup panel for spectrum analysis."
  spacious
>
  {#snippet primaryAction()}
    <Button variant="primary" size="md" mode="both" onclick={() => {}}>
      <IconSvg name="plus" variant="line" />
      New remap
    </Button>
  {/snippet}
</DriverPanelEmptyState>
