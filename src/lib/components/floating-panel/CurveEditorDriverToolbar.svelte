<script lang="ts">
  import { Button, DropdownMenu, MenuItem } from '../ui';
  import type {
    AutomationCurve,
    AutomationCurveInterpolation,
  } from '../../../data-model/types';

  const INTERP_OPTIONS: ReadonlyArray<{
    value: AutomationCurveInterpolation;
    label: string;
  }> = [
    { value: 'bezier', label: 'Bezier' },
    { value: 'linear', label: 'Linear' },
    { value: 'stepped', label: 'Stepped' },
  ];

  interface Props {
    curve: AutomationCurve;
    onCurveChange: (curve: AutomationCurve) => void;
    compactAdvancedOpen?: boolean;
    class?: string;
  }

  let {
    curve,
    onCurveChange,
    compactAdvancedOpen = $bindable(false),
    class: className = '',
  }: Props = $props();

  let interpMenuOpen = $state(false);
  let interpButtonEl = $state<HTMLDivElement | null>(null);

  const interpLabel = $derived.by(() => {
    const interp = curve.interpolation ?? 'bezier';
    return INTERP_OPTIONS.find((o) => o.value === interp)?.label ?? 'Bezier';
  });
</script>

<div class="curve-editor-driver-toolbar {className}">
  <div class="interp-anchor" bind:this={interpButtonEl}>
    <Button
      variant="ghost"
      size="sm"
      class="interp-button"
      title="Interpolation"
      aria-haspopup="listbox"
      aria-expanded={interpMenuOpen}
      onclick={() => (interpMenuOpen = !interpMenuOpen)}
    >
      <span class="interp-label">{interpLabel}</span>
    </Button>
    <DropdownMenu
      open={interpMenuOpen}
      anchor={interpButtonEl}
      openAbove={true}
      onClose={() => (interpMenuOpen = false)}
    >
      {#snippet children()}
        {#each INTERP_OPTIONS as option (option.value)}
          <MenuItem
            label={option.label}
            selected={(curve.interpolation ?? 'bezier') === option.value}
            onclick={() => {
              onCurveChange({ ...curve, interpolation: option.value });
              interpMenuOpen = false;
            }}
          />
        {/each}
      {/snippet}
    </DropdownMenu>
  </div>
  <Button
    variant="ghost"
    size="sm"
    class="compact-advanced-toggle"
    title={compactAdvancedOpen ? 'Hide advanced curve tools' : 'Show snap grid and bulk keyframe tools'}
    aria-expanded={compactAdvancedOpen}
    onclick={() => (compactAdvancedOpen = !compactAdvancedOpen)}
  >
    {compactAdvancedOpen ? 'Less' : 'Advanced'}
  </Button>
</div>

<style>
  .curve-editor-driver-toolbar {
    display: flex;
    align-items: center;
    gap: var(--pd-2xs);
    min-width: 0;
    margin-left: auto;
  }

  .interp-anchor {
    position: relative;
    flex-shrink: 0;
  }

  .interp-label {
    font-size: var(--text-xs);
    line-height: 1;
  }
</style>
