<script lang="ts">
  /**
   * Shared empty state for parameter driver panel tabs (audio / MIDI / animation).
   * Section order in preset cards: see DriverPresetCardShell.
   */
  import type { Snippet } from 'svelte';
  import { IconSvg } from '../ui';
  import type { IconName } from '../../../utils/iconsUiRegistry';
  import {
    parameterDriverKindClass,
    type ParameterDriverKind,
  } from '../../../utils/parameterDriverKindMeta';

  interface Props {
    icon: IconName;
    iconVariant?: 'line' | 'filled';
    /** Matches selected driver-kind tab accent (audio / MIDI / animation). */
    driverKind?: ParameterDriverKind;
    title: string;
    copy: string;
    primaryAction?: Snippet;
    secondaryHint?: string;
    /** e.g. overview panels that need a minimum height */
    spacious?: boolean;
    class?: string;
  }

  let {
    icon,
    iconVariant = 'line',
    driverKind,
    title,
    copy,
    primaryAction,
    secondaryHint,
    spacious = false,
    class: className = '',
  }: Props = $props();
</script>

<div
  class={[
    'driver-panel-empty-state',
    driverKind ? parameterDriverKindClass(driverKind) : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')}
  class:is-spacious={spacious}
>
  <div class="empty-icon">
    <IconSvg name={icon} variant={iconVariant} />
  </div>
  <p class="empty-title">{title}</p>
  <p class="empty-copy">{copy}</p>
  {#if primaryAction}
    <div class="empty-actions">
      {@render primaryAction()}
    </div>
  {/if}
  {#if secondaryHint}
    <p class="empty-hint">{secondaryHint}</p>
  {/if}
</div>

<style>
  .driver-panel-empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--pd-md);
    flex: 1;
    padding: var(--pd-xl);
    padding-bottom: 30%;
    text-align: center;
    color: var(--color-gray-100);

    &.is-spacious {
      min-height: 280px;
    }

    .empty-icon :global(svg) {
      width: var(--icon-size-lg);
      height: var(--icon-size-lg);
    }

    &.is-audio .empty-icon :global(svg) {
      color: var(--driver-kind-audio-accent-strong);
    }

    &.is-midi .empty-icon :global(svg) {
      color: var(--driver-kind-midi-accent-strong);
    }

    &.is-animation .empty-icon :global(svg) {
      color: var(--driver-kind-animation-accent-strong);
    }

    .empty-title {
      margin: 0;
      font-size: var(--text-md);
      font-weight: var(--font-weight-medium);
      color: var(--color-gray-120);
    }

    .empty-copy {
      margin: 0;
      max-width: 42ch;
      font-size: var(--text-sm);
      line-height: var(--line-height-relaxed);
    }

    .empty-actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--pd-sm);
      justify-content: center;
      margin-top: var(--pd-xs);
    }

    .empty-hint {
      margin: 0;
      max-width: 36ch;
      font-size: var(--text-xs);
      color: var(--color-gray-90);
      line-height: var(--line-height-relaxed);
    }
  }
</style>
