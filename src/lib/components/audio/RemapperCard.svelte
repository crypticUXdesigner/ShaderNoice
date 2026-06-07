<script lang="ts">
  /**
   * RemapperCard - Single remap card in the audio signal picker.
   * Shows remap name (with band prefix), driver remap section, and Connect action.
   */
  import { Button, IconSvg, EditableLabel } from '../ui';
  import DriverRemapSection, {
    type DriverRemapSections,
  } from '../floating-panel/DriverRemapSection.svelte';
  import type { AudioRemapperEntry } from '../../../data-model/audioSetupTypes';

  interface LiveValues {
    incoming: number | null;
    outgoing: number | null;
  }

  interface Props {
    remapper: AudioRemapperEntry;
    bandName?: string;
    liveValues?: LiveValues | null;
    onConnect?: () => void;
    onDisconnect?: () => void;
    onDelete?: () => void;
    onDuplicate?: () => void;
    onRemapperChange?: (updater: (r: AudioRemapperEntry) => AudioRemapperEntry) => void;
    /** Per-target Out when `remapSections` includes the target block. */
    targetOutMin?: number;
    targetOutMax?: number;
    onTargetOutChange?: (patch: { outMin?: number; outMax?: number }) => void;
    paramMin?: number;
    paramMax?: number;
    paramStep?: number;
    paramType?: 'float' | 'int';
    controlsLayout?: 'default' | 'driver-focused';
    remapSections?: DriverRemapSections;
  }

  let {
    remapper,
    bandName = 'Band',
    liveValues = null,
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
    controlsLayout = 'default',
    remapSections,
  }: Props = $props();

  const effectiveSections = $derived(
    remapSections ?? (controlsLayout === 'driver-focused' ? 'gateOnly' : 'both')
  );

  function handleMatchParameter() {
    if (paramMin == null || paramMax == null) return;
    onTargetOutChange?.({ outMin: paramMin, outMax: paramMax });
  }
</script>

<div
  class="remapper-card panel-card"
  role="group"
  aria-label={`Remap: ${remapper.name || remapper.id}`}
>
  <div class="header">
    <div class="label-wrap" role="presentation" ondblclick={(e) => e.stopPropagation()}>
      <EditableLabel
        value={remapper.name}
        prefix={`${bandName}: `}
        placeholder="Remap name"
        ariaLabel="Remap name"
        onCommit={(value) => onRemapperChange?.((r) => ({ ...r, name: value }))}
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
          aria-label={`Connect: ${remapper.name || remapper.id}`}
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
          aria-label={`Duplicate remap: ${remapper.name || remapper.id}`}
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
          aria-label={`Delete remap: ${remapper.name || remapper.id}`}
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
      liveInValue={liveValues?.incoming ?? null}
      liveOutValue={liveValues?.outgoing ?? null}
      {paramMin}
      {paramMax}
      {paramStep}
      {paramType}
      {controlsLayout}
      sections={effectiveSections}
      matchParameterRange={
        effectiveSections !== 'gateOnly' && paramMin != null && paramMax != null
          ? handleMatchParameter
          : undefined
      }
      onChange={(payload) => {
        if (payload.inMin !== undefined || payload.inMax !== undefined) {
          onRemapperChange?.((r) => ({
            ...r,
            ...(payload.inMin !== undefined ? { inMin: payload.inMin } : {}),
            ...(payload.inMax !== undefined ? { inMax: payload.inMax } : {}),
          }));
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
  .remapper-card {
    /* Layout */
    flex-direction: column;
    width: 100%;
    box-sizing: border-box;
    padding-bottom: var(--pd-sm);

    /* Other */
    cursor: default;

    &:hover,
    &:active {
      border-color: var(--panel-card-border);
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

      :global(.power-audio-icon.is-dimmed svg) {
        color: var(--color-blue-110);
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
      width: 100%;
      padding: 0 var(--pd-sm);
    }
  }
</style>
