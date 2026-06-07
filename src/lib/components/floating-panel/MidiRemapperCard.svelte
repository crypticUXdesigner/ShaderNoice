<script lang="ts">
  /**
   * MIDI remap card — shared driver remap UI + Connect; parallels RemapperCard.
   */
  import { Button, IconSvg, EditableLabel } from '../ui';
  import DriverRemapSection, {
    type DriverRemapSections,
  } from './DriverRemapSection.svelte';
  import type { MidiEnvelopeRemapper } from '../../../data-model/midiEnvelopeTypes';

  interface Props {
    remapper: MidiEnvelopeRemapper;
    envelopePresetName?: string;
    onConnect?: () => void;
    onDisconnect?: () => void;
    onDelete?: () => void;
    onDuplicate?: () => void;
    onRemapperChange?: (
      patch: Partial<Pick<MidiEnvelopeRemapper, 'name' | 'inMin' | 'inMax'>>
    ) => void;
    targetOutMin?: number;
    targetOutMax?: number;
    onTargetOutChange?: (patch: { outMin?: number; outMax?: number }) => void;
    paramMin?: number;
    paramMax?: number;
    paramStep?: number;
    paramType?: 'float' | 'int';
    liveInValue?: number | null;
    liveOutValue?: number | null;
    /** Focused compact driver: borderless, fits parent width. */
    embedded?: boolean;
    remapSections?: DriverRemapSections;
  }

  let {
    remapper,
    envelopePresetName = 'Track set',
    onConnect,
    onDisconnect,
    onDelete,
    onDuplicate,
    onRemapperChange,
    targetOutMin = 0,
    targetOutMax = 1,
    onTargetOutChange,
    paramMin,
    paramMax,
    paramStep,
    paramType,
    liveInValue,
    liveOutValue,
    embedded = false,
    remapSections,
  }: Props = $props();

  const displayName = $derived(remapper.name?.trim() || 'Remap');

  const effectiveSections = $derived(
    remapSections ?? (embedded ? 'gateOnly' : 'both')
  );

  function handleMatchParameter() {
    if (paramMin == null || paramMax == null) return;
    onTargetOutChange?.({ outMin: paramMin, outMax: paramMax });
  }
</script>

<div
  class="midi-remapper-card panel-card"
  class:is-embedded={embedded}
  role="group"
  aria-label={`Remap: ${displayName}`}
>
  <div class="header">
    <div class="label-wrap" role="presentation" ondblclick={(e) => e.stopPropagation()}>
      <EditableLabel
        value={remapper.name ?? ''}
        prefix={`${envelopePresetName}: `}
        placeholder="Remap"
        ariaLabel="Remap name"
        onCommit={(value) => onRemapperChange?.({ name: value })}
      />
    </div>
    <div class="header-actions" role="presentation" ondblclick={(e) => e.stopPropagation()}>
      {#if onDisconnect}
        <Button
          variant="warning"
          size="sm"
          mode="both"
          title="Disconnect from parameter"
          aria-label="Disconnect from parameter"
          onclick={(e) => {
            e.stopPropagation();
            onDisconnect();
          }}
        >
          <IconSvg name="prohibit" variant="line" />
          Disconnect
        </Button>
      {:else if onConnect}
        <Button
          variant="primary"
          size="sm"
          mode="both"
          title="Connect"
          aria-label={`Connect: ${displayName}`}
          onclick={(e) => {
            e.stopPropagation();
            onConnect?.();
          }}
        >
          <IconSvg name="plug" variant="line" />
          Connect
        </Button>
      {/if}
      {#if onDuplicate}
        <Button
          variant="ghost"
          size="sm"
          mode="icon-only"
          title="Duplicate remap"
          aria-label={`Duplicate remap: ${displayName}`}
          onclick={(e) => {
            e.stopPropagation();
            onDuplicate();
          }}
        >
          <IconSvg name="copy" variant="line" />
        </Button>
      {/if}
      {#if onDelete}
        <Button
          variant="ghost"
          size="sm"
          mode="icon-only"
          title="Delete remap"
          aria-label={`Delete remap: ${displayName}`}
          onclick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <IconSvg name="trash" variant="line" />
        </Button>
      {/if}
    </div>
  </div>
  <div class="editor-wrap">
    <DriverRemapSection
      inMin={remapper.inMin}
      inMax={remapper.inMax}
      outMin={targetOutMin}
      outMax={targetOutMax}
      {liveInValue}
      {liveOutValue}
      {paramMin}
      {paramMax}
      {paramStep}
      {paramType}
      controlsLayout={embedded ? 'driver-focused' : 'default'}
      sections={effectiveSections}
      matchParameterRange={
        effectiveSections !== 'gateOnly' && paramMin != null && paramMax != null
          ? handleMatchParameter
          : undefined
      }
      onChange={(payload) => {
        if (payload.inMin !== undefined || payload.inMax !== undefined) {
          onRemapperChange?.({
            ...(payload.inMin !== undefined ? { inMin: payload.inMin } : {}),
            ...(payload.inMax !== undefined ? { inMax: payload.inMax } : {}),
          });
        }
        if (payload.outMin !== undefined || payload.outMax !== undefined) {
          onTargetOutChange?.({
            ...(payload.outMin !== undefined ? { outMin: payload.outMin } : {}),
            ...(payload.outMax !== undefined ? { outMax: payload.outMax } : {}),
          });
        }
      }}
    />
  </div>
</div>

<style>
  .midi-remapper-card {
    display: flex;
    flex-direction: column;
    width: 100%;
    max-width: 100%;
    min-width: 0;
    box-sizing: border-box;
    padding-bottom: var(--pd-sm);
    cursor: default;

    &:hover,
    &:active {
      border-color: var(--panel-card-border);
    }

    &.is-embedded {
      margin: 0;
    }

    .header {
      display: flex;
      align-items: center;
      gap: var(--pd-sm);
      width: 100%;
      height: var(--size-md);
      min-height: 0;
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
      gap: var(--pd-sm);
      width: 100%;
      padding: 0 var(--pd-sm) var(--pd-xs);
    }
  }
</style>
